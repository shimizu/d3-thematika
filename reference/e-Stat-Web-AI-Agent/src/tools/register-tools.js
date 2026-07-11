import { ToolRegistry } from "../agent/tool-registry.js";
import { runAnalysisCode } from "../analysis/analysis-runner.js";
import { runAnalysis, SUPPORTED_OPERATIONS } from "../analysis/index.js";
import {
  fetchStatsData,
  getStatsMetadata,
  searchStatsTables,
} from "./estat-client.js";

// LLMへ返すサンプル行数。全レコードはDataset Storeに保持し、ヘッダ(columns)と
// この件数のサンプルだけをトークン化して送ることでコンテキストの無駄を避ける。
const LLM_SAMPLE_ROWS = 5;

// analyze_datasetがLLMへ返す結果行の上限。全行はAnalysis Result Storeに保持し、
// 会話履歴にはこの件数までしか載せない（TOOL_RESULT_CHAR_CAPと併せた多重防御）。
const LLM_RESULT_ROWS = 50;

const SEARCH_STATS_TABLES = {
  name: "search_stats_tables",
  description:
    "e-Statの統計表をキーワード、政府統計コード、調査年月で検索します。分析対象のstatsDataIdを特定する最初の段階で使用してください。",
  input_schema: {
    type: "object",
    properties: {
      searchWord: { type: "string", description: "統計表の検索キーワード" },
      statsCode: { type: "string", description: "政府統計コード" },
      surveyYears: {
        type: "string",
        description:
          "調査年月。e-Stat公式形式はyyyy、yyyymm、yyyymm-yyyymm。利便性のためyyyy-yyyyも受け付け、yyyy01-yyyy12へ正規化します。",
        pattern: "^\\d{4}(-\\d{4})?$|^\\d{6}(-\\d{6})?$",
      },
      limit: { type: "integer", minimum: 1, maximum: 100 },
      startPosition: {
        type: "integer",
        minimum: 1,
        description:
          "前回の検索結果で返されたnextKey。最初の検索では指定しない",
      },
    },
  },
};

const GET_STATS_METADATA = {
  name: "get_stats_metadata",
  description:
    "指定した統計表の次元、分類コード、地域コード、時間コード、単位を取得します。データ取得前に必ず実行し、コードを推測せず確認してください。",
  input_schema: {
    type: "object",
    properties: {
      statsDataId: { type: "string" },
      query: {
        type: "string",
        description: "コードまたは名称を絞り込む検索文字列",
      },
      limitPerDimension: {
        type: "integer",
        minimum: 1,
        maximum: 100,
      },
    },
    required: ["statsDataId"],
  },
};

const FETCH_STATS_DATA = {
  name: "fetch_stats_data",
  description:
    "確認済みの分類コードを使ってe-Statの統計データを取得し、ブラウザ内のDataset Storeへ保存します。返却されるdatasetIdを後続の分析に使用してください。",
  input_schema: {
    type: "object",
    properties: {
      statsDataId: { type: "string" },
      filters: {
        type: "object",
        description:
          "e-Stat APIの絞り込み条件。cdCat01、cdArea、cdTimeFrom、lvCat01など。cd系は単一コードまたはカンマ区切り最大100個、lv/cd/From/Toを同一事項で併用するとAND条件になります。",
        additionalProperties: {
          oneOf: [{ type: "string" }, { type: "number" }],
        },
      },
      maxRecords: {
        type: "integer",
        minimum: 1,
        maximum: 500000,
      },
    },
    required: ["statsDataId", "filters"],
  },
};

const INSPECT_DATASET = {
  name: "inspect_dataset",
  description:
    "Dataset Storeに保存されたデータの列、件数、サンプル、指定列のdistinct値を確認します。大量の生データを取得せず、分析前の構造確認に使用してください。",
  input_schema: {
    type: "object",
    properties: {
      datasetId: { type: "string" },
      sampleSize: { type: "integer", minimum: 0, maximum: 20 },
      distinctColumn: { type: "string" },
    },
    required: ["datasetId"],
  },
};

const ANALYZE_DATASET = {
  name: "analyze_dataset",
  description:
    "Dataset Storeに保存した全レコードを対象に決定論的な集計を行います。合計・平均・group-by・ランキング・前年比・distinct・単位混在検査を正確に計算します。数値を回答する前に必ずこのツールを使い、サンプル行から全体値を推測しないでください。",
  input_schema: {
    type: "object",
    properties: {
      datasetId: { type: "string", description: "fetch_stats_dataが返したID" },
      operation: {
        type: "string",
        enum: SUPPORTED_OPERATIONS,
        description:
          "summary/group_sum/group_average/ranking/year_over_year/distinct/validate_measure",
      },
      groupBy: {
        type: "array",
        items: { type: "string" },
        description: "group_sum/group_average/year_over_yearの集計キー列",
      },
      valueColumn: {
        type: "string",
        description: "集計対象の数値列。既定はvalue",
      },
      column: { type: "string", description: "distinctの対象列" },
      yearColumn: {
        type: "string",
        description: "year_over_yearの年を含む列。既定はtime",
      },
      unitColumn: {
        type: "string",
        description: "validate_measureの単位列。既定はunit",
      },
      measureColumn: {
        type: "string",
        description: "validate_measureで併せて確認する計測値列（任意）",
      },
      sort: {
        type: "string",
        enum: ["asc", "desc"],
        description: "group集計の並び順。既定はdesc",
      },
      direction: {
        type: "string",
        enum: ["asc", "desc"],
        description: "rankingの方向。descで上位、ascで下位",
      },
      limit: {
        type: "integer",
        minimum: 1,
        description: "結果件数の上限",
      },
    },
    required: ["datasetId", "operation"],
  },
};

const EXECUTE_ANALYSIS_JAVASCRIPT = {
  name: "execute_analysis_javascript",
  description:
    "固定のanalyze_datasetで表現できない高度な分析を、隔離されたWeb Worker上でJavaScriptとして実行します。コードは function analyze({ records, columns, metadata, datasets, args }) { return { columns, rows, notes }; } の形式で記述してください。records/columns/metadataは主datasetIdのデータです。複数の保存済みデータセットを比較・結合する場合はdatasetIdsを指定し、datasets[datasetId].recordsを参照してください。analyze関数の先頭行には、この分析の目的（何を対象に何を集計・分析するか）を日本語のコメント（例: // 目的: ...）で必ず記述してください。これは後から分析ログをエクスポートした際に分析内容を識別するために使われます。fetch等のネットワーク・ストレージAPIは使用できません。まずanalyze_datasetで足りるか検討し、必要な場合のみ使用してください。",
  input_schema: {
    type: "object",
    properties: {
      datasetId: { type: "string", description: "fetch_stats_dataが返したID" },
      datasetIds: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        uniqueItems: true,
        description:
          "複数の保存済みデータセットを同じJS分析で参照する場合に指定するID配列。省略時はdatasetIdのみ。指定時もdatasetIdは主データセットとしてrecordsへ渡されます。",
      },
      code: {
        type: "string",
        description:
          "analyze関数を定義するJavaScript。recordsまたはdatasetsから集計しJSON互換の{columns,rows,notes}を返す。先頭行に分析の目的を説明する日本語コメントを含めること",
      },
      args: {
        type: "object",
        description: "analyzeへ渡す追加引数（任意）",
        additionalProperties: true,
      },
    },
    required: ["datasetId", "code"],
  },
};

// 入力からoperation以外をparametersへまとめる（datasetId/operationは除外）。
function toAnalysisParameters(input) {
  const { datasetId, operation, ...parameters } = input;
  return parameters;
}

// 分析結果のうちLLMへ返す部分。全行は持たせず先頭LLM_RESULT_ROWS件に絞る。
function summarizeAnalysisForLlm(result, analysisId) {
  const rows = result.rows.slice(0, LLM_RESULT_ROWS);
  return {
    ...(analysisId ? { analysisId } : {}),
    datasetId: result.datasetId,
    operation: result.operation,
    sourceRecordCount: result.sourceRecordCount,
    parameters: result.parameters,
    resultColumns: result.resultColumns,
    rows,
    rowCount: result.rows.length,
    truncatedRows: result.rows.length > rows.length,
    warnings: result.warnings,
    computedAt: result.computedAt,
  };
}

export function createAppToolRegistry(
  datasetStore,
  analysisStore,
  { runCode = runAnalysisCode, estatAppId = "" } = {},
) {
  return new ToolRegistry()
    .register(SEARCH_STATS_TABLES, (input, context) =>
      searchStatsTables(input, { ...context, appId: estatAppId }),
    )
    .register(GET_STATS_METADATA, (input, context) =>
      getStatsMetadata(input, { ...context, appId: estatAppId }),
    )
    .register(FETCH_STATS_DATA, async (input, context) => {
      const dataset = await fetchStatsData(input, {
        ...context,
        appId: estatAppId,
      });
      const stored = datasetStore.add(dataset);

      // LLMには全レコードを返さず、後続処理に必要な識別子と要約だけを返す。
      return {
        datasetId: stored.id,
        statsDataId: stored.statsDataId,
        title: stored.title,
        recordCount: stored.records.length,
        columns: stored.columns,
        measures: stored.measures,
        sample: stored.records.slice(0, LLM_SAMPLE_ROWS),
        truncated: stored.truncated,
      };
    })
    .register(INSPECT_DATASET, (input) =>
      datasetStore.inspect(input.datasetId, input),
    )
    .register(ANALYZE_DATASET, (input) => {
      const dataset = datasetStore.get(input.datasetId);
      const parameters = toAnalysisParameters(input);
      const result = runAnalysis({
        records: dataset.records,
        operation: input.operation,
        parameters,
      });
      // datasetIdを結果へ添えてからストアへ記録する（Phase 2でanalysisStore注入）。
      const enriched = { ...result, datasetId: dataset.id };
      const stored = analysisStore?.add({
        kind: "fixed",
        datasetId: dataset.id,
        operation: enriched.operation,
        parameters: enriched.parameters,
        resultColumns: enriched.resultColumns,
        rows: enriched.rows,
        warnings: enriched.warnings,
        computedAt: enriched.computedAt,
        status: "success",
      });
      return summarizeAnalysisForLlm(enriched, stored?.id);
    })
    .register(EXECUTE_ANALYSIS_JAVASCRIPT, async (input) => {
      const dataset = datasetStore.get(input.datasetId);
      const datasetIds = Array.isArray(input.datasetIds)
        ? [...new Set(input.datasetIds)]
        : [];
      const datasets =
        datasetIds.length > 0
          ? Object.fromEntries(
              datasetIds.map((id) => [id, datasetStore.get(id)]),
            )
          : {};
      if (datasetIds.length > 0 && !datasets[input.datasetId]) {
        datasets[input.datasetId] = dataset;
      }
      const result = await runCode({
        code: input.code,
        dataset,
        datasets,
        args: input.args ?? {},
      });
      const stored = analysisStore?.add(result);
      const sourceRecordCount =
        Object.keys(datasets).length > 0
          ? Object.values(datasets).reduce(
              (sum, item) => sum + item.records.length,
              0,
            )
          : dataset.records.length;
      // コード全文はLLMへ返さない（§8.1）。分析IDと主要結果・警告のみ返す。
      const forLlm = summarizeAnalysisForLlm(
        {
          datasetId: result.datasetId,
          operation: null,
          sourceRecordCount,
          parameters: result.parameters,
          resultColumns: result.resultColumns,
          rows: result.rows,
          warnings: result.warnings,
          computedAt: result.computedAt,
        },
        stored?.id,
      );
      return {
        ...forLlm,
        status: result.status,
        durationMs: result.durationMs,
        ...(result.error ? { error: result.error } : {}),
      };
    });
}

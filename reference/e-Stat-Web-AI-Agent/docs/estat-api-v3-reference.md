# e-Stat API v3.0 リファレンス（JSON取得版）

政府統計の総合窓口（e-Stat）API の利用要約。取得は **JSON 形式前提**。出典: 統計センター「API仕様 ver 3.0」（令和元年7月）。

---

## 0. 基本ルール

- **エンドポイント基底**: `https://api.e-stat.go.jp/rest/<version>/app/json/...`
  - `<version>` は `3.0`。JSON は **パスに `json/` を挟む**（例: `/app/json/getStatsData`）。
- **共通必須パラメータ**: `appId`（利用登録で取得したアプリケーションID）。
- **言語**: `lang=J`（日本語・省略値）/ `E`（英語）。
- **パラメータ書式**: `name=value` を `&` で連結。**値は必ず UTF-8 で URL エンコード**してから連結する。
- **HTTPメソッド**: 基本 GET。`postDataset` と `getStatsDatas`（一括）は POST。

---

## 1. 7つの機能と URL

| 機能 | 用途 | メソッド | URL（JSON） |
|---|---|---|---|
| 統計表情報取得 | 統計表を検索 | GET | `/app/json/getStatsList` |
| メタ情報取得 | 表章・分類・地域・時間軸の項目定義 | GET | `/app/json/getMetaInfo` |
| 統計データ取得 | 数値データ本体 | GET | `/app/json/getStatsData` |
| データセット登録 | 絞り込み条件を保存 | POST | `/app/postDataset` |
| データセット参照 | 保存済み条件の参照 | GET | `/app/json/refDataset` |
| データカタログ情報取得 | 統計表ファイル/DBの情報 | GET | `/app/json/getDataCatalog` |
| 統計データ一括取得 | 複数IDをまとめて取得 | POST | `/app/json/getStatsDatas` |

### 典型ワークフロー
1. `getStatsList` で目的の統計表を探し `@id`（statsDataId）を得る。
2. `getMetaInfo` でその表の項目コード（tab / cat01〜15 / area / time）を把握する。
3. `getStatsData` で絞り込み条件を付けて数値を取得する。

---

## 2. 統計表情報取得 `getStatsList`

主なパラメータ（すべて任意、`appId` 除く）:

| パラメータ | 意味 | 形式・値 |
|---|---|---|
| `surveyYears` | 調査年月 | `yyyy` / `yyyymm` / `yyyymm-yyyymm` |
| `openYears` | 公開年月 | 同上 |
| `statsField` | 統計分野 | 2桁=大分類 / 4桁=小分類 |
| `statsCode` | 政府統計コード | 5桁=作成機関 / 8桁=政府統計コード |
| `searchWord` | キーワード | 任意文字列。`AND`/`OR`/`NOT` 可（例: `東京 AND 人口`） |
| `searchKind` | データ種別 | `1`=統計情報（既定） / `2`=小地域・地域メッシュ |
| `collectArea` | 集計地域区分 | `1`=全国 / `2`=都道府県 / `3`=市区町村（種別2では無効） |
| `statsNameList` | 統計調査名一覧 | `Y` で統計表でなく調査名の一覧を返す |
| `explanationGetFlg` | 解説取得 | `Y`（既定）/ `N` |
| `updatedDate` | 更新日付で絞り込み | `yyyy`/`yyyymm`/`yyyymmdd`/`範囲` |
| `startPosition` | 取得開始行 | 継続取得時に前回の `NEXT_KEY` を指定 |
| `limit` | 取得件数 | 省略時 **10万件** |

**JSONトップキー** `GET_STATS_LIST`。`DATALIST_INF.TABLE_INF`（`@id`=statsDataId）に統計表ごとの情報。`STAT_NAME`(@code) / `GOV_ORG`(@code) / `TITLE`(@no) / `SURVEY_DATE` / `OPEN_DATE` / `OVERALL_TOTAL_NUMBER`（絞込なし総件数）など。

---

## 3. メタ情報取得 `getMetaInfo`

| パラメータ | 意味 | 値 |
|---|---|---|
| `statsDataId` | 統計表ID（**必須**） | getStatsList で取得 |
| `explanationGetFlg` | 解説取得 | `Y`（既定）/ `N` |

**JSONトップキー** `GET_META_INFO`。`METADATA_INF.CLASS_INF.CLASS_OBJ`（事項単位の配列）。

- `CLASS_OBJ`: `@id`（`tab`/`cat01`…`cat15`/`area`/`time`）、`@name`。
- 各 `CLASS`: `@code`, `@name`, `@level`（階層レベル）, `@unit`, `@parentCode`, `@addInf`。
  unit/parentCode/addInf はデータがある時のみ出力。
- 要素が1件だけの事項は `CLASS` がオブジェクト、複数なら配列になる点に注意（パース時に正規化する）。

> ここで得た `@id`（tab, cat01…, area, time）と `@code` が、`getStatsData` の絞り込みキーになる。

---

## 4. 統計データ取得 `getStatsData`（最重要）

### 4.1 ID 指定（どちらか一方を必ず指定）
- `statsDataId`（統計表ID） **または** `dataSetId`（登録済みデータセット）。
- 両方指定/両方未指定はエラー。dataSetId と絞込条件を併用すると、保存条件にさらに絞り込める。

### 4.2 絞り込み条件（事項ごとに同じ構造）
事項は **表章=tab / 時間軸=time / 地域=area / 分類=cat01〜cat15**。各事項に以下の4種:

| パラメータ | 意味 |
|---|---|
| `lv<事項>` | 階層レベル指定 |
| `cd<事項>` | 単一コード（カンマ区切りで最大100個） |
| `cd<事項>From` | コード範囲・開始 |
| `cd<事項>To` | コード範囲・終了 |

例: `lvTab`, `cdTab`, `cdTabFrom`, `cdTabTo` / `cdArea`, `cdAreaFrom` / `cdCat01`, `lvCat01` …

**階層レベル `lv` の書式**（X は階層レベル）:
- `X` … 指定レベルのみ
- `X-X` … 範囲
- `-X` … レベル1〜X
- `X-` … X〜レベル9

**条件の組み合わせ**: 同一事項で `lv` と `cd` を併用すると **AND**。単一コードと範囲(From-To)併用も AND。From のみ＝以降すべて、To のみ＝以前すべて。

**特別キーワード**（cd系で使用可）: `min`（最小コード値）/ `max`（最大コード値）。
※ 単一コードで min/max を使う場合、カンマ区切りの複数指定は不可。

### 4.3 出力・取得制御

| パラメータ | 意味 | 値 |
|---|---|---|
| `startPosition` | 取得開始行 | 継続取得は前回 `NEXT_KEY` を渡す |
| `limit` | 取得件数 | 省略時 **10万件** |
| `metaGetFlg` | メタ情報同梱 | `Y`（既定）/ `N` |
| `cntGetFlg` | 件数のみ取得 | `Y`=件数のみ（データ本体なし）/ `N`（既定） |
| `explanationGetFlg` | 解説 | `Y`（既定）/ `N` |
| `annotationGetFlg` | 注釈 | `Y`（既定）/ `N` |
| `replaceSpChars` | 特殊文字置換 | `0`=しない(既定) / `1`=0 / `2`=空文字 / `3`=NA |

### 4.4 JSON 出力構造
**トップキー** `GET_STATS_DATA`。

```
GET_STATS_DATA
├─ RESULT            … STATUS / ERROR_MSG / DATE
├─ PARAMETER         … 受信パラメータ
└─ STATISTICAL_DATA
   ├─ RESULT_INF     … TOTAL_NUMBER（絞込一致件数）/ FROM_NUMBER / TO_NUMBER / NEXT_KEY
   ├─ TABLE_INF      … 統計表メタ（STAT_NAME, TITLE 等）
   ├─ CLASS_INF      … 絞込結果のメタ（metaGetFlg=N で省略）
   └─ DATA_INF
      ├─ NOTE        … 特殊文字凡例（@char）
      ├─ ANNOTATION  … 注釈（@annotation）
      └─ VALUE       … セル本体（配列）
```

`VALUE` 1件＝1セル。属性キー `@tab`, `@cat01`…`@cat15`, `@area`, `@time`, `@unit`, `@annotation` と、値が `$`（数値文字列）。

```json
{ "@tab": "006", "@cat01": "000", "@area": "00000",
  "@time": "2012000000", "@unit": "世帯", "$": "28547900", "@annotation": "J1" }
```

> **ページング**: `NEXT_KEY` が返れば継続データあり。次回 `startPosition=<NEXT_KEY>` で続きを取得。返らなければ全件取得済み。

---

## 5. データセット登録/参照（任意機能）

### postDataset（POST, `Content-Type: application/x-www-form-urlencoded`）
- `processMode`: `E`=登録・更新（既定）/ `D`=削除。
- 登録: `E` + `statsDataId` + 1つ以上の絞込条件。
- 更新: `E` + `statsDataId` + `dataSetId` + 絞込条件。
- 削除: `D` + `dataSetId`。
- `dataSetId`: 30文字以内、半角英数と `- _ . @`。省略時は自動付与。
- `openSpecified`: `0`=非公開(既定) / `1`=公開。`dataSetName`: 全角256文字まで。

### refDataset
- `dataSetId` 指定 → 1件（トップキー `REF_DATASET`、`DATASET_INF` に `NARROWING_COND` 含む）。
- 省略 → 利用可能な一覧（トップキー `GET_DATASET_LIST`）。

---

## 6. データカタログ情報取得 `getDataCatalog`

統計表ファイル（XLS/CSV/PDF/XML）や統計データベース(DB)のカタログを検索。

- 検索系は getStatsList と同様（`surveyYears`, `statsField`, `statsCode`, `searchWord`, `collectArea` 等）。
- 固有: `dataType`（`XLS`/`CSV`/`PDF`/`XML`/`XLS_REP`/`DB`、カンマ区切り可、省略=全部）、`catalogId`, `resourceId`。
- `limit` 省略時 **100データセット**。
- トップキー `GET_DATA_CATALOG`。`DATA_CATALOG_INF.DATASET / .RESOURCES.RESOURCE`。
  - `RESOURCE.URL`: ダウンロードURL（DBの場合は statsDataId）。`FORMAT`: ファイル形式。`LANDING_PAGE`: e-Stat上のページ。

---

## 7. 統計データ一括取得 `getStatsDatas`（POST）

複数の statsDataId/dataSetId を1リクエストで取得。トップキー `GET_STATS_DATAS`。

- 共通フラグ: `metaGetFlg`, `explanationGetFlg`, `annotationGetFlg`, `replaceSpChars`。
- **`statsDatasSpec`（必須）**: 取得対象と絞込条件を **JSON 文字列**で記述。

```json
[
  { "statsDataId": "0003084821", "lvTab": "1-2", "cdCat01": "01" },
  { "statsDataId": "0005084822", "cdAreaFrom": "01000", "cdAreaTo": "02000" }
]
```

- 各リクエストには先頭から `requestNo`（1始まり）が自動付与され、出力（`TABLE_INF`/`CLASS_INF`/`DATA_INF` の `@requestNo`）やエラー対応付けに使われる。
- 個別リクエストで指定可能なキーは getStatsData の絞込条件（`dataSetId`/`statsDataId`/`lv*`/`cd*`/`startPosition`/`limit`）。
- **全リクエスト合計で 100,000 セルまで**（超過は結果コード400）。

---

## 8. JSON 出力の共通仕様

### RESULT ブロック（全API共通）
- `STATUS`: 結果コード（`0〜2`=正常 / `100`以上=エラー）。
- `ERROR_MSG`, `DATE`。

### XML→JSON の対応（パース時の前提）
- 属性は `@属性名`、要素値は `$` キーになる。
  例: `STAT_NAME = { "@code": "00200", "$": "総務省" }`
- 繰り返し要素は配列、1件のときはオブジェクトになり得る（`CLASS` / `VALUE` / `NOTE` 等は配列化して扱うのが安全）。
- 全角や `< > & = '` は Unicode エスケープされて返るが、JSON.parse すれば通常文字に戻る。

---

## 9. 主なエラーコード（STATUS）

| コード | HTTP | 意味 |
|---|---|---|
| 0 | 200 | 正常終了 |
| 1 | 200 | 正常だが該当データ0件 |
| 2 | 200 | 一括取得で指定 requestNo が0件 |
| 100 | 403 | 認証失敗（appId 誤り） |
| 101 | 400 | 必須パラメータ未指定 |
| 102 | 400 | 値が不正（範囲外等） |
| 103 | 400 | 値が長すぎる |
| 104 | 400 | 使用不可文字を含む |
| 105 | 400 | 単一コード指定が100個超過 |
| 200–203 / 299 | 500 | DB/内部エラー（時間をおいて再試行） |
| 300 | 400 | 指定IDのデータが存在しない |
| 301 | 200 | 他者のデータセットを変更しようとした |
| 302 | 200 | 絞込結果0件で登録不可 |
| 303 | 500 | dataSetID 自動付与失敗 |
| 400 | 200 | 一括取得の合計セルが10万件超過 |
| 401 | 500 | 一括取得の特定 requestNo でエラー |

---

## 10. 実装メモ（要点）

- 値は必ず **URLエンコード（UTF-8）**。日本語キーワードや記号で事故りやすい。
- **大量データは `limit` + `NEXT_KEY` ループ**で分割取得。1回上限は実質10万件。
- まず `cntGetFlg=Y` で件数だけ確認 → 取得計画を立てると無駄打ちを減らせる。
- 帯域を絞るなら `metaGetFlg=N` / `explanationGetFlg=N` / `annotationGetFlg=N`。メタは初回のみ別途 getMetaInfo で取得しておく運用が効率的。
- `replaceSpChars` で `-`/`X` 等の特殊セルを数値処理しやすい値に置換しておくと後段が楽。
- `CLASS` / `VALUE` / `NOTE` など繰り返し要素は **件数1で配列にならない**ため、配列化ヘルパーで正規化してからループする。
- `area` コードは都道府県=`NNNNN`（例 北海道 `01000`）。市区町村粒度は `collectArea`/該当表のメタで確認。

#!/usr/bin/env node
/**
 * refactor-queue.mjs — キューの各項目について agent-loop.mjs を1回ずつ回し、
 * 通ったブランチだけ main に取り込む「採用／却下」ループ。
 *
 *   node refactor-queue.mjs refactor-queue.json
 *
 * refactor-queue.json:
 * [
 *   { "id": "scale-util",
 *     "goal": "src/util/scale.js の d3 スケール生成をファクトリ関数に統一する",
 *     "allowed": "src/util/scale.js src/util/*.js",
 *     "forbid": "公開している createScale/createAxis のシグネチャ" },
 *   ...
 * ]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const queueFile = process.argv[2] ?? "refactor-queue.json";
const queue = JSON.parse(fs.readFileSync(queueFile, "utf8"));
const BASE = process.env.BASE_REF ?? "main";
const results = [];

// ベースラインで検証器が緑でなければ開始しない
const baseline = spawnSync("bash", ["scripts/loop/verify-refactor.sh"], { encoding: "utf8", env: { ...process.env, BASE_REF: BASE } });
if (baseline.status !== 0) {
  console.error("ベースラインで検証器が失敗しています。先に直してください:\n" + baseline.stdout + baseline.stderr);
  process.exit(4);
}

for (const item of queue) {
  const branch = `refactor/${item.id}`;
  const taskFile = path.join(".loops", `${item.id}.task.md`);
  fs.mkdirSync(".loops", { recursive: true });
  fs.writeFileSync(taskFile, buildTask(item));

  console.log(`\n##### ${item.id}: ${item.goal}`);
  const r = spawnSync("node", [
    "scripts/loop/agent-loop.mjs",
    "--prompt", taskFile,
    "--test", "bash scripts/loop/verify-refactor.sh",
    "--max", "2",
    "--budget", String(item.budget ?? 2),
    "--branch", branch,
    "--tools", "Edit,Write,Read,Glob,Grep,Bash(npm test),Bash(npx tsc *),Bash(npm run lint)",
  ], {
    stdio: "inherit",
    env: { ...process.env, BASE_REF: BASE, ALLOWED_PATHS: item.allowed ?? "" },
  });

  if (r.status === 0) {
    // 採用: main に取り込む（squash して1コミットに）
    spawnSync("git", ["merge", "--squash", branch], { stdio: "inherit" });
    spawnSync("git", ["commit", "-qm", `refactor(${item.id}): ${item.goal}`], { stdio: "inherit" });
    spawnSync("git", ["branch", "-D", branch]);
    results.push({ id: item.id, status: "merged" });
  } else {
    // 却下: ブランチは残して後で人間が見られるようにする
    results.push({ id: item.id, status: "rejected", exitCode: r.status, branch });
  }
  fs.writeFileSync(".loops/refactor-results.json", JSON.stringify(results, null, 2));
}

console.log("\n===== summary =====");
for (const r of results) console.log(`${r.status.padEnd(9)} ${r.id}${r.branch ? `  (${r.branch})` : ""}`);

function buildTask(item) {
  return `# リファクタリング: ${item.id}

## 目的
${item.goal}

## 絶対に守ること
- 振る舞いを変えないこと。既存テストはそのまま通らなければならない
- テストファイル、および ${item.forbid ?? "公開API"} を変更しないこと
- 変更してよいのは次のパスのみ: ${item.allowed ?? "(指定なし)"}
- テストを通すためにテスト側を書き換えるのは禁止。通らない場合はリファクタリング内容の方を見直すこと

## 手順
1. 対象コードと、それを参照している箇所を読む
2. 変更前に \`npm test\` を実行し、緑であることを確認する
3. 小さく変更し、\`npm test\` で確認する
4. 型チェックと lint も通す

完了したら、何をどう変えたかを3行以内で報告して終了すること。
`;
}

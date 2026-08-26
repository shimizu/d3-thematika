#!/usr/bin/env node
/**
 * agent-loop.mjs — Claude Code を「テスト通過まで」回す実用雛形
 *
 * 使い方:
 *   node agent-loop.mjs --prompt ./task.md [options]
 *
 * options:
 *   --prompt <file>      タスク記述ファイル（必須）
 *   --test  <cmd>        検証コマンド        (default: "npm test")
 *   --max   <n>          最大反復回数        (default: 8)
 *   --budget <usd>       累計コスト上限      (default: 5)
 *   --branch <name>      作業ブランチ名      (default: loop/<timestamp>)
 *   --tools <list>       claude --allowedTools に渡す値
 *                        (default: "Edit,Write,Read,Glob,Grep,Bash(npm test)")
 *   --keep               終了後 worktree を残す
 *   --install            worktree で npm ci を実行する（default: 親の node_modules を symlink）
 *
 * 終了コード: 0=テスト通過 / 1=反復上限 / 2=同一失敗の停滞 / 3=予算超過 / 4=設定エラー
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ---------- 設定 ----------
const args = parseArgs(process.argv.slice(2));
if (!args.prompt) die(4, "--prompt <file> は必須です");

const CFG = {
  promptFile: args.prompt,
  testCmd: args.test ?? "npm test",
  maxIter: Number(args.max ?? 8),
  budgetUsd: Number(args.budget ?? 5),
  branch: args.branch ?? `loop/${stamp()}`,
  tools: args.tools ?? "Edit,Write,Read,Glob,Grep,Bash(npm test)",
  keep: Boolean(args.keep),
  install: Boolean(args.install),
  stallLimit: 2,        // 同一失敗が何周続いたら止めるか
  feedbackMaxLines: 80, // テスト出力をここまで削ってから渡す
};

const repoRoot = sh("git", ["rev-parse", "--show-toplevel"]).stdout.trim();
if (!repoRoot) die(4, "git リポジトリ内で実行してください");

const worktreeDir = path.join(repoRoot, ".loops", CFG.branch.replace(/\//g, "_"));
const logDir = path.join(worktreeDir, ".loop-log");
const basePrompt = fs.readFileSync(CFG.promptFile, "utf8");

// ---------- worktree で隔離 ----------
fs.mkdirSync(path.dirname(worktreeDir), { recursive: true });
sh("git", ["worktree", "add", "-b", CFG.branch, worktreeDir], { check: true });
fs.mkdirSync(logDir, { recursive: true });
log(`worktree: ${worktreeDir}  branch: ${CFG.branch}`);

// 依存関係: デフォルトは親の node_modules を共有（速い）。--install で npm ci（確実）
if (fs.existsSync(path.join(repoRoot, "package.json"))) {
  if (CFG.install) {
    sh("npm", ["ci", "--silent"], { cwd: worktreeDir, check: true });
    log("npm ci done");
  } else if (fs.existsSync(path.join(repoRoot, "node_modules"))) {
    fs.symlinkSync(path.join(repoRoot, "node_modules"), path.join(worktreeDir, "node_modules"), "dir");
    log("node_modules symlinked from parent");
  }
}

// ---------- ループ本体 ----------
let feedback = "";
let prevFailureHash = null;
let stallCount = 0;
let totalCost = 0;
const history = [];

for (let i = 1; i <= CFG.maxIter; i++) {
  log(`\n=== iteration ${i}/${CFG.maxIter} ===`);

  // 1. 生成: Claude を起動
  const prompt = buildPrompt(basePrompt, feedback, i);
  const { text: claudeOut, cost } = runClaude(prompt);
  totalCost += cost;
  fs.writeFileSync(path.join(logDir, `${i}-claude.md`), claudeOut);
  log(`claude done  (cost: $${cost.toFixed(3)}, total: $${totalCost.toFixed(3)})`);

  // 2. 記録: 差分をコミット（何もなければスキップ）
  sh("git", ["add", "-A"], { cwd: worktreeDir });
  const commit = sh("git", ["commit", "-qm", `loop: iteration ${i}`], { cwd: worktreeDir });
  const changed = commit.status === 0;
  log(changed ? "changes committed" : "no file changes");

  // 3. 検証: 生成役とは別プロセスで判定
  const test = shRaw(CFG.testCmd, { cwd: worktreeDir });
  const testOut = (test.stdout ?? "") + (test.stderr ?? "");
  fs.writeFileSync(path.join(logDir, `${i}-test.txt`), testOut);
  history.push({ iteration: i, changed, testStatus: test.status, cost });
  saveHistory();

  if (test.status === 0) {
    log(`\nPASS at iteration ${i}. branch ${CFG.branch} を確認してください`);
    finish(0);
  }

  // 4. フィードバック整形と停滞検知
  feedback = trimFeedback(testOut, CFG.feedbackMaxLines);
  const hash = createHash("sha1").update(feedback).digest("hex");
  stallCount = hash === prevFailureHash ? stallCount + 1 : 0;
  prevFailureHash = hash;

  if (!changed && stallCount >= 1) {
    log("Claude がファイルを変更せず、失敗も同一。停滞と判断");
    finish(2);
  }
  if (stallCount >= CFG.stallLimit) {
    log(`同一失敗が ${CFG.stallLimit + 1} 周連続。停滞と判断`);
    finish(2);
  }
  if (totalCost >= CFG.budgetUsd) {
    log(`予算 $${CFG.budgetUsd} に到達`);
    finish(3);
  }
}

log(`反復上限 ${CFG.maxIter} に到達。未解決`);
finish(1);

// ---------- 関数 ----------

function buildPrompt(base, fb, iteration) {
  if (!fb) return base;
  return [
    base,
    "",
    "---",
    `## 前回 (iteration ${iteration - 1}) のテスト結果`,
    "このテストが通るように修正してください。同じ修正を繰り返さないこと。",
    "根本原因が特定できない場合は、まずログ出力を追加して調査してください。",
    "",
    "```",
    fb,
    "```",
  ].join("\n");
}

function runClaude(prompt) {
  const r = spawnSync(
    "claude",
    ["-p", "--output-format", "json", "--allowedTools", CFG.tools],
    { cwd: worktreeDir, input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  if (r.status !== 0) {
    log(`claude exited ${r.status}: ${r.stderr?.slice(0, 500)}`);
    return { text: r.stderr ?? "", cost: 0 };
  }
  try {
    const j = JSON.parse(r.stdout);
    return { text: j.result ?? "", cost: Number(j.total_cost_usd ?? 0) };
  } catch {
    return { text: r.stdout, cost: 0 };
  }
}

/** テスト出力から失敗に関係する行を優先して残す */
function trimFeedback(out, maxLines) {
  const lines = out.split("\n");
  const failRe = /(fail|error|expected|received|assert|✕|×|at .+:\d+)/i;
  const failLines = lines.filter((l) => failRe.test(l));
  const picked = failLines.length >= 5 ? failLines : lines;
  const tail = picked.slice(-maxLines);
  return (picked.length > maxLines ? `... (${picked.length - maxLines} lines omitted)\n` : "") + tail.join("\n");
}

function saveHistory() {
  fs.writeFileSync(
    path.join(logDir, "history.json"),
    JSON.stringify({ config: CFG, totalCost, history }, null, 2)
  );
}

function finish(code) {
  saveHistory();
  if (!CFG.keep && code !== 0) {
    // 失敗時もブランチは残す。worktree だけ外して作業ツリーを汚さない
    sh("git", ["worktree", "remove", "--force", worktreeDir]);
    log(`worktree removed (branch ${CFG.branch} は保持)`);
  }
  process.exit(code);
}

function sh(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { encoding: "utf8", cwd: opts.cwd ?? repoRoot ?? process.cwd(), maxBuffer: 64 * 1024 * 1024 });
  if (opts.check && r.status !== 0) die(4, `${cmd} ${argv.join(" ")} failed:\n${r.stderr}`);
  return r;
}

function shRaw(cmdline, opts = {}) {
  return spawnSync(cmdline, { shell: true, encoding: "utf8", cwd: opts.cwd, maxBuffer: 64 * 1024 * 1024 });
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) o[k] = true;
    else { o[k] = v; i++; }
  }
  return o;
}

function stamp() {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}
function log(msg) { console.log(msg); }
function die(code, msg) { console.error(msg); process.exit(code); }

#!/usr/bin/env bash
# verify-refactor.sh — リファクタリング用の検証器
# agent-loop.mjs の --test に渡す。worktree 内で実行される前提。
#
# 環境変数:
#   ALLOWED_PATHS   変更を許可するパス（空白区切り glob）。例: "src/chart/*.js src/util/scale.js"
#   PROTECTED_PATHS 変更禁止パス          (default: "test tests __tests__ *.test.* *.spec.*")
#   BASE_REF        比較元                (default: main)
#   API_SNAPSHOT    公開APIスナップショット (default: .loop-api-snapshot.txt)
#
# 最初に落ちた段階で exit 1。出力はそのまま Claude へのフィードバックになる。
set -u
BASE_REF="${BASE_REF:-main}"
PROTECTED_PATHS="${PROTECTED_PATHS:-test tests __tests__ *.test.* *.spec.*}"
API_SNAPSHOT="${API_SNAPSHOT:-.loop-api-snapshot.txt}"

fail() { echo "VERIFY FAILED [$1]"; echo "$2"; exit 1; }
base=$(git merge-base HEAD "$BASE_REF")
changed=$(git diff --name-only "$base" HEAD; git diff --name-only; git ls-files --others --exclude-standard)
changed=$(echo "$changed" | sort -u | grep -v '^$' | grep -v '^\.loop-log/')

# 1. 変更禁止パス（テスト等）に触っていないか
for f in $changed; do
  for p in $PROTECTED_PATHS; do
    case "$f" in $p|$p/*|*/$p|*/$p/*) fail "protected-path" "テストや保護対象のファイルを変更してはいけません: $f";;
    esac
  done
done

# 2. 許可パス外に触っていないか
if [ -n "${ALLOWED_PATHS:-}" ]; then
  for f in $changed; do
    ok=0
    for p in $ALLOWED_PATHS; do case "$f" in $p) ok=1;; esac; done
    [ $ok = 1 ] || fail "out-of-scope" "許可されたパス以外を変更しています: $f
許可: $ALLOWED_PATHS"
  done
fi

# 3. 型・lint（存在するものだけ）
if [ -f tsconfig.json ]; then
  out=$(npx tsc --noEmit 2>&1) || fail "typecheck" "$out"
fi
if npm run -s lint --if-present >/tmp/lint.out 2>&1; then :; else fail "lint" "$(cat /tmp/lint.out)"; fi

# 4. 振る舞いの保存
out=$(npm test 2>&1) || fail "tests" "$out"

# 5. 公開APIの保存（スナップショットがあれば）
if [ -f "$API_SNAPSHOT" ] && [ -f scripts/api-snapshot.sh ]; then
  now=$(bash scripts/api-snapshot.sh)
  d=$(diff <(cat "$API_SNAPSHOT") <(echo "$now")) || fail "api-changed" "公開APIが変わっています:
$d"
fi

echo "VERIFY OK"
exit 0

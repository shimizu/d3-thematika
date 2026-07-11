import assert from "node:assert/strict";
import test from "node:test";
import { DatasetStore } from "../src/data/dataset-store.js";

test("データセットを保存して要約と詳細を取得できる", () => {
  const store = new DatasetStore();
  const stored = store.add({
    statsDataId: "table-1",
    title: "テスト統計表",
    filters: { cdArea: "001" },
    columns: ["area", "value"],
    records: [
      { area: "001", value: 10 },
      { area: "002", value: 20 },
    ],
  });

  assert.equal(stored.id, "dataset_001");
  assert.equal(store.list()[0].recordCount, 2);
  assert.deepEqual(
    store.inspect(stored.id, { distinctColumn: "area" }).distinct,
    ["001", "002"],
  );
});

test("removeで単体のデータセットを削除し通知する", () => {
  const store = new DatasetStore();
  const stored = store.add({
    statsDataId: "table-1",
    columns: ["value"],
    records: [{ value: 1 }],
  });
  assert.equal(store.list().length, 1);

  const snapshots = [];
  const unsubscribe = store.subscribe((datasets) => snapshots.push(datasets));
  store.remove(stored.id);
  unsubscribe();

  assert.equal(store.list().length, 0);
  assert.throws(() => store.get(stored.id), /見つかりません/);
  // subscribe直後の初期スナップショット + remove通知
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[1].length, 0);
});

test("変更通知で最新のデータセット一覧を受け取れる", () => {
  const store = new DatasetStore();
  const snapshots = [];
  const unsubscribe = store.subscribe((datasets) => snapshots.push(datasets));

  store.add({
    statsDataId: "table-1",
    columns: [],
    records: [],
  });
  unsubscribe();

  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[1][0].id, "dataset_001");
});


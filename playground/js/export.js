/**
 * 作成した地図を自己完結パッケージ（zip）としてエクスポートする。
 * 依存を増やさないため、無圧縮（store方式）のzipを自前で生成する。
 */

const textEncoder = new TextEncoder();

// CRC32テーブル（IEEE 802.3多項式）。
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** 現在時刻をDOS形式のdate/timeへ変換する。 */
function dosDateTime(date = new Date()) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

/**
 * 無圧縮zipを生成する。
 * @param {Array<{name: string, content: string | Uint8Array}>} files
 * @returns {Blob}
 */
export function buildZip(files) {
  const { time, day } = dosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const data =
      typeof file.content === "string"
        ? textEncoder.encode(file.content)
        : file.content;
    const crc = crc32(data);

    // ローカルファイルヘッダ（30バイト + name）。flags bit11 = ファイル名UTF-8。
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // flags: UTF-8
    local.setUint16(8, 0, true); // method: store
    local.setUint16(10, time, true);
    local.setUint16(12, day, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true); // compressed
    local.setUint32(22, data.length, true); // uncompressed
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true); // extra length

    localParts.push(new Uint8Array(local.buffer), nameBytes, data);

    // セントラルディレクトリエントリ（46バイト + name）。
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true); // version made by
    central.setUint16(6, 20, true); // version needed
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, time, true);
    central.setUint16(14, day, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    // extra/comment/disk/attrs = 0
    central.setUint32(42, offset, true); // local header offset

    centralParts.push(new Uint8Array(central.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);

  // End of central directory（22バイト）。
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true); // entries on this disk
  end.setUint16(10, files.length, true); // total entries
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true); // central directory offset
  end.setUint16(20, 0, true); // comment length

  return new Blob([...localParts, ...centralParts, new Uint8Array(end.buffer)], {
    type: "application/zip",
  });
}

/** エクスポートするindex.htmlを組み立てる。 */
function buildIndexHtml(html) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>d3-thematika map</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-geo-projection@4"></script>
  <script src="./lib/thematika.umd.js"></script>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
${html.trim()}
  <script type="module" src="./script.js"></script>
</body>
</html>
`;
}

const EXPORT_README = `# d3-thematika map

d3-thematika AI プレイグラウンドからエクスポートされた地図です。

## 開き方

fetchでデータを読むため、ローカルサーバーで配信してください:

    npx serve .

ブラウザで http://localhost:3000 を開くと地図が表示されます。

## 構成

- index.html   … エントリポイント
- style.css    … スタイル
- script.js    … 描画コード（トップレベルawait使用のためESモジュール）
- data/        … 地図データ（GeoJSON）
- lib/thematika.umd.js … d3-thematikaライブラリ本体
`;

/**
 * 現在のコードとデータをzipにまとめてダウンロードする。
 *
 * @param {object} params
 * @param {{html: string, css: string, js: string}} params.code - エディタの内容
 * @param {Array<{name: string, geojson: object}>} params.datasets - 同梱するデータ
 * @param {string} params.libraryUrl - thematika.umd.jsの取得元URL
 * @param {string} [params.filename]
 */
export async function exportProject({
  code,
  datasets,
  libraryUrl,
  filename = "thematika-map.zip",
}) {
  const libraryResponse = await fetch(libraryUrl);
  if (!libraryResponse.ok) {
    throw new Error("thematika.umd.js を取得できませんでした。");
  }
  const libraryBytes = new Uint8Array(await libraryResponse.arrayBuffer());

  const files = [
    { name: "index.html", content: buildIndexHtml(code.html) },
    { name: "style.css", content: code.css },
    { name: "script.js", content: code.js },
    { name: "README.md", content: EXPORT_README },
    { name: "lib/thematika.umd.js", content: libraryBytes },
    ...datasets.map(({ name, geojson }) => ({
      name: `data/${name}`,
      content: JSON.stringify(geojson),
    })),
  ];

  const blob = buildZip(files);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

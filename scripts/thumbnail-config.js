export default {
  // 対象デモページリスト
  pages: [
    'biutiful-map.html',
    'clip-polygon.html',
    'cog-layer.html',
    'geojson-layer.html',
    'gis-utils.html',
    'image-layer.html',
    'legend-layer-layer.html',
    'line-connection.html',
    'line-text-layer.html',
    'playground.html',
    'point-annotation-layer.html',
    'point-circle-layer.html',
    'point-spike.html',
    'point-text-layer.html',
    'tile-map.html'
  ],

  // スクリーンショット設定
  screenshot: {
    width: 640,        // 16:9のアスペクト比
    height: 360,       // 640÷16×9=360
    deviceScaleFactor: 1, // サムネイル用に標準解像度
    format: 'png',
    // PNGではqualityは使用不可、JPEGのみサポート
    // #map要素のみを撮影する設定
    fullPage: false,
    clip: null // #map要素の境界に合わせて動的設定
  },

  // 待機設定
  wait: {
    networkIdle: 2000,    // ネットワークアイドル待機時間（ms）
    mapLoad: 3000,        // 地図読み込み完了待機時間（ms）
    pageLoad: 10000,      // ページ読み込みタイムアウト（ms）
    initialDelay: 1000,   // 初期待機時間（DOM安定化用）
    animationBuffer: 500  // アニメーション完了後の追加待機
  },

  // パス設定
  paths: {
    examples: '../examples',
    thumbnails: '../examples/thumbnails',
    baseURL: 'http://localhost:3000'  // 開発サーバーURL
  },

  // ブラウザ設定
  browser: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080'  // 16:9のフルHDサイズ
    ]
  },

  // ページ固有の設定
  pageSpecific: {
    'biutiful-map.html': {
      wait: { mapLoad: 5000 }, // 美しい地図は読み込みに時間がかかる
    },
    'cog-layer.html': {
      wait: { mapLoad: 8000 }, // COGファイルの読み込みは重い
    },
    'tile-map.html': {
      wait: { mapLoad: 4000 }, // タイル読み込み待機
    },
    'image-layer.html': {
      wait: { mapLoad: 4000 }, // 画像読み込み待機
    }
  },

  // スキップ対象ページ（テスト用など）
  skipPages: [
    'template.html',
    'test.html'
  ]
};
# d3-thematika ユーザーガイド

d3-thematikaは、美しいスタティックな主題図を作成するためのJavaScriptライブラリです。

## 目次

- [デバッグ](./debug.md) - d3-thematikaを使用時のデバッグ方法

## 概要

d3-thematikaは以下のような特徴を持ちます：

- 📊 **主題図に特化**: スタティックな主題図作成に最適化
- 🎨 **美しいデザイン**: CSS/SVGエフェクトを活用した美しい地図
- 🔧 **D3.js基盤**: D3.jsの豊富な機能を活用
- 📐 **豊富な投影法**: 様々な地図投影法をサポート
- 🎯 **シンプルAPI**: 直感的で使いやすいAPI設計

## クイックスタート

### インストール

```bash
npm install d3-thematika
```

### 基本的な使用例

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="./dist/thematika.umd.js"></script>
</head>
<body>
    <div id="map"></div>
    
    <script>
        const map = new Cartography.Cartography({
            container: '#map',
            width: 800,
            height: 600,
            projection: 'naturalEarth1'
        });
        
        map.addLayer('countries', {
            data: worldData, // GeoJSONデータ
            style: {
                fill: '#f0f0f0',
                stroke: '#333',
                strokeWidth: 1
            }
        });
    </script>
</body>
</html>
```

## 主な機能

### 基本的な地図要素
- **ベクターレイヤー**: GeoJSONデータの描画
- **投影法**: 多様な地図投影法をサポート
- **スタイリング**: 柔軟なスタイル設定

### 主題図表現 (開発予定)
- **段階区分図 (Choropleth)**: データ値による色分け
- **比例シンボル**: データ量を円や四角の大きさで表現
- **ドット密度図**: 点の密度でデータを表現
- **フロー図**: 移動や流れを矢印で表現

### 地図装飾 (開発予定)
- **凡例**: 自動生成される凡例
- **スケールバー**: 縮尺表示
- **方位記号**: 北の方向を示す記号
- **注釈**: テキストやラベルの追加

## サポートブラウザ

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## ライセンス

ISC License

## コミュニティ

- [GitHub Issues](https://github.com/shimizu/d3-thematika/issues) - バグ報告や機能要望
- [GitHub Discussions](https://github.com/shimizu/d3-thematika/discussions) - 質問や議論
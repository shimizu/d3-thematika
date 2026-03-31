const container = document.getElementById('map');
const width = container.clientWidth;
const height = container.clientHeight;

const world = await d3.json('../site/geojson/world.geojson');
const countries = ['アメリカ合衆国', '日本', '中国', 'ロシア', 'フランス', 'ブラジル', 'イギリス', 'ガーナ', '南アフリカ共和国', 'カナダ', 'インド', 'オーストラリア'];
const geojson = {
  ...world,
  features: world.features.filter((feature) => countries.includes(feature.properties.NAME_JA))
};

const projection = d3.geoEquirectangular()
  .fitExtent([[20, 20], [width - 20, height - 20]], world);

const map = new Thematika.Map({
  container: '#map',
  width,
  height,
  backgroundColor: '#ddd',
  projection
});

const worldLayer = new Thematika.GeojsonLayer({
  data: world,
  attr: {
    fill: '#333',
    stroke: '#fff',
    'stroke-width': 0.5,
    opacity: 1
  }
});

const graticuleLayer = new Thematika.GraticuleLayer({
  step: [10, 10],
  attr: {
    fill: 'none',
    stroke: '#333',
    'stroke-width': 0.8,
    'stroke-dasharray': '2,2',
    opacity: 0.6
  }
});

const outlineLayer = new Thematika.OutlineLayer({
  createClipPath: true,
  clipPathId: 'earth-outline-clip',
  attr: {
    fill: 'none',
    stroke: '#2c3e50',
    'stroke-width': 2,
    opacity: 0.8
  }
});

const color = Thematika.AllPalettes.TailwindVivid.colors;
const textLayer = new Thematika.PointTextLayer({
  data: geojson,
  textProperty: 'NAME_JA',
  dx: 0,
  dy: 0,
  rotate: 0,
  attr: {
    fill: (d, i) => color[i % 3],
    stroke: (d, i) => color[i % 3],
    'stroke-width': 1
  },
  fontSize: '14px',
  fontWeight: 'bold',
  textAnchor: 'start',
  alignmentBaseline: 'middle'
});

map.addLayer('graticule', graticuleLayer);
map.addLayer('outline', outlineLayer);
map.addLayer('world', worldLayer);
map.addLayer('cityLabels', textLayer);

document.getElementById('download-svg').addEventListener('click', () => {
  map.saveSVG('map.svg');
});

document.getElementById('download-png').addEventListener('click', () => {
  map.savePNG('map.png');
});

console.log('レイアウト実験テンプレートを描画しました。ラベル数:', geojson.features.length);

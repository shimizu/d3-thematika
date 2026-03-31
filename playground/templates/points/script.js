const container = document.getElementById('map');
const width = container.clientWidth;
const height = container.clientHeight;

const worldData = await d3.json('../site/geojson/world.geojson');
const projection = d3.geoNaturalEarth1()
  .fitExtent([[10, 10], [width - 10, height - 10]], worldData);

const map = new Thematika.Map({
  container: '#map',
  width,
  height,
  backgroundColor: '#f9f4ea',
  projection
});

const worldLayer = new Thematika.GeojsonLayer({
  data: worldData,
  attr: {
    fill: '#333',
    stroke: '#fff',
    'stroke-width': 0.5,
    opacity: 0.8
  }
});

const graticuleLayer = new Thematika.GraticuleLayer({
  step: [20, 20],
  attr: {
    fill: 'none',
    stroke: '#333',
    'stroke-width': 0.5,
    opacity: 0.6
  }
});

const outlineLayer = new Thematika.OutlineLayer({
  attr: {
    fill: 'none',
    stroke: '#2c3e50',
    'stroke-width': 2,
    opacity: 0.8
  }
});

const circleLayer = new Thematika.PointCircleLayer({
  data: worldData,
  r: (feature, index) => {
    const population = feature.properties?.POP_EST || 0;
    return Math.min(Math.sqrt(population / 10000000) * 4 + 2, 25);
  },
  attr: {
    fill: (d, i) => i % 2 === 0 ? '#74b9ff' : '#fd79a8',
    stroke: '#d63031',
    'stroke-width': 1,
    opacity: 0.9
  }
});

map.addLayer('graticule', graticuleLayer);
map.addLayer('worldLayer', worldLayer);
map.addLayer('circles', circleLayer);
map.addLayer('outlineLayer', outlineLayer);

document.getElementById('download-svg').addEventListener('click', () => {
  map.saveSVG('map.svg');
});

document.getElementById('download-png').addEventListener('click', () => {
  map.savePNG('map.png');
});

console.log('ポイントテンプレートを描画しました。フィーチャ数:', worldData.features.length);

const container = document.getElementById('map');
const width = container.clientWidth;
const height = container.clientHeight;

const geojson = await d3.json('../site/geojson/world.geojson');

// ホルムズ海峡付近の境界 [west, south, east, north]
const imageBounds = [52.39, 24.0, 59.6, 28.01];

// 画像範囲に合わせた投影法
const projection = d3.geoMercator()
  .fitExtent([[40, 40], [width - 40, height - 40]], {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [imageBounds[0], imageBounds[1]],
        [imageBounds[0], imageBounds[3]],
        [imageBounds[2], imageBounds[3]],
        [imageBounds[2], imageBounds[1]],
        [imageBounds[0], imageBounds[1]]
      ]]
    },
    properties: {}
  });

const map = new Thematika.Map({
  container: '#map',
  width,
  height,
  backgroundColor: '#a8c8e0',
  projection
});

const imageLayer = new Thematika.ImageLayer('hormuz-image', {
  src: '../playground/data/img/hormuz.png',
  bounds: imageBounds,
  showBboxMarkers: false
});

const landLayer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: {
    fill: 'none',
    stroke: '#1e293b',
    'stroke-width': 0.5,
    opacity: 0.6
  }
});

const graticuleLayer = new Thematika.GraticuleLayer({
  step: [2, 2],
  attr: {
    fill: 'none',
    stroke: 'rgba(148, 163, 184, 0.3)',
    'stroke-width': 0.3,
    'stroke-dasharray': '2,4',
    opacity: 0.5
  }
});

map.addLayer('image', imageLayer);
map.addLayer('graticule', graticuleLayer);
map.addLayer('land', landLayer);

document.getElementById('download-svg').addEventListener('click', () => {
  map.saveSVG('hormuz-map.svg');
});

document.getElementById('download-png').addEventListener('click', () => {
  map.savePNG('hormuz-map.png');
});

console.log('ImageLayerテンプレートを描画しました');

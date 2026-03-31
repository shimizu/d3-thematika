const container = document.getElementById('map');
const width = container.clientWidth;
const height = container.clientHeight;

const geojson = await d3.json('../site/geojson/world.geojson');
const texture = Thematika.TexturePresets.lightOcean();
const projection = d3.geoEqualEarth()
  .fitExtent([[20, 20], [width - 20, height - 20]], geojson);

const map = new Thematika.Map({
  container: '#map',
  width,
  height,
  defs: [texture],
  backgroundColor: '#cde6dc',
  projection
});

const landLayer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: {
    fill: (_, index) => index % 4 === 0 ? texture.url() : '#f8f5ee',
    stroke: '#1e293b',
    'stroke-width': 0.3,
    opacity: 0.85
  }
});

const outlineLayer = new Thematika.OutlineLayer({
  createClipPath: true,
  clipPathId: 'earth-outline-clip',
  attr: {
    fill: 'none',
    stroke: 'none',
    'stroke-width': 2,
    opacity: 0.7
  }
});

const graticuleLayer = new Thematika.GraticuleLayer({
  step: [20, 20],
  attr: {
    fill: 'none',
    stroke: 'rgba(148, 163, 184, 0.4)',
    'stroke-width': 0.3,
    'stroke-dasharray': '1,3',
    opacity: 0.6
  }
});

map.addLayer('graticule', graticuleLayer);
map.addLayer('land', landLayer);
map.addLayer('outline', outlineLayer);

document.getElementById('download-svg').addEventListener('click', () => {
  map.saveSVG('map.svg');
});

document.getElementById('download-png').addEventListener('click', () => {
  map.savePNG('map.png');
});

console.log('基本テンプレートを描画しました');

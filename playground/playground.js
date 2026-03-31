const STORAGE_KEY = 'd3-thematika-playground-state';

const htmlEditor = document.getElementById('html-editor');
const cssEditor = document.getElementById('css-editor');
const jsEditor = document.getElementById('js-editor');
const consoleOutput = document.getElementById('console-output');
const previewFrame = document.getElementById('preview-frame');
const exampleSelect = document.getElementById('example-select');
const runButton = document.getElementById('run-preview');
const loadButton = document.getElementById('load-example');
const resetButton = document.getElementById('reset-state');
const clearConsoleButton = document.getElementById('clear-console');
const tabButtons = Array.from(document.querySelectorAll('.editor-tab'));
const editorPanels = Array.from(document.querySelectorAll('.editor-panel'));
const viewerTabButtons = Array.from(document.querySelectorAll('.viewer-tab'));
const viewerPanels = Array.from(document.querySelectorAll('.viewer-panel'));

const templates = {
  basic: {
    html: `<div class="map-shell">
  <div class="download-buttons">
    <button id="download-svg" type="button">SVG</button>
    <button id="download-png" type="button">PNG</button>
  </div>
  <div id="map"></div>
</div>`,
    css: `body {
  margin: 0;
  background: linear-gradient(180deg, #e7f3ef 0%, #d2e4da 100%);
  min-height: 100vh;
}

.map-shell {
  position: relative;
  min-height: 100vh;
}

.download-buttons {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.download-buttons button {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  background: rgba(255, 253, 247, 0.9);
  color: #173226;
  font: inherit;
  cursor: pointer;
}

#map {
  min-height: 100vh;
}`,
    js: `const container = document.getElementById('map');
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

console.log('基本テンプレートを描画しました');`
  },
  points: {
    html: `<div class="map-shell">
  <div class="download-buttons">
    <button id="download-svg" type="button">SVG</button>
    <button id="download-png" type="button">PNG</button>
  </div>
  <div id="map"></div>
</div>`,
    css: `body {
  margin: 0;
  background: #f7f1e8;
  min-height: 100vh;
}

.map-shell {
  position: relative;
  min-height: 100vh;
}

.download-buttons {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.download-buttons button {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  background: rgba(255, 253, 247, 0.9);
  color: #1f2a24;
  font: inherit;
  cursor: pointer;
}

#map {
  height: 100vh;
  background: #fffdf8;
}`,
    js: `const container = document.getElementById('map');
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

console.log('ポイントテンプレートを描画しました。フィーチャ数:', worldData.features.length);`
  },
  layout: {
    html: `<div class="map-shell">
  <div class="download-buttons">
    <button id="download-svg" type="button">SVG</button>
    <button id="download-png" type="button">PNG</button>
  </div>
  <div id="map"></div>
</div>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(245, 156, 66, 0.22), transparent 18rem),
    linear-gradient(135deg, #10222c 0%, #173847 55%, #234b55 100%);
}

.map-shell {
  position: relative;
  min-height: 100vh;
}

.download-buttons {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.download-buttons button {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  background: rgba(255, 248, 232, 0.9);
  color: #173847;
  font: inherit;
  cursor: pointer;
}

#map {
  height: 100vh;
  background: rgba(255, 255, 255, 0.04);
}`,
    js: `const container = document.getElementById('map');
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

console.log('レイアウト実験テンプレートを描画しました。ラベル数:', geojson.features.length);`
  }
};

function getStoredState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function setEditors(nextState) {
  htmlEditor.value = nextState.html;
  cssEditor.value = nextState.css;
  jsEditor.value = nextState.js;
}

function getEditorState() {
  return {
    html: htmlEditor.value,
    css: cssEditor.value,
    js: jsEditor.value
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...getEditorState(),
    template: exampleSelect.value
  }));
}

function loadTemplate(name) {
  const template = templates[name];
  if (!template) {
    return;
  }

  exampleSelect.value = name;
  setEditors(template);
  saveState();
  runPreview();
}

function appendConsole(message, level = 'log') {
  const prefix = level.toUpperCase().padEnd(5, ' ');
  consoleOutput.textContent += `[${prefix}] ${message}\n`;
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
  consoleOutput.textContent = '';
}

function escapeScriptContent(source) {
  return source.replace(/<\/script>/gi, '<\\/script>');
}

function buildPreviewDocument({ html, css, js }) {
  const userScript = escapeScriptContent(js);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://d3js.org/d3.v7.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/d3-geo-projection@4"><\/script>
  <script src="../dist/thematika.umd.js"><\/script>
  <style>
    html, body {
      margin: 0;
      min-height: 100%;
    }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    const send = (type, args) => {
      window.parent.postMessage({
        source: 'thematika-playground',
        type,
        message: args.map((arg) => {
          if (typeof arg === 'string') {
            return arg;
          }

          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }).join(' ')
      }, '*');
    };

    ['log', 'warn', 'error'].forEach((level) => {
      const original = console[level];
      console[level] = (...args) => {
        send(level, args);
        original.apply(console, args);
      };
    });

    window.addEventListener('error', (event) => {
      send('error', [event.message]);
    });

    window.addEventListener('unhandledrejection', (event) => {
      send('error', [event.reason?.message || String(event.reason)]);
    });

    window.d3GeoProjection = window.d3;

    (async () => {
      try {
        ${userScript}
      } catch (error) {
        console.error(error && error.stack ? error.stack : String(error));
      }
    })();
  <\/script>
</body>
</html>`;
}

function runPreview() {
  saveState();
  clearConsole();
  previewFrame.srcdoc = buildPreviewDocument(getEditorState());
}

function activatePanel(panelName) {
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelName);
  });

  editorPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === panelName);
  });
}

function activateViewerPanel(panelName) {
  viewerTabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.viewerPanel === panelName);
  });

  viewerPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.viewerPanel === panelName);
  });
}

window.addEventListener('message', (event) => {
  if (event.data?.source !== 'thematika-playground') {
    return;
  }

  appendConsole(event.data.message, event.data.type);
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => activatePanel(button.dataset.panel));
});

viewerTabButtons.forEach((button) => {
  button.addEventListener('click', () => activateViewerPanel(button.dataset.viewerPanel));
});

[htmlEditor, cssEditor, jsEditor].forEach((editor) => {
  editor.addEventListener('input', saveState);
  editor.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      runPreview();
    }
  });
});

runButton.addEventListener('click', runPreview);
loadButton.addEventListener('click', () => loadTemplate(exampleSelect.value));
clearConsoleButton.addEventListener('click', clearConsole);
resetButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  loadTemplate('basic');
});

const storedState = getStoredState();
if (storedState?.html && storedState?.css && storedState?.js) {
  exampleSelect.value = storedState.template || 'basic';
  setEditors(storedState);
  runPreview();
} else {
  loadTemplate('basic');
}

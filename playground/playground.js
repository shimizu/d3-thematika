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

let defaultTemplateId = null;

async function fetchManifest() {
  const manifest = await fetch('./templates/manifest.json').then((r) => r.json());

  manifest.forEach(({ id, label }) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    exampleSelect.appendChild(option);
  });

  defaultTemplateId = manifest[0]?.id || null;
  return manifest;
}

async function fetchTemplate(id) {
  const base = `./templates/${id}`;
  const [html, css, js] = await Promise.all([
    fetch(`${base}/index.html`).then((r) => r.text()),
    fetch(`${base}/style.css`).then((r) => r.text()),
    fetch(`${base}/script.js`).then((r) => r.text()),
  ]);
  return { html, css, js };
}

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

async function loadTemplate(name) {
  const template = await fetchTemplate(name);

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
  if (defaultTemplateId) {
    loadTemplate(defaultTemplateId);
  }
});

// 初期化
(async () => {
  await fetchManifest();

  const storedState = getStoredState();
  if (storedState?.html && storedState?.css && storedState?.js) {
    exampleSelect.value = storedState.template || defaultTemplateId;
    setEditors(storedState);
    runPreview();
  } else if (defaultTemplateId) {
    await loadTemplate(defaultTemplateId);
  }
})();

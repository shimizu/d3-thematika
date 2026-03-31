import { spawn } from 'node:child_process';

const port = 3001;
const url = `http://localhost:${port}/playground/`;

const serveProcess = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['serve', '.', '-l', String(port)],
  {
    stdio: 'inherit',
    shell: false
  }
);

function getOpenCommand(targetUrl) {
  if (process.platform === 'darwin') {
    return ['open', [targetUrl]];
  }

  if (process.platform === 'win32') {
    return ['cmd', ['/c', 'start', '', targetUrl]];
  }

  return ['xdg-open', [targetUrl]];
}

let opened = false;

function openBrowser() {
  if (opened) {
    return;
  }

  opened = true;
  const [command, args] = getOpenCommand(url);
  const browserProcess = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
    shell: false
  });

  browserProcess.unref();
}

const openTimer = setTimeout(openBrowser, 1500);

function shutdown(signal) {
  clearTimeout(openTimer);

  if (!serveProcess.killed) {
    serveProcess.kill(signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

serveProcess.on('exit', (code) => {
  clearTimeout(openTimer);
  process.exit(code ?? 0);
});

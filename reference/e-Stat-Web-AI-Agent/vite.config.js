import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 本番ビルドのindex.htmlへCSPのmetaを注入する。
// 主目的は connect-src の限定で、隔離Worker上の生成コードを含め外部の任意サーバーへ
// 到達できないようにする（plan.md §7.2「外部通信を確実に遮断」）。
// 開発時(serve)はVite/HMRがインラインmodule scriptを注入するため適用しない。
const CSP =
  "default-src 'self'; " +
  "connect-src 'self' https://api.anthropic.com https://api.e-stat.go.jp; " +
  "worker-src 'self' blob:; " +
  "img-src 'self' data: https:; " +
  "style-src 'self' 'unsafe-inline'; " +
  "base-uri 'self'; " +
  "object-src 'none'";

function cspPlugin() {
  return {
    name: "inject-csp-meta",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "</title>",
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  // 相対パスでアセットを参照させ、配置階層（サブディレクトリ）に依存せず動くようにする。
  base: "./",
  // デバッグハーネスへ http://localhost:3000/?debug=true でアクセスできるようポートを固定。
  server: { port: 3000 },
  preview: { port: 3000 },
  plugins: [react(), cspPlugin()],
});

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESMでは__dirnameが使えないため、代替実装
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// referenceフォルダのパスをプロジェクトルートからの相対パスで解決
const referenceDir = path.resolve(__dirname, '..', 'reference');

class ScreenshotTaker {
  constructor(urls) {
    if (!urls || urls.length === 0) {
      console.error('使用法: node take-screenshots.mjs <URL1> <URL2> ...');
      process.exit(1);
    }
    this.urls = urls;
    this.browser = null;
  }

  async take() {
    console.log('📸 スクリーンショット撮影を開始します');
    try {
      await this.setup();
      await this.processUrls();
    } catch (error) {
      console.error('❌ エラーが発生しました:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
      console.log('✅ 処理が完了しました');
    }
  }

  async setup() {
    await fs.mkdir(referenceDir, { recursive: true });
    console.log('🚀 Puppeteerブラウザを起動中...');
    this.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  }

  async processUrls() {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    for (const url of this.urls) {
      const filename = `screenshot_${url.replace(/https?:\/\//, '').replace(/\/$/, '').replace(/\//g, '_').replace(/\./g, '_')}.png`;
      const savePath = path.join(referenceDir, filename);

      try {
        console.log(`📄 処理中: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000)); // 描画待機
        await page.screenshot({ path: savePath, fullPage: true });
        console.log(`✅ 保存完了: ${savePath}`);
      } catch (error) {
        console.error(`❌ 失敗: ${url}`, error.message);
      }
    }
    await page.close();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 ブラウザを終了しました');
    }
  }
}

const taker = new ScreenshotTaker(process.argv.slice(2));
taker.take();
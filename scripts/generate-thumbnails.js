import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './thumbnail-config.js';

// ESMでは__dirnameが使えないため、代替実装
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ThumbnailGenerator {
  constructor() {
    this.browser = null;
    this.successCount = 0;
    this.failedPages = [];
    this.forceMode = process.argv.includes('--force');
  }

  /**
   * メイン実行関数
   */
  async generate() {
    console.log('🎨 D3-Thematika サムネイル生成開始');
    console.log(`📝 対象ページ数: ${config.pages.length}`);
    console.log(`💾 出力先: ${config.paths.thumbnails}`);
    
    try {
      await this.setup();
      await this.processAllPages();
      await this.cleanup();
      this.showResults();
    } catch (error) {
      console.error('❌ 生成処理中にエラーが発生しました:', error);
      await this.cleanup();
      process.exit(1);
    }
  }

  /**
   * 初期設定
   */
  async setup() {
    // thumbnailsディレクトリの作成
    await this.ensureDirectoryExists(config.paths.thumbnails);
    
    // ブラウザ起動
    console.log('🚀 Puppeteerブラウザを起動中...');
    this.browser = await puppeteer.launch(config.browser);
  }

  /**
   * 全ページの処理
   */
  async processAllPages() {
    const pages = config.pages.filter(page => !config.skipPages.includes(page));
    
    for (let i = 0; i < pages.length; i++) {
      const pageName = pages[i];
      const progress = `[${i + 1}/${pages.length}]`;
      
      console.log(`\n${progress} 📄 処理中: ${pageName}`);
      
      try {
        await this.processPage(pageName);
        this.successCount++;
        console.log(`✅ ${progress} 完了: ${pageName}`);
      } catch (error) {
        console.error(`❌ ${progress} 失敗: ${pageName}`, error.message);
        this.failedPages.push({ page: pageName, error: error.message });
      }
    }
  }

  /**
   * 単一ページの処理
   */
  async processPage(pageName) {
    const page = await this.browser.newPage();
    
    try {
      // ビューポート設定
      await page.setViewport({
        width: config.screenshot.width,
        height: config.screenshot.height,
        deviceScaleFactor: config.screenshot.deviceScaleFactor
      });

      // ページ固有の設定を取得
      const pageConfig = this.getPageConfig(pageName);
      
      // ページにアクセス
      const url = `${config.paths.baseURL}/${pageName}`;
      console.log(`  🌐 アクセス: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: config.wait.pageLoad 
      });

      // 初期待機
      await this.wait(pageConfig.wait.initialDelay);

      // #map要素の待機
      await this.waitForMapElement(page, pageConfig);

      // スクリーンショット撮影
      await this.takeScreenshot(page, pageName);

    } finally {
      await page.close();
    }
  }

  /**
   * #map要素の読み込み完了を待機
   */
  async waitForMapElement(page, pageConfig) {
    console.log('  ⏳ #map要素の読み込み待機中...');
    
    // #map要素の存在確認
    await page.waitForSelector('#map', { timeout: 5000 });
    
    // SVG要素の描画確認
    await page.waitForFunction(() => {
      const mapElement = document.querySelector('#map');
      return mapElement && mapElement.querySelector('svg');
    }, { timeout: 8000 });

    // 地図データの読み込み完了を待機
    await this.wait(pageConfig.wait.mapLoad);

    // SVG要素内にパスやその他の要素があるかチェック
    await page.waitForFunction(() => {
      const svg = document.querySelector('#map svg');
      if (!svg) return false;
      
      // SVG内に何かしらの描画要素があることを確認
      const paths = svg.querySelectorAll('path, circle, rect, line, text');
      return paths.length > 0;
    }, { timeout: 10000 });

    // アニメーション完了のための追加待機
    await this.wait(pageConfig.wait.animationBuffer);
    
    console.log('  ✅ #map要素の読み込み完了');
  }

  /**
   * スクリーンショット撮影
   */
  async takeScreenshot(page, pageName) {
    console.log('  📸 スクリーンショット撮影中...');
    
    // #map要素の境界を取得
    const mapElement = await page.$('#map');
    if (!mapElement) {
      throw new Error('#map要素が見つかりません');
    }

    const boundingBox = await mapElement.boundingBox();
    if (!boundingBox) {
      throw new Error('#map要素の境界を取得できません');
    }

    // 出力ファイルパス
    const fileName = pageName.replace('.html', '.png');
    const outputPath = path.join(config.paths.thumbnails, fileName);

    // 既存ファイルの確認
    if (!this.forceMode && await this.fileExists(outputPath)) {
      console.log(`  ⚠️  ファイルが既に存在します（スキップ）: ${fileName}`);
      return;
    }

    // スクリーンショット撮影（#map要素のみ）
    const screenshotOptions = {
      path: outputPath,
      type: config.screenshot.format
    };
    
    // JPEGの場合のみqualityを設定
    if (config.screenshot.format === 'jpeg') {
      screenshotOptions.quality = config.screenshot.quality || 90;
    }
    
    await mapElement.screenshot(screenshotOptions);

    console.log(`  💾 保存完了: ${fileName}`);
  }

  /**
   * ページ固有の設定を取得
   */
  getPageConfig(pageName) {
    const specific = config.pageSpecific[pageName] || {};
    return {
      wait: {
        ...config.wait,
        ...specific.wait
      }
    };
  }

  /**
   * ディレクトリ存在確認・作成
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 ディレクトリを作成しました: ${dirPath}`);
    }
  }

  /**
   * ファイル存在確認
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 待機
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 終了処理
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 ブラウザを終了しました');
    }
  }

  /**
   * 結果表示
   */
  showResults() {
    const targetPages = config.pages.filter(page => !config.skipPages.includes(page));
    const totalPages = targetPages.length;
    
    console.log('\n📊 生成結果');
    console.log(`✅ 成功: ${this.successCount}/${totalPages}`);
    
    if (this.failedPages.length > 0) {
      console.log(`❌ 失敗: ${this.failedPages.length}`);
      console.log('\n失敗したページ:');
      this.failedPages.forEach(({ page, error }) => {
        console.log(`  - ${page}: ${error}`);
      });
    }

    if (this.successCount === totalPages) {
      console.log('\n🎉 すべてのサムネイル生成が完了しました！');
    } else if (this.failedPages.length > 0) {
      console.log('\n⚠️  一部のページで生成に失敗しました。上記を確認してください。');
    } else {
      console.log('\n✅ 処理が完了しました。');
    }
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ThumbnailGenerator();
  generator.generate().catch(error => {
    console.error('💥 予期しないエラーが発生しました:', error);
    process.exit(1);
  });
}

export default ThumbnailGenerator;
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESMでは__dirnameが使えないため、代替実装
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * demoPages用のファイルを構築するスクリプト
 * examples/とdist/thematika.umd.jsをdemoPagesにコピーします
 */

const sourceExamplesDir = path.join(__dirname, '../examples');
const sourceDistFile = path.join(__dirname, '../dist/thematika.umd.js');
const targetDir = path.join(__dirname, '../demoPages');

/**
 * ディレクトリを再帰的にコピーする関数
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * ファイルをコピーする関数
 */
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

console.log('🚀 Building demo pages...');

try {
  // demoPages ディレクトリをクリア（存在する場合）
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // examples/ の全ファイルをコピー
  console.log('📁 Copying examples directory...');
  copyDirectory(sourceExamplesDir, targetDir);

  // dist/thematika.umd.js をコピー
  console.log('📦 Copying thematika.umd.js...');
  const targetDistFile = path.join(targetDir, 'thematika.umd.js');
  copyFile(sourceDistFile, targetDistFile);

  // index.htmlのパス調整（必要に応じて）
  const indexPath = path.join(targetDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    // 相対パスの調整（./thematika.umd.jsに変更）
    content = content.replace('./thematika.umd.js', './thematika.umd.js');
    fs.writeFileSync(indexPath, content);
    console.log('📝 Updated index.html paths');
  }

  console.log('✅ Demo pages build completed!');
  console.log(`📍 Demo files are ready in: ${targetDir}`);

} catch (error) {
  console.error('❌ Error building demo pages:', error);
  process.exit(1);
}

console.log('\n🌐 Ready to deploy with: npm run deploy');
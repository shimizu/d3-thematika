#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * demoPages用のファイルを構築するスクリプト
 * examples/とdist/cartography.umd.jsをdemoPagesにコピーします
 */

const sourceExamplesDir = path.join(__dirname, '../examples');
const sourceDistFile = path.join(__dirname, '../dist/cartography.umd.js');
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

  // dist/cartography.umd.js をコピー
  console.log('📦 Copying cartography.umd.js...');
  const targetDistFile = path.join(targetDir, 'cartography.umd.js');
  copyFile(sourceDistFile, targetDistFile);

  // index.htmlのパス調整（必要に応じて）
  const indexPath = path.join(targetDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    // 相対パスの調整（./cartography.umd.jsに変更）
    content = content.replace('./cartography.umd.js', './cartography.umd.js');
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
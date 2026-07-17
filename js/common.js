/**
 * d3-thematika Examples - Common JavaScript Functions
 * 各exampleページで共通して使用される機能を提供
 */

/**
 * ナビゲーションバーのスクロール処理を設定
 */
function setupNavbarScrollHandler() {
    window.addEventListener('scroll', function() {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

/**
 * コードコピー機能を設定
 * @param {string} codeElementId - コピー対象の要素ID（デフォルト: 'sample-code'）
 * @param {string} buttonSelector - コピーボタンのセレクター（デフォルト: '.copy-button'）
 */
function setupCodeCopyHandler(codeElementId = 'sample-code', buttonSelector = '.copy-button') {
    // グローバルに利用可能なcopyCode関数を定義
    window.copyCode = function() {
        const codeElement = document.getElementById(codeElementId);
        if (!codeElement) return;
        
        const textArea = document.createElement('textarea');
        textArea.value = codeElement.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // フィードバック
        const button = document.querySelector(buttonSelector);
        if (button) {
            const originalText = button.textContent;
            button.textContent = 'コピーしました！';
            button.style.background = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        }
    };
}

/**
 * リサイズハンドラーを設定
 * @param {Function} callback - リサイズ時に実行するコールバック関数
 * @param {number} delay - デバウンスの遅延時間（ms）
 */
function setupResizeHandler(callback, delay = 250) {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (typeof callback === 'function') {
                callback();
            }
        }, delay);
    });
}

/**
 * スライダー要素の値表示を更新
 * @param {string} sliderId - スライダーのID
 * @param {string} displayId - 値表示要素のID
 * @param {string} unit - 単位（オプション）
 */
function updateSliderDisplay(sliderId, displayId, unit = '') {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    
    if (slider && display) {
        const updateValue = () => {
            display.textContent = slider.value + unit;
        };
        
        // 初期値設定
        updateValue();
        
        // イベントリスナー設定
        slider.addEventListener('input', updateValue);
        
        return updateValue;
    }
}

/**
 * 初期化用のヘルパー関数
 * 各exampleページで共通の初期化処理を実行
 */
function initializeCommonFeatures() {
    // DOM読み込み完了後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setupNavbarScrollHandler();
            setupCodeCopyHandler();
        });
    } else {
        setupNavbarScrollHandler();
        setupCodeCopyHandler();
    }
}

// 自動初期化（オプション）
// initializeCommonFeatures();

// コードコピー機能
function copyCode() {
    const codeElement = document.getElementById('sample-code');
    const textArea = document.createElement('textarea');
    textArea.value = codeElement.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // フィードバック
    const button = document.querySelector('.copy-button');
    const originalText = button.textContent;
    button.textContent = 'コピーしました！';
    button.style.background = '#10b981';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
    }, 2000);
}

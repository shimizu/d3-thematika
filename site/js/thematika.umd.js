
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-selection'), require('d3-geo'), require('d3-shape'), require('d3-force')) :
    typeof define === 'function' && define.amd ? define(['exports', 'd3-selection', 'd3-geo', 'd3-shape', 'd3-force'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Thematika = {}, global.d3, global.d3, global.d3, global.d3));
})(this, (function (exports, d3Selection, d3Geo, d3Shape, d3Force) { 'use strict';

    /**
     * レイヤーの管理を担当するクラス
     * レイヤーの追加、削除、更新、並び替えを行います
     */
    class LayerManager {
        /**
         * レイヤーマネージャーを初期化します
         */
        constructor() {
            /** レイヤーインスタンスを管理するマップ */
            this.layerInstances = new Map();
            // レイヤーマネージャーの初期化
        }
        /**
         * SVGコンテナと投影法を設定します
         * @param svgContainer - SVGコンテナ
         * @param projection - 投影法
         */
        setContext(svgContainer, projection) {
            this.svgContainer = svgContainer;
            this.projection = projection;
        }
        /**
         * レイヤーインスタンスを追加します
         * @param id - レイヤーの一意識別子
         * @param layerInstance - レイヤーインスタンス
         */
        addLayer(id, layerInstance) {
            if (!this.svgContainer) {
                throw new Error('SVG container not set. Call setContext() first.');
            }
            // 投影法をレイヤーに設定（GeojsonLayerの場合）
            if (this.projection && this.isGeojsonLayer(layerInstance)) {
                layerInstance.setProjection(this.projection);
            }
            // zIndexを設定
            layerInstance.zIndex = this.getNextZIndex();
            // レイヤーを描画
            layerInstance.render(this.svgContainer);
            // レイヤーを管理に追加
            this.layerInstances.set(id, layerInstance);
        }
        /**
         * レイヤーを削除します
         * @param id - 削除するレイヤーのID
         */
        removeLayer(id) {
            const layerInstance = this.layerInstances.get(id);
            if (layerInstance) {
                layerInstance.destroy();
                this.layerInstances.delete(id);
            }
        }
        /**
         * レイヤーの表示/非表示を切り替えます
         * @param id - 切り替えるレイヤーのID
         * @param visible - 表示状態
         */
        setLayerVisibility(id, visible) {
            const layerInstance = this.layerInstances.get(id);
            if (layerInstance) {
                layerInstance.setVisible(visible);
            }
        }
        /**
         * レイヤーの描画順序を変更します
         * @param id - 並び替えるレイヤーのID
         * @param zIndex - 新しいzIndex値
         */
        setLayerZIndex(id, zIndex) {
            const layerInstance = this.layerInstances.get(id);
            if (layerInstance) {
                const oldZIndex = layerInstance.zIndex;
                layerInstance.setZIndex(zIndex);
                // zIndexが変更された場合のみ再配置
                if (oldZIndex !== zIndex) {
                    this.reorderLayersOptimized();
                }
            }
        }
        /**
         * 指定されたレイヤーを取得します
         * @param id - レイヤーのID
         * @returns レイヤーインスタンス
         */
        getLayer(id) {
            return this.layerInstances.get(id);
        }
        /**
         * 全レイヤーのIDリストを取得します
         * @returns レイヤーIDの配列
         */
        getLayerIds() {
            return Array.from(this.layerInstances.keys());
        }
        /**
         * 全レイヤーを削除します
         */
        clearAllLayers() {
            this.layerInstances.forEach(layer => layer.destroy());
            this.layerInstances.clear();
        }
        /**
         * 全レイヤーを再描画します
         */
        rerenderAllLayers() {
            if (this.svgContainer) {
                const sortedInstances = Array.from(this.layerInstances.values())
                    .sort((a, b) => a.zIndex - b.zIndex);
                sortedInstances.forEach(layer => {
                    layer.destroy();
                    if (this.projection && this.isGeojsonLayer(layer)) {
                        layer.setProjection(this.projection);
                    }
                    layer.render(this.svgContainer);
                });
            }
        }
        /**
         * レイヤーの描画順序を最適化された方法で再整理します
         * 再描画せずにDOM要素の順序のみを変更します
         * @private
         */
        reorderLayersOptimized() {
            // レイヤー要素を収集
            const allElements = [];
            // レイヤーインスタンス要素を追加
            Array.from(this.layerInstances.values())
                .filter(layer => layer.isRendered())
                .forEach(layer => {
                const element = this.getLayerElement(layer);
                if (element) {
                    allElements.push({ element, zIndex: layer.zIndex });
                }
            });
            if (allElements.length === 0)
                return;
            // zIndexでソート
            allElements.sort((a, b) => a.zIndex - b.zIndex);
            // 最初の要素の親コンテナを取得
            const container = allElements[0].element.parentNode;
            if (!container)
                return;
            // zIndex順に要素を再配置
            allElements.forEach(({ element }) => {
                container.appendChild(element);
            });
        }
        /**
         * 投影法を更新します
         * @param projection - 新しい投影法
         */
        updateProjection(projection) {
            this.projection = projection;
            // レイヤーインスタンスの投影法を更新
            this.layerInstances.forEach(layer => {
                if (this.isGeojsonLayer(layer)) {
                    layer.setProjection(projection);
                }
            });
        }
        /**
         * 次に使用するzIndex値を取得します
         * @private
         * @returns 次のzIndex値
         */
        getNextZIndex() {
            if (this.layerInstances.size === 0)
                return 0;
            const maxZIndex = Math.max(...Array.from(this.layerInstances.values()).map(layer => layer.zIndex));
            return maxZIndex + 1;
        }
        /**
         * レイヤーがIGeojsonLayerインターフェースを実装しているか確認します
         * @private
         * @param layer - 確認するレイヤー
         * @returns IGeojsonLayerの場合true
         */
        isGeojsonLayer(layer) {
            return 'setProjection' in layer;
        }
        /**
         * レイヤーのSVG要素を取得します
         * @private
         * @param layer - 対象のレイヤー
         * @returns SVG要素またはundefined
         */
        getLayerElement(layer) {
            // BaseLayerを使用している場合、elementプロパティにアクセス
            if ('element' in layer) {
                return layer.element;
            }
            return undefined;
        }
    }

    /* -----------------------------------------------------------------------------
     * 基本ユーティリティ
     * ---------------------------------------------------------------------------*/
    /** フィルターの参照URL（CSS filter 用） */
    function getFilterUrl(filterId) {
        return `url(#${filterId})`;
    }
    /** 複数フィルターの連鎖適用（filter プロパティ値を生成） */
    function chainFilters(filterIds) {
        return filterIds.map(id => `url(#${id})`).join(' ');
    }
    /** 任意のフィルターXMLを挿入（高度なカスタム用） */
    function createCustomFilter(id, filterContent) {
        return (defs) => {
            defs.append('filter').attr('id', id).html(filterContent);
        };
    }
    /* -----------------------------------------------------------------------------
     * 各種 フィルター ファクトリ
     * ---------------------------------------------------------------------------*/
    /** GaussianBlur */
    function createGaussianBlur(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            if (options.x)
                filter.attr('x', options.x);
            if (options.y)
                filter.attr('y', options.y);
            if (options.width)
                filter.attr('width', options.width);
            if (options.height)
                filter.attr('height', options.height);
            filter.append('feGaussianBlur').attr('stdDeviation', options.stdDeviation);
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** DropShadow（feDropShadow版。色/不透明を指定可） */
    function createDropShadow(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            if (options.x)
                filter.attr('x', options.x);
            if (options.y)
                filter.attr('y', options.y);
            if (options.width)
                filter.attr('width', options.width);
            if (options.height)
                filter.attr('height', options.height);
            const ds = filter
                .append('feDropShadow')
                .attr('dx', options.dx)
                .attr('dy', options.dy)
                .attr('stdDeviation', options.stdDeviation);
            if (options.floodColor)
                ds.attr('flood-color', options.floodColor);
            if (options.floodOpacity !== undefined)
                ds.attr('flood-opacity', options.floodOpacity);
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** Bloom（閾値で明部のみをぼかして合成。着色も可） */
    function createBloom(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            filter
                .attr('x', options.x ?? '-50%')
                .attr('y', options.y ?? '-50%')
                .attr('width', options.width ?? '200%')
                .attr('height', options.height ?? '200%');
            // 明度閾値（0..1を仮定し、オフセットで近似）
            if (options.threshold !== undefined) {
                const t = options.threshold;
                // BT.709 係数で輝度→オフセット閾
                const mat = [
                    0.2126, 0.7152, 0.0722, 0, t,
                    0.2126, 0.7152, 0.0722, 0, t,
                    0.2126, 0.7152, 0.0722, 0, t,
                    0, 0, 0, 1, 0
                ].join(' ');
                filter.append('feColorMatrix').attr('values', mat).attr('result', 'bright');
            }
            // ぼかし
            filter
                .append('feGaussianBlur')
                .attr('in', options.threshold !== undefined ? 'bright' : 'SourceGraphic')
                .attr('stdDeviation', options.intensity)
                .attr('result', 'bloom');
            // 着色（任意）
            if (options.color) {
                filter.append('feFlood').attr('flood-color', options.color).attr('result', 'color');
                filter
                    .append('feComposite')
                    .attr('in', 'color')
                    .attr('in2', 'bloom')
                    .attr('operator', 'in')
                    .attr('result', 'coloredBloom');
            }
            // 元と合成
            filter
                .append('feMerge')
                .selectAll('feMergeNode')
                .data(['SourceGraphic', options.color ? 'coloredBloom' : 'bloom'])
                .enter()
                .append('feMergeNode')
                .attr('in', d => d);
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** ColorMatrix（彩度/色相/モノクロ等） */
    function createColorMatrix(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            if (options.x)
                filter.attr('x', options.x);
            if (options.y)
                filter.attr('y', options.y);
            if (options.width)
                filter.attr('width', options.width);
            if (options.height)
                filter.attr('height', options.height);
            const cm = filter.append('feColorMatrix').attr('type', options.type);
            if (options.values !== undefined)
                cm.attr('values', options.values);
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** Glow（外側発光：アルファをぼかして着色→合成） */
    function createGlow(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            filter
                .attr('x', options.x ?? '-50%')
                .attr('y', options.y ?? '-50%')
                .attr('width', options.width ?? '200%')
                .attr('height', options.height ?? '200%');
            filter
                .append('feGaussianBlur')
                .attr('in', 'SourceAlpha')
                .attr('stdDeviation', options.stdDeviation)
                .attr('result', 'blur');
            filter
                .append('feFlood')
                .attr('flood-color', options.color ?? '#00f')
                .attr('flood-opacity', options.opacity ?? 0.7)
                .attr('result', 'flood');
            filter
                .append('feComposite')
                .attr('in', 'flood')
                .attr('in2', 'blur')
                .attr('operator', 'in')
                .attr('result', 'glow');
            filter
                .append('feMerge')
                .selectAll('feMergeNode')
                .data(['SourceGraphic', 'glow'])
                .enter()
                .append('feMergeNode')
                .attr('in', d => d);
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** EdgeDetect（輪郭抽出：3x3 Laplacian） */
    function createEdgeDetect(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            if (options.x)
                filter.attr('x', options.x);
            if (options.y)
                filter.attr('y', options.y);
            if (options.width)
                filter.attr('width', options.width);
            if (options.height)
                filter.attr('height', options.height);
            filter
                .append('feConvolveMatrix')
                .attr('order', '3')
                .attr('kernelMatrix', '-1 -1 -1 -1 8 -1 -1 -1 -1')
                .attr('preserveAlpha', 'true');
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** Sharpen（シャープン：3x3アンシャープマスクカーネル） */
    function createSharpen(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            if (options.x)
                filter.attr('x', options.x);
            if (options.y)
                filter.attr('y', options.y);
            if (options.width)
                filter.attr('width', options.width);
            if (options.height)
                filter.attr('height', options.height);
            const a = options.amount ?? 1;
            // 3x3 シャープンカーネル: center = 1 + 4a, neighbors = -a
            const kernel = [
                0, -a, 0,
                -a, 1 + 4 * a, -a,
                0, -a, 0
            ].join(' ');
            filter
                .append('feConvolveMatrix')
                .attr('order', '3')
                .attr('kernelMatrix', kernel)
                .attr('preserveAlpha', 'true');
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** Emboss（エンボス：方向付き3x3カーネル＋グレー化合成） */
    function createEmboss(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            if (options.x)
                filter.attr('x', options.x);
            if (options.y)
                filter.attr('y', options.y);
            if (options.width)
                filter.attr('width', options.width);
            if (options.height)
                filter.attr('height', options.height);
            const s = options.strength ?? 1;
            // 方向別エンボスカーネル
            const kernels = {
                topLeft: [-2 * s, -s, 0, -s, 1, s, 0, s, 2 * s],
                top: [-s, -2 * s, -s, 0, 1, 0, s, 2 * s, s],
                topRight: [0, -s, -2 * s, s, 1, -s, 2 * s, s, 0],
                left: [-2 * s, -s, 0, -s, 1, s, 0, s, 2 * s],
                right: [0, s, 2 * s, -s, 1, s, -2 * s, -s, 0],
                bottomLeft: [0, s, 2 * s, -s, 1, s, -2 * s, -s, 0],
                bottom: [s, 2 * s, s, 0, 1, 0, -s, -2 * s, -s],
                bottomRight: [2 * s, s, 0, s, 1, -s, 0, -s, -2 * s]
            };
            const kernel = (kernels[options.angle ?? 'topLeft']).join(' ');
            filter
                .append('feConvolveMatrix')
                .attr('order', '3')
                .attr('kernelMatrix', kernel)
                .attr('preserveAlpha', 'true');
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** InnerShadow（内側影：アルファをオフセット＆ブラー→反転合成） */
    function createInnerShadow(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            filter
                .attr('x', options.x ?? '-50%')
                .attr('y', options.y ?? '-50%')
                .attr('width', options.width ?? '200%')
                .attr('height', options.height ?? '200%');
            // 影の生成
            filter.append('feOffset')
                .attr('in', 'SourceAlpha')
                .attr('dx', options.dx)
                .attr('dy', options.dy)
                .attr('result', 'offA');
            filter.append('feGaussianBlur')
                .attr('in', 'offA')
                .attr('stdDeviation', options.stdDeviation)
                .attr('result', 'blur');
            filter.append('feComposite')
                .attr('in', 'blur')
                .attr('in2', 'SourceAlpha')
                .attr('operator', 'arithmetic')
                .attr('k2', '-1') // inner = blur * (1 - alpha)
                .attr('k3', '1')
                .attr('result', 'inner');
            filter.append('feFlood')
                .attr('flood-color', options.color ?? '#000')
                .attr('flood-opacity', options.opacity ?? 0.6)
                .attr('result', 'color');
            filter.append('feComposite')
                .attr('in', 'color')
                .attr('in2', 'inner')
                .attr('operator', 'in')
                .attr('result', 'innerColor');
            filter.append('feComposite')
                .attr('in', 'SourceGraphic')
                .attr('in2', 'innerColor')
                .attr('operator', 'over');
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** Outline（モルフォロジー膨張で外枠→着色合成） */
    function createOutline(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            filter
                .attr('x', options.x ?? '-50%')
                .attr('y', options.y ?? '-50%')
                .attr('width', options.width ?? '200%')
                .attr('height', options.height ?? '200%');
            filter
                .append('feMorphology')
                .attr('in', 'SourceAlpha')
                .attr('operator', 'dilate')
                .attr('radius', options.radius)
                .attr('result', 'dilated');
            filter
                .append('feComposite')
                .attr('in', 'dilated')
                .attr('in2', 'SourceAlpha')
                .attr('operator', 'out')
                .attr('result', 'stroke'); // 外側の輪っかだけ抽出
            filter.append('feFlood')
                .attr('flood-color', options.color ?? '#000')
                .attr('flood-opacity', options.opacity ?? 1)
                .attr('result', 'strokeColor');
            filter.append('feComposite')
                .attr('in', 'strokeColor')
                .attr('in2', 'stroke')
                .attr('operator', 'in')
                .attr('result', 'coloredStroke');
            filter
                .append('feMerge')
                .selectAll('feMergeNode')
                .data(['SourceGraphic', 'coloredStroke'])
                .enter()
                .append('feMergeNode')
                .attr('in', d => d);
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /** Noise / Film Grain（タービュランス＋スクリーン合成） */
    function createNoise(options) {
        const fn = (defs) => {
            const filter = defs.append('filter').attr('id', options.id);
            filter
                .attr('x', options.x ?? '-20%')
                .attr('y', options.y ?? '-20%')
                .attr('width', options.width ?? '140%')
                .attr('height', options.height ?? '140%');
            filter
                .append('feTurbulence')
                .attr('type', 'fractalNoise')
                .attr('baseFrequency', options.baseFrequency ?? 0.8)
                .attr('numOctaves', options.numOctaves ?? 1)
                .attr('result', 'noise');
            // コントラストを少し上げて粒状感を強調
            filter
                .append('feColorMatrix')
                .attr('in', 'noise')
                .attr('type', 'matrix')
                .attr('values', [
                1.2, 0, 0, 0, -0.1,
                0, 1.2, 0, 0, -0.1,
                0, 0, 1.2, 0, -0.1,
                0, 0, 0, 1, 0
            ].join(' '))
                .attr('result', 'grain');
            // スクリーン合成（明るい粒子を足す）
            filter
                .append('feBlend')
                .attr('in', 'SourceGraphic')
                .attr('in2', 'grain')
                .attr('mode', 'screen')
                .attr('result', 'screened');
            // 全体の不透明度を制御
            filter
                .append('feComponentTransfer')
                .attr('in', 'screened')
                .append('feFuncA')
                .attr('type', 'linear')
                .attr('slope', options.opacity ?? 0.15);
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /* -----------------------------------------------------------------------------
     * クリップパス（GeoJSON）
     * ---------------------------------------------------------------------------*/
    function createClipPolygon(options) {
        const fn = (defs) => {
            const path = d3Geo.geoPath(options.projection);
            const clipPath = defs.append('clipPath').attr('id', options.id);
            if (options.polygon.type === 'FeatureCollection') {
                const fc = options.polygon;
                fc.features.forEach((feature, index) => {
                    const d = path(feature);
                    if (d)
                        clipPath.append('path').attr('d', d).attr('class', `clip-path-${index}`);
                });
            }
            else {
                const feat = options.polygon;
                const d = path(feat);
                if (d)
                    clipPath.append('path').attr('d', d);
            }
        };
        fn.url = () => getFilterUrl(options.id);
        return fn;
    }
    /* -----------------------------------------------------------------------------
     * Webフォント
     * ---------------------------------------------------------------------------*/
    /** Webフォント読み込み用の@importスタイルをSVGのdefs内に追加する */
    function createWebFont(options) {
        return (svg) => {
            let defs = svg.select('defs');
            if (defs.empty()) {
                defs = svg.append('defs');
            }
            defs.append('style')
                .attr('type', 'text/css')
                .text(`@import url('${options.url}');`);
        };
    }
    const WebFontPresets = {
        /** Noto Sans JP + Roboto */
        default: () => createWebFont({
            url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap'
        }),
    };
    /* -----------------------------------------------------------------------------
     * プリセット
     * ---------------------------------------------------------------------------*/
    const FilterPresets = {
        /* 既存互換 */
        lightBlur: () => createGaussianBlur({ id: 'lightBlur', stdDeviation: 2 }),
        strongBlur: () => createGaussianBlur({ id: 'strongBlur', stdDeviation: 8 }),
        standardDropShadow: () => createDropShadow({
            id: 'standardDropShadow',
            dx: 2,
            dy: 2,
            stdDeviation: 2,
            floodColor: '#000000',
            floodOpacity: 0.8
        }),
        softDropShadow: () => createDropShadow({
            id: 'softDropShadow',
            dx: 2,
            dy: 2,
            stdDeviation: 4,
            floodColor: '#000000',
            floodOpacity: 0.2
        }),
        standardBloom: () => createBloom({ id: 'standardBloom', intensity: 4, threshold: 0.8 }),
        strongBloom: () => createBloom({ id: 'strongBloom', intensity: 8, threshold: 0.6, color: '#ffffff' }),
        /* 新規 */
        grayscale: () => createColorMatrix({ id: 'grayscale', type: 'saturate', values: '0' }),
        hueRotate60: () => createColorMatrix({ id: 'hueRotate60', type: 'hueRotate', values: '60' }),
        sepia: () => createColorMatrix({
            id: 'sepia',
            type: 'matrix',
            // 標準的なセピア行列（軽め）
            values: [
                0.393, 0.769, 0.189, 0, 0,
                0.349, 0.686, 0.168, 0, 0,
                0.272, 0.534, 0.131, 0, 0,
                0, 0, 0, 1, 0
            ].join(' ')
        }),
        blueGlow: () => createGlow({ id: 'blueGlow', color: '#00ffff', stdDeviation: 4, opacity: 0.8 }),
        neonMagenta: () => createGlow({ id: 'neonMagenta', color: '#ff00ff', stdDeviation: 5, opacity: 0.9 }),
        edgeDetect: () => createEdgeDetect({ id: 'edgeDetect' }),
        softInnerShadow: () => createInnerShadow({ id: 'softInnerShadow', dx: 1, dy: 1, stdDeviation: 2, opacity: 0.4 }),
        outlineThin: () => createOutline({ id: 'outlineThin', radius: 1, color: '#000', opacity: 0.9 }),
        outlineThick: () => createOutline({ id: 'outlineThick', radius: 2.5, color: '#000', opacity: 0.9 }),
        filmGrain: () => createNoise({ id: 'filmGrain', baseFrequency: 0.9, numOctaves: 1, opacity: 0.12 }),
        warmBloom: () => createBloom({ id: 'warmBloom', intensity: 5, threshold: 0.7, color: '#ffd1a3' }),
        sharpen: () => createSharpen({ id: 'sharpen', amount: 1 }),
        strongSharpen: () => createSharpen({ id: 'strongSharpen', amount: 2 }),
        emboss: () => createEmboss({ id: 'emboss', strength: 1, angle: 'topLeft' }),
        softEmboss: () => createEmboss({ id: 'softEmboss', strength: 0.5, angle: 'top' })
    };

    /**
     * 主題図描画を行うメインクラス（リファクタリング版）
     * モジュール化された構造で、拡張性と保守性を向上させています
     */
    let Map$1 = class Map {
        /**
         * Mapインスタンスを作成します
         * @param options - 主題図の設定オプション
         */
        constructor(options) {
            this.width = options.width;
            this.height = options.height;
            // コンテナを選択
            this.container = d3Selection.select(options.container);
            if (this.container.empty()) {
                throw new Error(`Container not found: ${options.container}`);
            }
            // すでにSVGが存在する場合は削除
            this.container.selectAll('svg.thematika-map').remove();
            // SVG要素を作成
            this.svg = this.container
                .append('svg')
                .attr('width', "100%")
                .attr('height', "100%")
                .attr('class', 'thematika-map')
                .attr("viewBox", `0 0 ${this.width} ${this.height}`)
                .attr("preserveAspectRatio", "xMidYMid meet");
            // SVG全体の背景rectを追加（clipPathの影響を受けない）
            if (options.svgBackgroundColor) {
                this.svg.append('rect')
                    .attr('width', this.width)
                    .attr('height', this.height)
                    .attr('fill', options.svgBackgroundColor)
                    .attr('class', 'thematika-svg-background');
            }
            // デフォルトWebフォントを読み込み
            if (options.webFont !== false) {
                this.svg.call(WebFontPresets.default());
            }
            // defsオプションが指定されている場合、テクスチャを初期化
            this.initializeDefs(options.defs);
            // メインのSVGグループを作成
            this.svgGroup = this.svg.append('g')
                .attr('class', 'thematika-main-group');
            //svg 背景rectを追加
            this.svgGroup.append('rect')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('fill', options.backgroundColor || '#ffffff')
                .attr('class', 'thematika-background');
            // 投影法を設定
            this.projection = options.projection;
            // レイヤーマネージャーを初期化
            this.layerManager = new LayerManager();
            this.layerManager.setContext(this.svgGroup, this.projection);
        }
        /**
         * 主題図にレイヤーを追加します
         * @param id - レイヤーの一意識別子
         * @param layer - レイヤーインスタンス
         */
        addLayer(id, layer) {
            this.layerManager.addLayer(id, layer);
        }
        /**
         * 指定されたIDのレイヤーを削除します
         * @param id - 削除するレイヤーのID
         */
        removeLayer(id) {
            this.layerManager.removeLayer(id);
        }
        /**
         * レイヤーの表示/非表示を切り替えます
         * @param id - 切り替えるレイヤーのID
         * @param visible - 表示状態
         */
        setLayerVisibility(id, visible) {
            this.layerManager.setLayerVisibility(id, visible);
        }
        /**
         * レイヤーの描画順序を変更します
         * @param id - 並び替えるレイヤーのID
         * @param zIndex - 新しいzIndex値
         */
        setLayerZIndex(id, zIndex) {
            this.layerManager.setLayerZIndex(id, zIndex);
        }
        /**
         * 地図の投影法を変更します
         * @param projection - 新しい投影法オブジェクト
         */
        setProjection(projection) {
            this.projection = projection;
            // レイヤーマネージャーの投影法を更新
            this.layerManager.updateProjection(this.projection);
            // 全レイヤーを再描画
            this.layerManager.rerenderAllLayers();
        }
        /**
         * 地図のサイズを変更します
         * @param width - 新しい幅
         * @param height - 新しい高さ
         */
        resize(width, height) {
            this.width = width;
            this.height = height;
            // SVGのサイズを更新
            this.svg
                .attr('width', width)
                .attr('height', height);
            // 投影法のサイズを更新（必要に応じて）
            // 注意: 多くのD3投影法はsize/scaleの再設定が必要な場合があります
            // レイヤーマネージャーの投影法を更新
            this.layerManager.updateProjection(this.projection);
            // 全レイヤーを再描画
            this.layerManager.rerenderAllLayers();
        }
        /**
         * 地図を指定された境界にフィットさせます
         * @param bounds - 境界ボックス [minLng, minLat, maxLng, maxLat]
         * @param padding - パディング（ピクセル）
         */
        fitBounds(bounds, padding = 20) {
            const [[x0, y0], [x1, y1]] = this.projection.invert ? [
                this.projection([bounds[0], bounds[3]]),
                this.projection([bounds[2], bounds[1]])
            ] : [[0, 0], [this.width, this.height]];
            const scale = Math.min((this.width - padding * 2) / Math.abs(x1 - x0), (this.height - padding * 2) / Math.abs(y1 - y0));
            const translate = [
                this.width / 2 - scale * (x0 + x1) / 2,
                this.height / 2 - scale * (y0 + y1) / 2
            ];
            this.projection.scale(scale).translate(translate);
            this.layerManager.updateProjection(this.projection);
            this.layerManager.rerenderAllLayers();
        }
        /**
         * 全レイヤーを削除します
         */
        clearAllLayers() {
            this.layerManager.clearAllLayers();
        }
        /**
         * 地図のSVG要素を取得します
         * @returns 地図が描画されているSVG要素
         */
        getSVG() {
            return this.svg.node();
        }
        /**
         * 現在の投影法を取得します
         * @returns 現在使用されている投影法オブジェクト
         */
        getProjection() {
            return this.projection;
        }
        /**
         * レイヤーマネージャーを取得します
         * @returns レイヤーマネージャーインスタンス
         */
        getLayerManager() {
            return this.layerManager;
        }
        /**
         * 地図のサイズを取得します
         * @returns [width, height]
         */
        getSize() {
            return [this.width, this.height];
        }
        /**
         * 全レイヤーのIDリストを取得します
         * @returns レイヤーIDの配列
         */
        getLayerIds() {
            return this.layerManager.getLayerIds();
        }
        /**
         * 地図をSVGファイルとしてダウンロードします
         * @param filename - ダウンロードするファイル名（拡張子なし）
         */
        saveSVG(filename) {
            const svgElement = this.svg.node();
            if (!svgElement) {
                throw new Error('SVG要素が見つかりません');
            }
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        /**
         * 地図をPNGファイルとしてダウンロードします
         * @param filename - ダウンロードするファイル名（拡張子なし）
         */
        savePNG(filename) {
            const svgElement = this.svg.node();
            if (!svgElement) {
                throw new Error('SVG要素が見つかりません');
            }
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Canvas 2Dコンテキストを取得できません');
            }
            const img = new Image();
            // SVGのサイズを取得
            const svgRect = svgElement.getBoundingClientRect();
            canvas.width = svgRect.width || this.width;
            canvas.height = svgRect.height || this.height;
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (!blob) {
                        throw new Error('PNG Blobの生成に失敗しました');
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${filename}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
            };
            img.onerror = () => {
                throw new Error('画像の読み込みに失敗しました');
            };
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            img.src = url;
        }
        /**
         * defs要素を初期化します（初期化時の内部メソッド）
         * @private
         */
        initializeDefs(defs) {
            if (!defs)
                return;
            // 配列の各要素を順番に適用
            defs.forEach(def => {
                this.svg.call(def);
            });
        }
    };

    /**
     * 全レイヤーの基底となる抽象クラス
     * 共通の機能と振る舞いを定義します
     */
    class BaseLayer {
        /**
         * 基底レイヤーを初期化します
         * @param id - レイヤーの一意識別子
         * @param attr - レイヤーのSVG属性設定
         * @param style - レイヤーのCSS style属性設定（オプション）
         */
        constructor(id, attr = {}, style) {
            /** レイヤーの表示状態 */
            this.visible = true;
            /** レイヤーの描画順序 */
            this.zIndex = 0;
            this.id = id;
            this.attr = {
                fill: '#cccccc',
                stroke: '#333333',
                strokeWidth: 0.5,
                opacity: 1,
                ...attr
            };
            this.style = style;
        }
        /**
         * レイヤーを削除します
         */
        destroy() {
            if (this.element) {
                this.element.remove();
                this.element = undefined;
            }
        }
        /**
         * 表示状態を設定します
         * @param visible - 表示状態
         */
        setVisible(visible) {
            this.visible = visible;
            this.updateVisibility();
        }
        /**
         * 描画順序を設定します
         * @param zIndex - 新しいzIndex値
         */
        setZIndex(zIndex) {
            this.zIndex = zIndex;
        }
        /**
         * レイヤーが描画されているかを確認します
         * @returns 描画状態
         */
        isRendered() {
            return this.element !== undefined;
        }
        /**
         * レイヤーのD3セレクションを取得します
         * @returns レイヤーグループのD3セレクション、未描画の場合はnull
         */
        getLayerGroup() {
            if (!this.element)
                return null;
            return d3Selection.select(this.element);
        }
        /**
         * 表示状態を更新します
         * @protected
         */
        updateVisibility() {
            if (!this.element)
                return;
            // d3-selectionでelementをラップして適切なD3セレクションを作成
            const container = d3Selection.select(this.element);
            container.style('display', this.visible ? '' : 'none');
        }
        /**
         * レイヤーグループ要素を作成します
         * @param container - 親コンテナ
         * @returns 作成されたレイヤーグループ
         * @protected
         */
        createLayerGroup(container) {
            const group = container
                .append('g')
                .attr('class', `thematika-layer thematika-layer--${this.id}`)
                .style('display', this.visible ? '' : 'none');
            this.element = group.node();
            return group;
        }
        /**
         * 単一要素にSVG属性を適用します
         * @param element - 対象要素（未使用だがシグネチャ維持）
         * @param layerGroup - 属性を適用するレイヤーグループ
         * @protected
         */
        applyAttributesToElement(element, layerGroup) {
            Object.entries(this.attr).forEach(([property, value]) => {
                if (value !== undefined && property !== 'className') {
                    // 関数型の場合はダミーデータで評価（単一要素用）
                    const finalValue = typeof value === 'function' ? value({}, 0) : value;
                    layerGroup.attr(property, finalValue);
                }
            });
        }
        /**
         * 単一要素にCSS style属性を適用します
         * @param element - 対象要素（未使用）
         * @param layerGroup - スタイルを適用するレイヤーグループ
         * @protected
         */
        applyStylesToElement(element, layerGroup) {
            if (this.style) {
                Object.entries(this.style).forEach(([property, value]) => {
                    if (value !== undefined) {
                        const finalValue = typeof value === 'function' ? value({}, 0) : value;
                        layerGroup.style(property, finalValue);
                    }
                });
            }
        }
        /**
         * 単一要素にSVG属性とCSS style属性の両方を適用します
         * @param element - 対象要素
         * @param layerGroup - レイヤーグループ
         * @protected
         */
        applyAllStylesToElement(element, layerGroup) {
            this.applyAttributesToElement(element, layerGroup);
            this.applyStylesToElement(element, layerGroup);
        }
        /**
         * 複数要素にSVG属性を適用します
         * @param elements - 対象要素群（データがバインドされている前提）
         * @param layerGroup - レイヤーグループ（固定値の適用先）
         * @protected
         */
        applyAttributesToElements(elements, layerGroup) {
            Object.entries(this.attr).forEach(([property, value]) => {
                if (value !== undefined && property !== 'className') {
                    if (typeof value === 'function') {
                        // 関数型の場合は個別の要素に適用
                        elements.attr(property, (d, i) => value(d, i));
                    }
                    else {
                        // 非関数型の場合はレイヤーグループに適用
                        layerGroup.attr(property, value);
                    }
                }
            });
        }
        /**
         * 複数要素にCSS style属性を適用します
         * @param elements - 対象要素群
         * @param layerGroup - レイヤーグループ
         * @protected
         */
        applyStylesToElements(elements, layerGroup) {
            if (this.style) {
                Object.entries(this.style).forEach(([property, value]) => {
                    if (value !== undefined) {
                        if (typeof value === 'function') {
                            // 関数型の場合は個別の要素に適用
                            elements.style(property, (d, i) => value(d, i));
                        }
                        else {
                            // 非関数型の場合はレイヤーグループに適用
                            layerGroup.style(property, value);
                        }
                    }
                });
            }
        }
        /**
         * 複数要素にSVG属性とCSS style属性の両方を適用します
         * @param elements - 対象要素群
         * @param layerGroup - レイヤーグループ
         * @protected
         */
        applyAllStylesToElements(elements, layerGroup) {
            this.applyAttributesToElements(elements, layerGroup);
            this.applyStylesToElements(elements, layerGroup);
        }
    }

    /**
     * GeoJSONデータを描画するレイヤークラス
     */
    class GeojsonLayer extends BaseLayer {
        /**
         * GeoJSONレイヤーを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options) {
            // 一意のIDを自動生成
            super(`geojson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
            // データの正規化
            this.data = Array.isArray(options.data)
                ? { type: 'FeatureCollection', features: options.data }
                : options.data;
        }
        /**
         * 投影法を設定します
         * @param projection - 地図投影法
         */
        setProjection(projection) {
            this.path = d3Geo.geoPath(projection);
            if (this.layerGroup) {
                this.layerGroup.selectAll('path').remove();
                this.renderFeatures();
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.renderFeatures();
        }
        /**
         * フィーチャーを描画します
         * @private
         */
        renderFeatures() {
            if (!this.layerGroup || !this.path)
                return;
            // パス要素を作成
            const paths = this.layerGroup
                .append('g')
                .attr('class', 'thematika-geojson-layer')
                .selectAll('path')
                .data(this.data.features)
                .enter()
                .append('path')
                .attr('d', this.path)
                .attr('class', d => {
                const baseClass = 'thematika-feature';
                const customClass = this.attr.className || '';
                const featureClass = d.properties?.class || '';
                return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
            });
            // SVG属性とスタイルを適用（共通メソッドを使用）
            this.applyAllStylesToElements(paths, this.layerGroup);
        }
        /**
         * GeoJSONデータを取得します
         * @returns 現在のGeoJSONデータ
         */
        getData() {
            return this.data;
        }
    }

    /**
     * 地球の輪郭（アウトライン）を描画するレイヤークラス
     * D3のSphereジオメトリを使用して投影法の境界を描画します
     */
    class OutlineLayer extends BaseLayer {
        /**
         * OutlineLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options = {}) {
            // 一意のIDを自動生成
            const defaultAttr = {
                fill: 'none',
                stroke: '#333333',
                strokeWidth: 1,
                opacity: 1
            };
            super(`outline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, { ...defaultAttr, ...options.attr }, options.style || {});
            this.createClipPath = options.createClipPath ?? false;
            this.clipPathId = options.clipPathId || `outline-clip-${this.id}`;
        }
        /**
         * 投影法を設定します
         * @param projection - 地図投影法
         */
        setProjection(projection) {
            this.path = d3Geo.geoPath(projection);
            if (this.layerGroup) {
                this.layerGroup.selectAll('path').remove();
                this.renderOutline();
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.renderOutline();
        }
        /**
         * アウトラインを描画します
         * @private
         */
        renderOutline() {
            if (!this.layerGroup || !this.path)
                return;
            // Sphereジオメトリを使用してアウトラインパスを生成
            const sphereGeometry = { type: "Sphere" };
            const outlinePathData = this.path(sphereGeometry);
            // クリップパスを作成（オプションが有効な場合）
            if (this.createClipPath && outlinePathData) {
                // SVG要素を取得
                const svg = this.layerGroup.node()?.closest('svg');
                if (svg) {
                    const svgSelection = d3Selection.select(svg);
                    const defs = svgSelection.insert('defs', ':first-child');
                    // 新しいクリップパスを作成
                    const clipPath = defs
                        .append('clipPath')
                        .attr('id', this.clipPathId);
                    clipPath
                        .append('path')
                        .attr('d', outlinePathData);
                    // cartography-main-groupにクリップパスを適用
                    const mainGroup = svgSelection.select('.thematika-main-group');
                    if (!mainGroup.empty()) {
                        mainGroup.attr('clip-path', this.getClipPathUrl());
                    }
                }
            }
            // アウトラインパス要素を作成
            const outlinePath = this.layerGroup
                .append('g')
                .attr('class', 'thematika-outline-layer')
                .append('path')
                .datum(sphereGeometry)
                .attr('d', this.path)
                .attr('class', () => {
                const baseClass = 'thematika-outline';
                const customClass = this.attr.className || '';
                return [baseClass, customClass].filter(Boolean).join(' ');
            });
            // 属性とスタイルを適用（共通メソッドを使用）
            this.applyAllStylesToElement(outlinePath, this.layerGroup);
        }
        /**
         * クリップパスIDを取得します
         * @returns クリップパスのID
         */
        getClipPathId() {
            return this.clipPathId;
        }
        /**
         * クリップパスURLを取得します
         * @returns クリップパスのURL文字列
         */
        getClipPathUrl() {
            return `url(#${this.clipPathId})`;
        }
    }

    /**
     * 経緯線（グラティキュール）を描画するレイヤークラス
     * D3のgeoGraticuleを使用して経緯線網を描画します
     */
    class GraticuleLayer extends BaseLayer {
        /**
         * GraticuleLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options = {}) {
            // 一意のIDを自動生成
            const defaultAttr = {
                fill: 'none',
                stroke: '#cccccc',
                strokeWidth: 0.5,
                opacity: 0.7
            };
            super(`graticule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, { ...defaultAttr, ...(options.attr || {}) }, options.style || {});
            this.step = options.step || [10, 10];
            this.extent = options.extent;
        }
        /**
         * 投影法を設定します
         * @param projection - 地図投影法
         */
        setProjection(projection) {
            this.path = d3Geo.geoPath(projection);
            if (this.layerGroup) {
                this.layerGroup.selectAll('path').remove();
                this.renderGraticule();
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.renderGraticule();
        }
        /**
         * 経緯線を描画します
         * @private
         */
        renderGraticule() {
            if (!this.layerGroup || !this.path)
                return;
            // geoGraticuleを作成
            const graticule = d3Geo.geoGraticule().step(this.step);
            // 範囲が指定されている場合は設定
            if (this.extent) {
                graticule.extent(this.extent);
            }
            // 経緯線のジオメトリを生成
            const graticuleGeometry = graticule();
            // 経緯線パス要素を作成
            const graticulePath = this.layerGroup
                .append('g')
                .attr('class', 'thematika-graticule-layer')
                .append('path')
                .datum(graticuleGeometry)
                .attr('d', this.path)
                .attr('class', () => {
                const baseClass = 'thematika-graticule';
                const customClass = this.attr.className || '';
                return [baseClass, customClass].filter(Boolean).join(' ');
            });
            // SVG属性とスタイルを適用（共通メソッドを使用）
            this.applyAllStylesToElement(graticulePath, this.layerGroup);
        }
    }

    /**
     * 画像を地図上に表示するレイヤー
     * Equirectangular投影法の場合は高速に描画し、
     * その他の投影法では画像を再投影して表示します
     */
    class ImageLayer extends BaseLayer {
        /**
         * ImageLayerを初期化します
         * @param id - レイヤーの一意識別子
         * @param options - レイヤーのオプション
         */
        constructor(id, options) {
            super(id, options.attr, options.style);
            this.src = options.src;
            this.bounds = options.bounds;
            this.showBboxMarkers = options.showBboxMarkers ?? false;
        }
        /**
         * 投影法を設定します
         * @param projection - 投影法
         */
        setProjection(projection) {
            this.projection = projection;
            if (this.isRendered()) {
                if (!this.element || !this.projection)
                    return;
                // 既存の画像とマーカーを削除して再描画
                const selection = d3Selection.select(this.element);
                selection.selectAll('image').remove();
                selection.selectAll('.bbox-marker').remove();
                selection.selectAll('.bbox-marker-label').remove();
                this.loadImage(this.src).then(img => {
                    if (this.canUseDirectRendering(this.projection)) {
                        this.renderDirect(img);
                    }
                    else {
                        this.renderReprojected(img);
                    }
                }).catch(error => {
                    console.error('ImageLayer: 更新に失敗しました', error);
                });
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGグループ要素
         */
        async render(container) {
            if (!this.projection) {
                console.warn('ImageLayer: 投影法が設定されていません');
                return;
            }
            const g = container.append('g')
                .attr('class', `image-layer ${this.attr.className || ''}`)
                .attr('id', `layer-${this.id}`);
            if (!this.visible) {
                g.style('display', 'none');
            }
            this.element = g.node();
            try {
                const img = await this.loadImage(this.src);
                if (this.canUseDirectRendering(this.projection)) {
                    console.log("direct");
                    await this.renderDirect(img);
                }
                else {
                    console.log("repuro");
                    await this.renderReprojected(img);
                }
            }
            catch (error) {
                console.error('ImageLayer: 画像の描画に失敗しました', error);
            }
        }
        /**
         * 画像を読み込みます
         * @param src - 画像のURL
         * @returns 読み込まれた画像要素
         */
        loadImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`画像の読み込みに失敗しました: ${src}`));
                img.src = src;
            });
        }
        /**
         * 高速な直接描画が可能かどうかを判定します
         * @param projection - 投影法
         * @returns 高速描画が可能な場合はtrue
         */
        canUseDirectRendering(projection) {
            // Equirectangular投影法のみ高速描画を使用
            return this.isEquirectangularProjection(projection);
        }
        /**
         * Equirectangular投影法かどうかを判定します
         * @param projection - 投影法
         * @returns Equirectangular投影法の場合はtrue
         */
        isEquirectangularProjection(projection) {
            const projString = projection.toString ? projection.toString() : '';
            return projString.includes('equirectangular') ||
                projString.includes('Equirectangular');
        }
        /**
         * 画像を高速に直接描画します（Equirectangular投影法用）
         * @param img - 画像要素
         */
        renderDirect(img) {
            if (!this.element || !this.projection)
                return;
            console.log(this.bounds);
            const [west, south, east, north] = this.bounds;
            // 境界の四隅を投影法で座標変換
            const topLeft = this.projection([west, north]);
            const topRight = this.projection([east, north]);
            const bottomLeft = this.projection([west, south]);
            const bottomRight = this.projection([east, south]);
            if (!topLeft || !bottomRight) {
                console.warn('ImageLayer: 境界が投影範囲外です');
                return;
            }
            const projectedX = topLeft[0];
            const projectedY = topLeft[1];
            const projectedWidth = Math.abs(bottomRight[0] - topLeft[0]);
            const projectedHeight = Math.abs(bottomRight[1] - topLeft[1]);
            // 画像要素を作成
            const selection = d3Selection.select(this.element);
            this.imageElement = selection
                .append('image')
                .attr('x', projectedX)
                .attr('y', projectedY)
                .attr('width', projectedWidth)
                .attr('height', projectedHeight)
                .attr('href', img.src)
                .attr('preserveAspectRatio', 'none');
            // bbox マーカーを表示（オプション）
            if (this.showBboxMarkers) {
                this.addBboxMarkers(selection, [topLeft, topRight, bottomLeft, bottomRight]);
            }
            // スタイルを適用
            if (this.imageElement) {
                this.applyAllStylesToElement(this.imageElement, this.getLayerGroup());
            }
        }
        /**
         * 画像を再投影して描画します（その他の投影法用）
         * @param img - 画像要素
         */
        async renderReprojected(img) {
            if (!this.element || !this.projection)
                return;
            try {
                const result = await this.reprojectImage(img);
                const selection = d3Selection.select(this.element);
                this.imageElement = selection
                    .append('image')
                    .attr('x', result.x)
                    .attr('y', result.y)
                    .attr('width', result.width)
                    .attr('height', result.height)
                    .attr('href', result.dataUrl)
                    .attr('preserveAspectRatio', 'none');
                if (this.imageElement) {
                    this.applyAllStylesToElement(this.imageElement, this.getLayerGroup());
                }
                // bbox マーカーを表示（オプション）
                if (this.showBboxMarkers) {
                    const [west, south, east, north] = this.bounds;
                    const topLeft = this.projection([west, north]);
                    const topRight = this.projection([east, north]);
                    const bottomLeft = this.projection([west, south]);
                    const bottomRight = this.projection([east, south]);
                    this.addBboxMarkers(selection, [topLeft, topRight, bottomLeft, bottomRight]);
                }
            }
            catch (error) {
                console.error('ImageLayer: 再投影に失敗しました', error);
            }
        }
        /**
         * 画像を再投影変換します
         * @param img - 元画像
         * @returns 変換後の画像の情報
         */
        async reprojectImage(img) {
            if (!this.projection)
                throw new Error('投影法が設定されていません');
            const [west, south, east, north] = this.bounds;
            // 出力範囲を計算
            const outputBounds = this.calculateOutputBounds();
            if (!outputBounds)
                throw new Error('出力範囲の計算に失敗しました');
            const { minX, minY, width, height } = outputBounds;
            // ソース画像をCanvasに描画
            const srcCanvas = document.createElement('canvas');
            const srcCtx = srcCanvas.getContext('2d');
            if (!srcCtx)
                throw new Error('Canvas contextの取得に失敗しました');
            srcCanvas.width = img.width;
            srcCanvas.height = img.height;
            srcCtx.drawImage(img, 0, 0);
            const srcImageData = srcCtx.getImageData(0, 0, img.width, img.height);
            // 出力Canvas作成
            const destCanvas = document.createElement('canvas');
            const destCtx = destCanvas.getContext('2d');
            if (!destCtx)
                throw new Error('Canvas contextの取得に失敗しました');
            destCanvas.width = width;
            destCanvas.height = height;
            const destImageData = destCtx.createImageData(width, height);
            // 各ピクセルを変換
            for (let row = 0; row < height; row++) {
                for (let col = 0; col < width; col++) {
                    const screenX = col + minX;
                    const screenY = row + minY;
                    // 投影の逆変換
                    if (this.projection.invert) {
                        try {
                            const geoCoord = this.projection.invert([screenX, screenY]);
                            if (geoCoord &&
                                geoCoord[0] >= west && geoCoord[0] <= east &&
                                geoCoord[1] >= south && geoCoord[1] <= north) {
                                // ソース画像の座標を計算
                                const srcX = (geoCoord[0] - west) / (east - west) * (img.width - 1);
                                const srcY = (north - geoCoord[1]) / (north - south) * (img.height - 1);
                                // 最近傍補間
                                const pixel = this.nearestNeighborInterpolate(srcImageData, srcX, srcY);
                                const destIndex = (row * width + col) * 4;
                                destImageData.data[destIndex] = pixel[0];
                                destImageData.data[destIndex + 1] = pixel[1];
                                destImageData.data[destIndex + 2] = pixel[2];
                                destImageData.data[destIndex + 3] = pixel[3];
                            }
                        }
                        catch (e) {
                            // 投影が失敗した場合はスキップ
                        }
                    }
                }
            }
            destCtx.putImageData(destImageData, 0, 0);
            return {
                dataUrl: destCanvas.toDataURL(),
                x: minX,
                y: minY,
                width,
                height
            };
        }
        /**
         * 最近傍補間を行います
         * @param imageData - 画像データ
         * @param x - X座標（小数）
         * @param y - Y座標（小数）
         * @returns RGBA値の配列
         */
        nearestNeighborInterpolate(imageData, x, y) {
            const nearestX = Math.round(x);
            const nearestY = Math.round(y);
            if (nearestX < 0 || nearestX >= imageData.width || nearestY < 0 || nearestY >= imageData.height) {
                return [0, 0, 0, 0];
            }
            const idx = (nearestY * imageData.width + nearestX) * 4;
            return [
                imageData.data[idx],
                imageData.data[idx + 1],
                imageData.data[idx + 2],
                imageData.data[idx + 3]
            ];
        }
        /**
         * 出力画像の境界を計算します
         * @returns 境界情報またはnull
         */
        calculateOutputBounds() {
            if (!this.projection)
                return null;
            const [west, south, east, north] = this.bounds;
            // より多くのテストポイントで正確な境界を計算
            const testPoints = [];
            const steps = 20;
            // 境界線上の点を追加
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                testPoints.push([west + (east - west) * t, north], [west + (east - west) * t, south], [west, south + (north - south) * t], [east, south + (north - south) * t]);
            }
            const projectedPoints = testPoints
                .map(p => this.projection(p))
                .filter(p => p !== null);
            if (projectedPoints.length === 0)
                return null;
            const xs = projectedPoints.map(p => p[0]);
            const ys = projectedPoints.map(p => p[1]);
            const minX = Math.floor(Math.min(...xs));
            const maxX = Math.ceil(Math.max(...xs));
            const minY = Math.floor(Math.min(...ys));
            const maxY = Math.ceil(Math.max(...ys));
            return {
                minX,
                minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }
        /**
         * bbox の四隅にマーカーを表示します
         * @param selection - SVGグループ選択
         * @param corners - 四隅の座標配列
         */
        addBboxMarkers(selection, corners) {
            const validCorners = corners.filter(corner => corner !== null);
            const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']; // より見やすい色
            const labels = ['NW', 'NE', 'SW', 'SE']; // 短いラベル
            validCorners.forEach((corner, index) => {
                // マーカー用のグループを作成
                const markerGroup = selection
                    .append('g')
                    .attr('class', 'bbox-marker')
                    .attr('transform', `translate(${corner[0]}, ${corner[1]})`);
                // 外側の円（白い縁取り）
                markerGroup
                    .append('circle')
                    .attr('r', 6)
                    .attr('fill', 'white')
                    .attr('stroke', colors[index] || '#9b59b6')
                    .attr('stroke-width', 2);
                // 内側の円（メインカラー）
                markerGroup
                    .append('circle')
                    .attr('r', 4)
                    .attr('fill', colors[index] || '#9b59b6');
                // ラベル
                markerGroup
                    .append('text')
                    .attr('x', 10)
                    .attr('y', 4)
                    .attr('font-size', '11px')
                    .attr('font-family', "'Roboto', 'Noto Sans JP', sans-serif")
                    .attr('fill', colors[index] || '#9b59b6')
                    .attr('font-weight', 'bold')
                    .attr('class', 'bbox-marker-label')
                    .text(labels[index] || `${index + 1}`);
            });
        }
    }

    var noop = {value: () => {}};

    function dispatch() {
      for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
        if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
        _[t] = [];
      }
      return new Dispatch(_);
    }

    function Dispatch(_) {
      this._ = _;
    }

    function parseTypenames(typenames, types) {
      return typenames.trim().split(/^|\s+/).map(function(t) {
        var name = "", i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
        return {type: t, name: name};
      });
    }

    Dispatch.prototype = dispatch.prototype = {
      constructor: Dispatch,
      on: function(typename, callback) {
        var _ = this._,
            T = parseTypenames(typename + "", _),
            t,
            i = -1,
            n = T.length;

        // If no callback was specified, return the callback of the given type and name.
        if (arguments.length < 2) {
          while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
          return;
        }

        // If a type was specified, set the callback for the given type and name.
        // Otherwise, if a null callback was specified, remove callbacks of the given name.
        if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
        while (++i < n) {
          if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
          else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
        }

        return this;
      },
      copy: function() {
        var copy = {}, _ = this._;
        for (var t in _) copy[t] = _[t].slice();
        return new Dispatch(copy);
      },
      call: function(type, that) {
        if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
      },
      apply: function(type, that, args) {
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
      }
    };

    function get(type, name) {
      for (var i = 0, n = type.length, c; i < n; ++i) {
        if ((c = type[i]).name === name) {
          return c.value;
        }
      }
    }

    function set(type, name, callback) {
      for (var i = 0, n = type.length; i < n; ++i) {
        if (type[i].name === name) {
          type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
          break;
        }
      }
      if (callback != null) type.push({name: name, value: callback});
      return type;
    }

    // These are typically used in conjunction with noevent to ensure that we can
    // preventDefault on the event.
    const nonpassive = {passive: false};
    const nonpassivecapture = {capture: true, passive: false};

    function nopropagation(event) {
      event.stopImmediatePropagation();
    }

    function noevent(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function nodrag(view) {
      var root = view.document.documentElement,
          selection = d3Selection.select(view).on("dragstart.drag", noevent, nonpassivecapture);
      if ("onselectstart" in root) {
        selection.on("selectstart.drag", noevent, nonpassivecapture);
      } else {
        root.__noselect = root.style.MozUserSelect;
        root.style.MozUserSelect = "none";
      }
    }

    function yesdrag(view, noclick) {
      var root = view.document.documentElement,
          selection = d3Selection.select(view).on("dragstart.drag", null);
      if (noclick) {
        selection.on("click.drag", noevent, nonpassivecapture);
        setTimeout(function() { selection.on("click.drag", null); }, 0);
      }
      if ("onselectstart" in root) {
        selection.on("selectstart.drag", null);
      } else {
        root.style.MozUserSelect = root.__noselect;
        delete root.__noselect;
      }
    }

    var constant = x => () => x;

    function DragEvent(type, {
      sourceEvent,
      subject,
      target,
      identifier,
      active,
      x, y, dx, dy,
      dispatch
    }) {
      Object.defineProperties(this, {
        type: {value: type, enumerable: true, configurable: true},
        sourceEvent: {value: sourceEvent, enumerable: true, configurable: true},
        subject: {value: subject, enumerable: true, configurable: true},
        target: {value: target, enumerable: true, configurable: true},
        identifier: {value: identifier, enumerable: true, configurable: true},
        active: {value: active, enumerable: true, configurable: true},
        x: {value: x, enumerable: true, configurable: true},
        y: {value: y, enumerable: true, configurable: true},
        dx: {value: dx, enumerable: true, configurable: true},
        dy: {value: dy, enumerable: true, configurable: true},
        _: {value: dispatch}
      });
    }

    DragEvent.prototype.on = function() {
      var value = this._.on.apply(this._, arguments);
      return value === this._ ? this : value;
    };

    // Ignore right-click, since that should open the context menu.
    function defaultFilter(event) {
      return !event.ctrlKey && !event.button;
    }

    function defaultContainer() {
      return this.parentNode;
    }

    function defaultSubject(event, d) {
      return d == null ? {x: event.x, y: event.y} : d;
    }

    function defaultTouchable() {
      return navigator.maxTouchPoints || ("ontouchstart" in this);
    }

    function drag() {
      var filter = defaultFilter,
          container = defaultContainer,
          subject = defaultSubject,
          touchable = defaultTouchable,
          gestures = {},
          listeners = dispatch("start", "drag", "end"),
          active = 0,
          mousedownx,
          mousedowny,
          mousemoving,
          touchending,
          clickDistance2 = 0;

      function drag(selection) {
        selection
            .on("mousedown.drag", mousedowned)
          .filter(touchable)
            .on("touchstart.drag", touchstarted)
            .on("touchmove.drag", touchmoved, nonpassive)
            .on("touchend.drag touchcancel.drag", touchended)
            .style("touch-action", "none")
            .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
      }

      function mousedowned(event, d) {
        if (touchending || !filter.call(this, event, d)) return;
        var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
        if (!gesture) return;
        d3Selection.select(event.view)
          .on("mousemove.drag", mousemoved, nonpassivecapture)
          .on("mouseup.drag", mouseupped, nonpassivecapture);
        nodrag(event.view);
        nopropagation(event);
        mousemoving = false;
        mousedownx = event.clientX;
        mousedowny = event.clientY;
        gesture("start", event);
      }

      function mousemoved(event) {
        noevent(event);
        if (!mousemoving) {
          var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
          mousemoving = dx * dx + dy * dy > clickDistance2;
        }
        gestures.mouse("drag", event);
      }

      function mouseupped(event) {
        d3Selection.select(event.view).on("mousemove.drag mouseup.drag", null);
        yesdrag(event.view, mousemoving);
        noevent(event);
        gestures.mouse("end", event);
      }

      function touchstarted(event, d) {
        if (!filter.call(this, event, d)) return;
        var touches = event.changedTouches,
            c = container.call(this, event, d),
            n = touches.length, i, gesture;

        for (i = 0; i < n; ++i) {
          if (gesture = beforestart(this, c, event, d, touches[i].identifier, touches[i])) {
            nopropagation(event);
            gesture("start", event, touches[i]);
          }
        }
      }

      function touchmoved(event) {
        var touches = event.changedTouches,
            n = touches.length, i, gesture;

        for (i = 0; i < n; ++i) {
          if (gesture = gestures[touches[i].identifier]) {
            noevent(event);
            gesture("drag", event, touches[i]);
          }
        }
      }

      function touchended(event) {
        var touches = event.changedTouches,
            n = touches.length, i, gesture;

        if (touchending) clearTimeout(touchending);
        touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
        for (i = 0; i < n; ++i) {
          if (gesture = gestures[touches[i].identifier]) {
            nopropagation(event);
            gesture("end", event, touches[i]);
          }
        }
      }

      function beforestart(that, container, event, d, identifier, touch) {
        var dispatch = listeners.copy(),
            p = d3Selection.pointer(touch || event, container), dx, dy,
            s;

        if ((s = subject.call(that, new DragEvent("beforestart", {
            sourceEvent: event,
            target: drag,
            identifier,
            active,
            x: p[0],
            y: p[1],
            dx: 0,
            dy: 0,
            dispatch
          }), d)) == null) return;

        dx = s.x - p[0] || 0;
        dy = s.y - p[1] || 0;

        return function gesture(type, event, touch) {
          var p0 = p, n;
          switch (type) {
            case "start": gestures[identifier] = gesture, n = active++; break;
            case "end": delete gestures[identifier], --active; // falls through
            case "drag": p = d3Selection.pointer(touch || event, container), n = active; break;
          }
          dispatch.call(
            type,
            that,
            new DragEvent(type, {
              sourceEvent: event,
              subject: s,
              target: drag,
              identifier,
              active: n,
              x: p[0] + dx,
              y: p[1] + dy,
              dx: p[0] - p0[0],
              dy: p[1] - p0[1],
              dispatch
            }),
            d
          );
        };
      }

      drag.filter = function(_) {
        return arguments.length ? (filter = typeof _ === "function" ? _ : constant(!!_), drag) : filter;
      };

      drag.container = function(_) {
        return arguments.length ? (container = typeof _ === "function" ? _ : constant(_), drag) : container;
      };

      drag.subject = function(_) {
        return arguments.length ? (subject = typeof _ === "function" ? _ : constant(_), drag) : subject;
      };

      drag.touchable = function(_) {
        return arguments.length ? (touchable = typeof _ === "function" ? _ : constant(!!_), drag) : touchable;
      };

      drag.on = function() {
        var value = listeners.on.apply(listeners, arguments);
        return value === listeners ? drag : value;
      };

      drag.clickDistance = function(_) {
        return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
      };

      return drag;
    }

    /**
     * D3スケールを受け取って地図に凡例を表示するレイヤークラス
     */
    class LegendLayer extends BaseLayer {
        /**
         * LegendLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options) {
            // 一意のIDを自動生成
            super(`legend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
            this.scale = options.scale;
            this.position = options.position;
            this.title = options.title;
            this.orientation = options.orientation || 'vertical';
            this.itemSpacing = options.itemSpacing || 20;
            this.fontSize = options.fontSize || 12;
            this.width = options.width;
            this.height = options.height;
            this.symbolType = options.symbolType || this.inferSymbolType();
            this.symbolSize = options.symbolSize || { fixed: 16 };
            this.sizeScale = options.sizeScale;
            this.gradientSteps = options.gradientSteps || 256;
            this.enableDrag = options.enableDrag !== false; // デフォルトで有効
            this.showBackground = options.showBackground !== false; // デフォルトで有効
            this.overlapping = options.overlapping || false; // デフォルトで無効
            this.backgroundStyle = {
                fill: '#ffffff',
                stroke: '#cccccc',
                strokeWidth: 1,
                opacity: 0.9,
                rx: 4,
                ry: 4,
                padding: 8,
                ...options.backgroundStyle
            };
        }
        /**
         * スケール型から適切なシンボルタイプを推論します
         * @returns 推論されたシンボルタイプ
         * @private
         */
        inferSymbolType() {
            const scaleType = this.detectScaleType();
            switch (scaleType) {
                case 'continuous':
                    return 'gradient';
                case 'quantized':
                case 'ordinal':
                default:
                    return 'cell';
            }
        }
        /**
         * サイズスケールが有効かどうかを判定します
         * @returns サイズスケールが有効な場合true
         * @private
         */
        hasSizeScale() {
            // 明示的なsizeScaleが設定されている場合
            return !!this.sizeScale;
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.parentContainer = container;
            this.layerGroup = this.createLayerGroup(container);
            this.renderLegend();
            this.renderBackground();
            this.updatePositionTransform();
            // ドラッグ機能を設定
            if (this.enableDrag) {
                this.setupDragBehavior();
            }
            // リサイズイベントの監視を設定
            this.setupResizeListener();
        }
        /**
         * d3-legendの設計思想に基づいてスケール型を自動判別します
         * @returns スケール型
         * @private
         */
        detectScaleType() {
            const scale = this.scale;
            // invertExtentメソッドがあるかチェック（量的スケール）
            if (typeof scale.invertExtent === 'function') {
                return 'quantized';
            }
            // ticksメソッドがあるかチェック（連続スケール）
            if (typeof scale.ticks === 'function') {
                return 'continuous';
            }
            // どちらもない場合は序数スケール
            return 'ordinal';
        }
        /**
         * 値が色を表す文字列かどうかを判定します
         * @param value - 判定する値
         * @returns 色の場合true
         * @private
         */
        isColorValue(value) {
            if (typeof value !== 'string')
                return false;
            // 一般的な色のパターンをチェック
            // #RGB, #RRGGBB, #RRGGBBAA
            if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value))
                return true;
            // rgb(), rgba()
            if (/^rgba?\(/.test(value))
                return true;
            // hsl(), hsla()
            if (/^hsla?\(/.test(value))
                return true;
            // 名前付き色
            if (/^(red|green|blue|black|white|yellow|cyan|magenta|gray|grey|orange|purple|brown|pink)$/i.test(value))
                return true;
            return false;
        }
        /**
         * スケール型に応じた凡例データを生成します
         * @returns 凡例データ
         * @private
         */
        generateLegendData() {
            const scaleType = this.detectScaleType();
            switch (scaleType) {
                case 'continuous':
                    return this.generateContinuousLegend();
                case 'quantized':
                    return this.generateQuantizedLegend();
                case 'ordinal':
                    return this.generateOrdinalLegend();
                default:
                    throw new Error(`Unsupported scale type: ${scaleType}`);
            }
        }
        /**
         * 連続スケール用の凡例データを生成します
         * @returns 凡例データ
         * @private
         */
        generateContinuousLegend() {
            const scale = this.scale;
            const domain = scale.domain();
            // ticksメソッドを使用して適切な刻み値を取得
            const ticks = scale.ticks ? scale.ticks(5) : domain;
            return {
                data: ticks,
                labels: ticks.map((d) => d.toString()),
                colors: ticks.map((d) => scale(d))
            };
        }
        /**
         * 量的スケール用の凡例データを生成します
         * @returns 凡例データ
         * @private
         */
        generateQuantizedLegend() {
            const scale = this.scale;
            const range = scale.range();
            // rangeが数値か色かを判定
            const isNumericRange = range.length > 0 && typeof range[0] === 'number';
            const legendData = {
                data: range,
                labels: range.map((value) => {
                    const extent = scale.invertExtent(value);
                    if (extent[0] != null && extent[1] != null) {
                        return `${extent[0]} - ${extent[1]}`;
                    }
                    return value.toString();
                }),
                colors: isNumericRange
                    ? range.map(() => '#0066cc') // 数値の場合はデフォルト色
                    : range
            };
            // 数値rangeの場合はサイズデータとして追加
            if (isNumericRange) {
                legendData.sizes = range;
            }
            return legendData;
        }
        /**
         * 序数スケール用の凡例データを生成します
         * @returns 凡例データ
         * @private
         */
        generateOrdinalLegend() {
            const scale = this.scale;
            const domain = scale.domain();
            const range = scale.range();
            // rangeが数値か色かを判定
            const isNumericRange = range.length > 0 && typeof range[0] === 'number';
            const legendData = {
                data: domain,
                labels: domain.map((d) => d.toString()),
                colors: isNumericRange
                    ? domain.map(() => '#0066cc') // 数値の場合はデフォルト色
                    : domain.map((d) => scale(d))
            };
            // 数値rangeの場合はサイズデータとして追加
            if (isNumericRange) {
                legendData.sizes = domain.map((d) => scale(d));
            }
            return legendData;
        }
        /**
         * サイズスケール用の凡例データを生成します
         * @returns 凡例データ
         * @private
         */
        generateSizeScaleLegendData() {
            if (!this.sizeScale) {
                throw new Error('Size scale is not defined');
            }
            const sizeScale = this.sizeScale;
            const domain = sizeScale.domain();
            const range = sizeScale.range();
            // 色スケールから色を取得（メインスケールを使用）
            const colorScale = this.scale;
            return {
                data: domain,
                labels: domain.map((d) => d.toString()),
                colors: domain.map(() => {
                    // カラースケールの場合は最初のドメイン値を使用、なければデフォルト色
                    if (typeof colorScale === 'function') {
                        try {
                            const colorDomain = colorScale.domain();
                            return colorScale(colorDomain[0]) || '#0066cc';
                        }
                        catch {
                            return '#0066cc';
                        }
                    }
                    return '#0066cc';
                }),
                sizes: range
            };
        }
        /**
         * 凡例を描画します
         * @private
         */
        renderLegend() {
            if (!this.layerGroup)
                return;
            // タイトルを描画
            if (this.title) {
                this.renderTitle();
            }
            // サイズスケールが有効な場合は専用関数を使用
            if (this.hasSizeScale()) {
                this.renderSizeScaleLegend();
            }
            else {
                // シンボルタイプに応じて適切なレンダリング関数を呼び出す
                switch (this.symbolType) {
                    case 'cell':
                        this.renderCellLegend();
                        break;
                    case 'circle':
                        this.renderCircleLegend();
                        break;
                    case 'line':
                        this.renderLineLegend();
                        break;
                    case 'gradient':
                        this.renderGradientLegend();
                        break;
                    default:
                        throw new Error(`Unsupported symbol type: ${this.symbolType}`);
                }
            }
        }
        /**
         * タイトルを描画します
         * @private
         */
        renderTitle() {
            if (!this.layerGroup || !this.title)
                return;
            this.layerGroup
                .append('text')
                .attr('class', 'thematika-legend-title')
                .attr('x', 0)
                .attr('y', 0)
                .style('font-size', `${this.fontSize + 2}px`)
                .style('font-weight', 'bold')
                .style('fill', '#333')
                .text(this.title);
        }
        /**
         * セル（矩形）タイプの凡例を描画します（固定サイズ版）
         * @private
         */
        renderCellLegend() {
            if (!this.layerGroup)
                return;
            const legendData = this.generateLegendData();
            const titleOffset = this.title ? this.fontSize + 10 : 0;
            const items = this.layerGroup
                .selectAll('.thematika-legend-item')
                .data(legendData.data)
                .enter()
                .append('g')
                .attr('class', 'thematika-legend-item');
            // 固定サイズのセル
            const cellSize = this.symbolSize.fixed || 16;
            // 色見本を描画
            items
                .append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('fill', (d, i) => legendData.colors[i])
                .attr('stroke', '#333')
                .attr('stroke-width', 0.5);
            // ラベルを描画
            items
                .append('text')
                .attr('x', cellSize + 4)
                .attr('y', cellSize / 2)
                .attr('dy', '0.35em')
                .style('font-size', `${this.fontSize}px`)
                .style('fill', '#333')
                .text((d, i) => legendData.labels[i]);
            // 配置の設定（サイズ情報も渡す）
            this.positionItems(items, titleOffset, legendData.sizes);
        }
        /**
         * 円タイプの凡例を描画します（固定サイズ版）
         * @private
         */
        renderCircleLegend() {
            if (!this.layerGroup)
                return;
            const legendData = this.generateLegendData();
            const titleOffset = this.title ? this.fontSize + 10 : 0;
            const items = this.layerGroup
                .selectAll('.thematika-legend-item')
                .data(legendData.data)
                .enter()
                .append('g')
                .attr('class', 'thematika-legend-item');
            // 固定サイズの円
            const radius = (this.symbolSize.fixed || 16) / 2;
            // 円を描画
            items
                .append('circle')
                .attr('cx', radius)
                .attr('cy', radius)
                .attr('r', radius)
                .attr('fill', (d, i) => legendData.colors[i])
                .attr('stroke', '#333')
                .attr('stroke-width', 0.5);
            // ラベルを描画
            items
                .append('text')
                .attr('x', radius * 2 + 4)
                .attr('y', radius)
                .attr('dy', '0.35em')
                .style('font-size', `${this.fontSize}px`)
                .style('fill', '#333')
                .text((d, i) => legendData.labels[i]);
            // 配置の設定（サイズ情報も渡す）
            this.positionItems(items, titleOffset, legendData.sizes);
        }
        /**
         * 線タイプの凡例を描画します（固定サイズ版）
         * @private
         */
        renderLineLegend() {
            if (!this.layerGroup)
                return;
            const legendData = this.generateLegendData();
            const titleOffset = this.title ? this.fontSize + 10 : 0;
            const items = this.layerGroup
                .selectAll('.thematika-legend-item')
                .data(legendData.data)
                .enter()
                .append('g')
                .attr('class', 'thematika-legend-item');
            // 固定サイズの線
            const lineLength = this.symbolSize.fixed || 24;
            const strokeWidth = 2; // 固定の線の太さ
            // 線を描画
            items
                .append('line')
                .attr('x1', 0)
                .attr('y1', 8)
                .attr('x2', lineLength)
                .attr('y2', 8)
                .attr('stroke', (d, i) => legendData.colors[i])
                .attr('stroke-width', strokeWidth);
            // ラベルを描画
            items
                .append('text')
                .attr('x', lineLength + 4)
                .attr('y', 8)
                .attr('dy', '0.35em')
                .style('font-size', `${this.fontSize}px`)
                .style('fill', '#333')
                .text((d, i) => legendData.labels[i]);
            // 配置の設定（サイズ情報も渡す）
            this.positionItems(items, titleOffset, legendData.sizes);
        }
        /**
         * グラデーションタイプの凡例を描画します
         * @private
         */
        renderGradientLegend() {
            if (!this.layerGroup)
                return;
            const scale = this.scale;
            const domain = scale.domain();
            // グラデーション定義を作成
            const gradientId = `gradient-${this.id}`;
            const defs = this.layerGroup.append('defs');
            const linearGradient = defs.append('linearGradient')
                .attr('id', gradientId)
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', this.orientation === 'horizontal' ? '100%' : '0%')
                .attr('y2', this.orientation === 'horizontal' ? '0%' : '100%');
            // グラデーションストップを追加
            const steps = this.gradientSteps;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const value = domain[0] + t * (domain[1] - domain[0]);
                linearGradient.append('stop')
                    .attr('offset', `${t * 100}%`)
                    .attr('stop-color', scale(value));
            }
            const titleOffset = this.title ? this.fontSize + 10 : 0;
            // グラデーションバーを描画
            const barWidth = this.width || 200;
            const barHeight = this.height || 20;
            this.layerGroup.append('rect')
                .attr('x', 0)
                .attr('y', titleOffset)
                .attr('width', this.orientation === 'horizontal' ? barWidth : barHeight)
                .attr('height', this.orientation === 'horizontal' ? barHeight : barWidth)
                .attr('fill', `url(#${gradientId})`)
                .attr('stroke', '#333')
                .attr('stroke-width', 0.5);
            // ラベルを描画
            const ticks = scale.ticks ? scale.ticks(5) : domain;
            const labelGroup = this.layerGroup.append('g')
                .attr('transform', `translate(0, ${titleOffset})`);
            ticks.forEach((tick, i) => {
                const position = (tick - domain[0]) / (domain[1] - domain[0]);
                labelGroup.append('text')
                    .attr('x', this.orientation === 'horizontal' ? position * barWidth : barHeight + 4)
                    .attr('y', this.orientation === 'horizontal' ? barHeight + 16 : position * barWidth)
                    .attr('text-anchor', this.orientation === 'horizontal' ? 'middle' : 'start')
                    .style('font-size', `${this.fontSize}px`)
                    .style('fill', '#333')
                    .text(tick.toString());
            });
        }
        /**
         * サイズスケール用の凡例を描画します
         * @private
         */
        renderSizeScaleLegend() {
            if (!this.layerGroup)
                return;
            const legendData = this.generateSizeScaleLegendData();
            const titleOffset = this.title ? this.fontSize + 10 : 0;
            // overlappingモードの場合は重ね表示
            if (this.overlapping) {
                this.renderOverlappingSizeScale(legendData, titleOffset);
            }
            else {
                // 通常モードは既存の並列表示
                this.renderRegularSizeScale(legendData, titleOffset);
            }
        }
        /**
         * 重ね表示モードでサイズスケール凡例を描画します
         * @param legendData - 凡例データ
         * @param titleOffset - タイトルのオフセット
         * @private
         */
        renderOverlappingSizeScale(legendData, titleOffset) {
            if (!this.layerGroup || !legendData.sizes || legendData.sizes.length === 0)
                return;
            // 最大サイズを取得してレイアウトを計算
            const maxSize = Math.max(...legendData.sizes);
            switch (this.symbolType) {
                case 'circle':
                    this.renderOverlappingCircles(legendData, titleOffset, maxSize);
                    break;
                case 'cell':
                    this.renderOverlappingCells(legendData, titleOffset, maxSize);
                    break;
                case 'line':
                    this.renderOverlappingLines(legendData, titleOffset, maxSize);
                    break;
                default:
                    this.renderOverlappingCircles(legendData, titleOffset, maxSize);
                    break;
            }
        }
        /**
         * 重ね表示モードで円を描画します（同心円配置）
         * @param legendData - 凡例データ
         * @param titleOffset - タイトルのオフセット
         * @param maxSize - 最大サイズ
         * @private
         */
        renderOverlappingCircles(legendData, titleOffset, maxSize) {
            if (!this.layerGroup || !legendData.sizes)
                return;
            // 最大半径を計算（circleの場合、sizesは半径）
            const maxRadius = maxSize;
            const centerX = maxRadius;
            // ボトム揃えのため、最大円の下端を基準にする
            const bottomY = titleOffset + maxRadius * 2;
            // サイズでソート（大きい順）
            const sortedData = legendData.data
                .map((d, i) => ({ data: d, label: legendData.labels[i], color: legendData.colors[i], size: legendData.sizes[i] }))
                .sort((a, b) => b.size - a.size);
            // シンボルグループを作成
            const symbolGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-legend-symbols');
            // 円をボトム揃えで描画（大きい順）
            sortedData.forEach((item, i) => {
                // 各円の中心Y座標をボトム揃えで計算
                const circleCenterY = bottomY - item.size;
                symbolGroup
                    .append('circle')
                    .attr('cx', centerX)
                    .attr('cy', circleCenterY)
                    .attr('r', item.size)
                    .attr('fill', 'none')
                    .attr('stroke', '#333')
                    .attr('stroke-width', 1);
            });
            // ガイドライン（リーダーライン）を描画
            const guidelineGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-legend-guidelines');
            const labelStartX = centerX + maxRadius + 20; // ラベルを少し離す
            const guidelineEndX = labelStartX - 4; // ラベルの少し手前まで
            sortedData.forEach((item, i) => {
                const circleCenterY = bottomY - item.size;
                const circleTopY = circleCenterY - item.size; // 円のトップ位置
                const guidelineStartX = centerX; // 円の中心から開始
                // 円のトップから右に向かってガイドラインを引く（中心から開始）
                guidelineGroup
                    .append('line')
                    .attr('x1', guidelineStartX)
                    .attr('y1', circleTopY)
                    .attr('x2', guidelineEndX)
                    .attr('y2', circleTopY)
                    .attr('stroke', '#333')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '3,3'); // より見やすい点線スタイル
            });
            // ラベルを右側に統一配置（ガイドラインの終点に合わせて）
            const labelGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-legend-labels');
            // ラベルを各円のトップの高さに配置
            sortedData.forEach((item, i) => {
                const circleCenterY = bottomY - item.size;
                const circleTopY = circleCenterY - item.size; // 円のトップ位置
                labelGroup
                    .append('text')
                    .attr('x', labelStartX)
                    .attr('y', circleTopY)
                    .attr('dy', '0.35em')
                    .style('font-size', `${this.fontSize}px`)
                    .style('fill', '#333')
                    .text(item.label);
            });
        }
        /**
         * 重ね表示モードでセルを描画します
         * @param legendData - 凡例データ
         * @param titleOffset - タイトルのオフセット
         * @param maxSize - 最大サイズ（面積）
         * @private
         */
        renderOverlappingCells(legendData, titleOffset, maxSize) {
            if (!this.layerGroup || !legendData.sizes)
                return;
            // 面積から一辺の長さを計算
            const maxSide = Math.sqrt(maxSize);
            const centerX = maxSide / 2;
            // ボトム揃えのため、最大セルの下端を基準にする
            const bottomY = titleOffset + maxSide;
            // サイズでソート（大きい順）
            const sortedData = legendData.data
                .map((d, i) => ({ data: d, label: legendData.labels[i], color: legendData.colors[i], size: legendData.sizes[i] }))
                .sort((a, b) => b.size - a.size);
            // シンボルグループを作成
            const symbolGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-legend-symbols');
            // セルをボトム揃えで重ね表示（枠線のみ）
            sortedData.forEach((item, i) => {
                const sideLength = Math.sqrt(item.size);
                // 各セルの上端Y座標をボトム揃えで計算
                const cellTopY = bottomY - sideLength;
                symbolGroup
                    .append('rect')
                    .attr('x', centerX - sideLength / 2)
                    .attr('y', cellTopY)
                    .attr('width', sideLength)
                    .attr('height', sideLength)
                    .attr('fill', 'none')
                    .attr('stroke', '#333')
                    .attr('stroke-width', 1);
            });
            // ガイドライン（リーダーライン）を描画
            const guidelineGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-legend-guidelines');
            const labelStartX = centerX + maxSide / 2 + 20; // ラベルを少し離す
            const guidelineEndX = labelStartX - 4; // ラベルの少し手前まで
            sortedData.forEach((item, i) => {
                const sideLength = Math.sqrt(item.size);
                const cellTopY = bottomY - sideLength; // セルのトップ位置
                const guidelineStartX = centerX; // セルの中心から開始
                // セルのトップから右に向かってガイドラインを引く（中心から開始）
                guidelineGroup
                    .append('line')
                    .attr('x1', guidelineStartX)
                    .attr('y1', cellTopY)
                    .attr('x2', guidelineEndX)
                    .attr('y2', cellTopY)
                    .attr('stroke', '#333')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '3,3'); // 点線スタイル
            });
            // ラベルを右側に統一配置（ガイドラインの終点に合わせて）
            const labelGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-legend-labels');
            // ラベルを各セルのトップの高さに配置
            sortedData.forEach((item, i) => {
                const sideLength = Math.sqrt(item.size);
                const cellTopY = bottomY - sideLength; // セルのトップ位置
                labelGroup
                    .append('text')
                    .attr('x', labelStartX)
                    .attr('y', cellTopY)
                    .attr('dy', '0.35em')
                    .style('font-size', `${this.fontSize}px`)
                    .style('fill', '#333')
                    .text(item.label);
            });
        }
        /**
         * 重ね表示モードで線を描画します
         * @param legendData - 凡例データ
         * @param titleOffset - タイトルのオフセット
         * @param maxSize - 最大サイズ（線幅）
         * @private
         */
        renderOverlappingLines(legendData, titleOffset, maxSize) {
            if (!this.layerGroup || !legendData.sizes)
                return;
            const lineLength = 30;
            const centerY = titleOffset + maxSize / 2 + 10;
            // サイズでソート（大きい順）
            const sortedData = legendData.data
                .map((d, i) => ({ data: d, label: legendData.labels[i], color: legendData.colors[i], size: legendData.sizes[i] }))
                .sort((a, b) => b.size - a.size);
            // シンボルグループを作成
            const symbolGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-legend-symbols');
            // 線を中央揃えで重ね表示
            sortedData.forEach((item, i) => {
                symbolGroup
                    .append('line')
                    .attr('x1', 0)
                    .attr('y1', centerY)
                    .attr('x2', lineLength)
                    .attr('y2', centerY)
                    .attr('stroke', item.color)
                    .attr('stroke-width', item.size)
                    .attr('opacity', 0.8);
            });
            // ラベルを右側に統一配置
            const labelGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-legend-labels');
            const labelStartX = lineLength + 10;
            const labelSpacing = this.fontSize + 4;
            sortedData.forEach((item, i) => {
                labelGroup
                    .append('text')
                    .attr('x', labelStartX)
                    .attr('y', centerY - maxSize / 2 + i * labelSpacing + this.fontSize)
                    .attr('dy', '0.35em')
                    .style('font-size', `${this.fontSize}px`)
                    .style('fill', '#333')
                    .text(item.label);
            });
        }
        /**
         * 通常モードでサイズスケール凡例を描画します
         * @param legendData - 凡例データ
         * @param titleOffset - タイトルのオフセット
         * @private
         */
        renderRegularSizeScale(legendData, titleOffset) {
            if (!this.layerGroup || !legendData.sizes)
                return;
            const items = this.layerGroup
                .selectAll('.thematika-legend-item')
                .data(legendData.data)
                .enter()
                .append('g')
                .attr('class', 'thematika-legend-item');
            // サイズスケールが有効な場合の可変サイズ表示
            switch (this.symbolType) {
                case 'circle':
                    this.renderRegularSizeCircles(items, legendData, titleOffset);
                    break;
                case 'cell':
                    this.renderRegularSizeCells(items, legendData, titleOffset);
                    break;
                case 'line':
                    this.renderRegularSizeLines(items, legendData, titleOffset);
                    break;
                default:
                    this.renderRegularSizeCircles(items, legendData, titleOffset);
                    break;
            }
        }
        /**
         * 通常モードでサイズ可変の円を描画します
         * @private
         */
        renderRegularSizeCircles(items, legendData, titleOffset) {
            if (!legendData.sizes)
                return;
            // 円の描画
            items
                .append('circle')
                .attr('cx', (d, i) => legendData.sizes[i])
                .attr('cy', (d, i) => legendData.sizes[i])
                .attr('r', (d, i) => legendData.sizes[i])
                .attr('fill', (d, i) => legendData.colors[i])
                .attr('stroke', '#333')
                .attr('stroke-width', 0.5);
            // ラベルの描画
            items
                .append('text')
                .attr('x', (d, i) => legendData.sizes[i] * 2 + 4)
                .attr('y', (d, i) => {
                // 横方向の場合は0、縦方向の場合は中央揃え
                if (this.orientation === 'horizontal') {
                    return 0;
                }
                else {
                    return legendData.sizes[i]; // 中央揃え
                }
            })
                .attr('dy', (d, i) => {
                // 横方向の場合は0、縦方向の場合は0.35em
                if (this.orientation === 'horizontal') {
                    return 0;
                }
                else {
                    return '0.35em';
                }
            })
                .style('font-size', `${this.fontSize}px`)
                .style('fill', '#333')
                .text((d, i) => legendData.labels[i]);
            // 配置の設定（サイズ情報も渡す）
            this.positionItems(items, titleOffset, legendData.sizes);
        }
        /**
         * 通常モードでサイズ可変のセルを描画します
         * @private
         */
        renderRegularSizeCells(items, legendData, titleOffset) {
            if (!legendData.sizes)
                return;
            // セルの描画（面積からサイズを計算）
            items
                .append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', (d, i) => Math.sqrt(legendData.sizes[i]))
                .attr('height', (d, i) => Math.sqrt(legendData.sizes[i]))
                .attr('fill', (d, i) => legendData.colors[i])
                .attr('stroke', '#333')
                .attr('stroke-width', 0.5);
            // ラベルの描画
            items
                .append('text')
                .attr('x', (d, i) => Math.sqrt(legendData.sizes[i]) + 4)
                .attr('y', (d, i) => {
                // 横方向の場合は0、縦方向の場合は中央揃え
                if (this.orientation === 'horizontal') {
                    return 0;
                }
                else {
                    return Math.sqrt(legendData.sizes[i]) / 2; // 中央揃え
                }
            })
                .attr('dy', (d, i) => {
                // 横方向の場合は0、縦方向の場合は0.35em
                if (this.orientation === 'horizontal') {
                    return 0;
                }
                else {
                    return '0.35em';
                }
            })
                .style('font-size', `${this.fontSize}px`)
                .style('fill', '#333')
                .text((d, i) => legendData.labels[i]);
            // 配置の設定（サイズ情報も渡す）
            this.positionItems(items, titleOffset, legendData.sizes);
        }
        /**
         * 通常モードでサイズ可変の線を描画します
         * @private
         */
        renderRegularSizeLines(items, legendData, titleOffset) {
            if (!legendData.sizes)
                return;
            const lineLength = 24;
            // 線の描画
            items
                .append('line')
                .attr('x1', 0)
                .attr('y1', 8)
                .attr('x2', lineLength)
                .attr('y2', 8)
                .attr('stroke', (d, i) => legendData.colors[i])
                .attr('stroke-width', (d, i) => legendData.sizes[i]);
            // ラベルの描画
            items
                .append('text')
                .attr('x', lineLength + 4)
                .attr('y', (d, i) => {
                // 横方向の場合は0、縦方向の場合は線の中央
                if (this.orientation === 'horizontal') {
                    return 0;
                }
                else {
                    return 8; // 線の中央
                }
            })
                .attr('dy', (d, i) => {
                // 横方向の場合は0、縦方向の場合は0.35em
                if (this.orientation === 'horizontal') {
                    return 0;
                }
                else {
                    return '0.35em';
                }
            })
                .style('font-size', `${this.fontSize}px`)
                .style('fill', '#333')
                .text((d, i) => legendData.labels[i]);
            // 配置の設定（サイズ情報も渡す）
            this.positionItems(items, titleOffset, legendData.sizes);
        }
        /**
         * アイテムの配置を設定します
         * @param items - アイテムの選択セット
         * @param titleOffset - タイトルのオフセット
         * @param sizes - サイズ配列（サイズスケール時のボトム揃え用）
         * @private
         */
        positionItems(items, titleOffset, sizes) {
            if (this.orientation === 'vertical') {
                items.attr('transform', (d, i) => `translate(0, ${titleOffset + i * this.itemSpacing})`);
            }
            else {
                // 水平配置
                if (sizes && this.hasSizeScale()) {
                    // サイズスケール時はボトム揃え
                    const maxSize = Math.max(...sizes);
                    items.attr('transform', (d, i) => {
                        const symbolSize = sizes[i];
                        // シンボルタイプに応じてボトム揃えのオフセットを計算
                        let bottomOffset = 0;
                        if (this.symbolType === 'circle') {
                            bottomOffset = maxSize - symbolSize; // 半径の差
                        }
                        else if (this.symbolType === 'cell') {
                            bottomOffset = Math.sqrt(maxSize) - Math.sqrt(symbolSize); // 一辺の長さの差
                        }
                        return `translate(${i * this.itemSpacing}, ${titleOffset + bottomOffset})`;
                    });
                }
                else {
                    // 通常配置
                    items.attr('transform', (d, i) => `translate(${i * this.itemSpacing}, ${titleOffset})`);
                }
            }
        }
        /**
         * 背景ボックスを描画します
         * @private
         */
        renderBackground() {
            if (!this.layerGroup)
                return;
            // 凡例の境界ボックスを計算
            const legendBBox = this.calculateLegendBounds();
            const padding = this.backgroundStyle.padding || 8;
            // 背景の透明度を設定（showBackgroundがfalseの場合は0）
            const backgroundOpacity = this.showBackground
                ? (this.backgroundStyle.opacity || 0.9)
                : 0;
            // 背景矩形を最初に挿入（z-orderを背面にするため）
            const background = this.layerGroup
                .insert('rect', ':first-child')
                .attr('class', 'thematika-legend-background')
                .attr('x', legendBBox.x - padding)
                .attr('y', legendBBox.y - padding)
                .attr('width', legendBBox.width + padding * 2)
                .attr('height', legendBBox.height + padding * 2)
                .attr('fill', this.backgroundStyle.fill || '#ffffff')
                .attr('stroke', this.backgroundStyle.stroke || '#cccccc')
                .attr('stroke-width', this.backgroundStyle.strokeWidth || 1)
                .attr('opacity', backgroundOpacity);
            // 角丸を設定
            if (this.backgroundStyle.rx) {
                background.attr('rx', this.backgroundStyle.rx);
            }
            if (this.backgroundStyle.ry) {
                background.attr('ry', this.backgroundStyle.ry);
            }
        }
        /**
         * 凡例の境界ボックスを計算します
         * @returns 境界ボックス
         * @private
         */
        calculateLegendBounds() {
            if (!this.layerGroup) {
                return { x: 0, y: 0, width: 100, height: 50 };
            }
            try {
                // レイヤーグループのboundingBoxを取得
                const bbox = this.layerGroup.node().getBBox();
                return {
                    x: bbox.x,
                    y: bbox.y,
                    width: bbox.width,
                    height: bbox.height
                };
            }
            catch (error) {
                // フォールバック値
                const itemCount = this.generateLegendData().data.length;
                const titleHeight = this.title ? this.fontSize + 10 : 0;
                if (this.orientation === 'vertical') {
                    return {
                        x: 0,
                        y: 0,
                        width: 150,
                        height: titleHeight + itemCount * this.itemSpacing
                    };
                }
                else {
                    return {
                        x: 0,
                        y: 0,
                        width: itemCount * 100,
                        height: titleHeight + 30
                    };
                }
            }
        }
        /**
         * 位置のtransformを更新します
         * @private
         */
        updatePositionTransform() {
            if (!this.layerGroup)
                return;
            // 直接ピクセル値を使用
            const x = this.position.left;
            const y = this.position.top;
            this.layerGroup.attr('transform', `translate(${x}, ${y})`);
        }
        /**
         * ドラッグ動作を設定します
         * @private
         */
        setupDragBehavior() {
            if (!this.layerGroup)
                return;
            const dragBehavior = drag()
                .on('start', () => {
                // ドラッグ開始時の処理
                if (this.layerGroup) {
                    this.layerGroup.style('cursor', 'grabbing');
                }
            })
                .on('drag', (event) => {
                // ドラッグ中の処理
                this.position.left += event.dx;
                this.position.top += event.dy;
                this.updatePositionTransform();
                // スライダーがある場合は更新
                this.updateSliders();
            })
                .on('end', () => {
                // ドラッグ終了時の処理
                if (this.layerGroup) {
                    this.layerGroup.style('cursor', 'grab');
                }
            });
            // ドラッグ動作をレイヤーグループに適用
            this.layerGroup
                .style('cursor', 'grab')
                .call(dragBehavior);
        }
        /**
         * スライダーの値を更新します（デモページ用）
         * @private
         */
        updateSliders() {
            // ブラウザ環境でのみ実行
            if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                const xSlider = document.getElementById('legend-x-slider');
                const ySlider = document.getElementById('legend-y-slider');
                const xValue = document.getElementById('legend-x-value');
                const yValue = document.getElementById('legend-y-value');
                if (xSlider && ySlider && xValue && yValue) {
                    xSlider.value = this.position.left.toString();
                    ySlider.value = this.position.top.toString();
                    xValue.textContent = this.position.left.toString();
                    yValue.textContent = this.position.top.toString();
                }
            }
        }
        /**
         * 背景ボックスの透明度のみを更新します
         * @private
         */
        updateBackgroundOpacity() {
            if (!this.layerGroup)
                return;
            const background = this.layerGroup.select('.thematika-legend-background');
            if (!background.empty()) {
                const backgroundOpacity = this.showBackground
                    ? (this.backgroundStyle.opacity || 0.9)
                    : 0;
                background.attr('opacity', backgroundOpacity);
            }
        }
        /**
         * 背景ボックスのスタイルを更新します
         * @private
         */
        updateBackgroundStyles() {
            if (!this.layerGroup)
                return;
            const background = this.layerGroup.select('.thematika-legend-background');
            if (!background.empty()) {
                const backgroundOpacity = this.showBackground
                    ? (this.backgroundStyle.opacity || 0.9)
                    : 0;
                background
                    .attr('fill', this.backgroundStyle.fill || '#ffffff')
                    .attr('stroke', this.backgroundStyle.stroke || '#cccccc')
                    .attr('stroke-width', this.backgroundStyle.strokeWidth || 1)
                    .attr('opacity', backgroundOpacity)
                    .attr('rx', this.backgroundStyle.rx || null)
                    .attr('ry', this.backgroundStyle.ry || null);
            }
        }
        /**
         * リサイズイベントの監視を設定します
         * @private
         */
        setupResizeListener() {
            // ピクセル値を使用する場合、リサイズイベントの監視は不要
        }
    }

    /**
     * GIS関連のユーティリティ関数
     * GeoJSONデータの解析と計算に特化したユーティリティ集
     */
    /**
     * 座標の配列から最小値と最大値を取得するヘルパー関数
     */
    function getMinMax(coords) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x, y] of coords) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
        return [minX, minY, maxX, maxY];
    }
    /**
     * ジオメトリから全ての座標を抽出するヘルパー関数
     */
    function extractCoordinates(geometry) {
        const coords = [];
        switch (geometry.type) {
            case 'Point':
                coords.push(geometry.coordinates);
                break;
            case 'LineString':
                coords.push(...geometry.coordinates);
                break;
            case 'Polygon':
                geometry.coordinates.forEach(ring => coords.push(...ring));
                break;
            case 'MultiPoint':
                coords.push(...geometry.coordinates);
                break;
            case 'MultiLineString':
                geometry.coordinates.forEach(line => coords.push(...line));
                break;
            case 'MultiPolygon':
                geometry.coordinates.forEach(polygon => polygon.forEach(ring => coords.push(...ring)));
                break;
            case 'GeometryCollection':
                geometry.geometries.forEach(geom => coords.push(...extractCoordinates(geom)));
                break;
        }
        return coords;
    }
    /**
     * GeoJSONからBounding Boxを取得する
     * @param geojson - GeoJSONオブジェクト
     * @returns Bounding Box
     */
    function getBbox(geojson) {
        const allCoords = [];
        if (geojson.type === 'Feature') {
            allCoords.push(...extractCoordinates(geojson.geometry));
        }
        else if (geojson.type === 'FeatureCollection') {
            geojson.features.forEach(feature => {
                allCoords.push(...extractCoordinates(feature.geometry));
            });
        }
        else if ('coordinates' in geojson || 'geometries' in geojson) {
            allCoords.push(...extractCoordinates(geojson));
        }
        if (allCoords.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }
        const [minX, minY, maxX, maxY] = getMinMax(allCoords);
        return { minX, minY, maxX, maxY };
    }
    /**
     * GeoJSONから中心点を取得する（単純な平均計算）
     * @param geojson - GeoJSONオブジェクト
     * @returns 中心点の座標
     */
    function getCentroid(geojson) {
        const allCoords = [];
        if (geojson.type === 'Feature') {
            allCoords.push(...extractCoordinates(geojson.geometry));
        }
        else if (geojson.type === 'FeatureCollection') {
            geojson.features.forEach(feature => {
                allCoords.push(...extractCoordinates(feature.geometry));
            });
        }
        else if ('coordinates' in geojson || 'geometries' in geojson) {
            allCoords.push(...extractCoordinates(geojson));
        }
        if (allCoords.length === 0) {
            return { x: 0, y: 0 };
        }
        let sumX = 0, sumY = 0;
        for (const [x, y] of allCoords) {
            sumX += x;
            sumY += y;
        }
        return {
            x: sumX / allCoords.length,
            y: sumY / allCoords.length
        };
    }
    /**
     * 複数のGeoJSONをマージする
     * @param geojsons - GeoJSONオブジェクトの配列
     * @returns マージされたFeatureCollection
     */
    function merge(geojsons) {
        const features = [];
        geojsons.forEach((geojson) => {
            if (geojson.type === 'Feature') {
                features.push(geojson);
            }
            else if (geojson.type === 'FeatureCollection') {
                features.push(...geojson.features);
            }
            else if ('coordinates' in geojson || 'geometries' in geojson) {
                // Geometry型の場合はFeatureに変換
                features.push({
                    type: 'Feature',
                    properties: {},
                    geometry: geojson
                });
            }
        });
        return {
            type: 'FeatureCollection',
            features
        };
    }
    /**
     * GeoJSONが有効かどうかをチェックする
     * @param geojson - チェックするオブジェクト
     * @returns 有効なGeoJSONかどうか
     */
    function isValidGeoJSON(geojson) {
        try {
            if (!geojson || typeof geojson !== 'object')
                return false;
            // GeoJSONの基本的な型をチェック
            const validTypes = ['Feature', 'FeatureCollection', 'Point', 'LineString',
                'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon',
                'GeometryCollection'];
            return validTypes.includes(geojson.type);
        }
        catch {
            return false;
        }
    }
    /**
     * Bounding Boxから中心点を計算する
     * @param bbox - Bounding Box
     * @returns 中心点の座標
     */
    function getBboxCenter(bbox) {
        return {
            x: (bbox.minX + bbox.maxX) / 2,
            y: (bbox.minY + bbox.maxY) / 2
        };
    }
    /**
     * Bounding Boxの幅と高さを取得する
     * @param bbox - Bounding Box
     * @returns 幅と高さ
     */
    function getBboxDimensions(bbox) {
        return {
            width: bbox.maxX - bbox.minX,
            height: bbox.maxY - bbox.minY
        };
    }
    /**
     * 2つのBounding Boxをマージする
     * @param bbox1 - 1つ目のBounding Box
     * @param bbox2 - 2つ目のBounding Box
     * @returns マージされたBounding Box
     */
    function mergeBbox(bbox1, bbox2) {
        return {
            minX: Math.min(bbox1.minX, bbox2.minX),
            minY: Math.min(bbox1.minY, bbox2.minY),
            maxX: Math.max(bbox1.maxX, bbox2.maxX),
            maxY: Math.max(bbox1.maxY, bbox2.maxY)
        };
    }
    /**
     * Bounding Boxを拡張する
     * @param bbox - Bounding Box
     * @param padding - パディング（割合）
     * @returns 拡張されたBounding Box
     */
    function expandBbox(bbox, padding = 0.1) {
        const { width, height } = getBboxDimensions(bbox);
        const padX = width * padding;
        const padY = height * padding;
        return {
            minX: bbox.minX - padX,
            minY: bbox.minY - padY,
            maxX: bbox.maxX + padX,
            maxY: bbox.maxY + padY
        };
    }

    /**
     * GeoJSONデータをサークル要素として描画するレイヤークラス
     * ポイントならそのまま、ポリゴンやラインなら中心点にサークルを配置
     */
    class PointCircleLayer extends BaseLayer {
        /**
         * PointCircleLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options) {
            // 一意のIDを自動生成
            super(`point-circle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
            // データの正規化
            this.data = Array.isArray(options.data)
                ? { type: 'FeatureCollection', features: options.data }
                : options.data;
            // 半径設定の処理
            if (typeof options.r === 'function') {
                this.radiusFunction = options.r;
            }
            else {
                const radius = options.r || 5; // デフォルト半径は5
                this.radiusFunction = () => radius;
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.renderCircles();
        }
        /**
         * 投影法を設定します
         * @param projection - 新しい投影法
         */
        setProjection(projection) {
            this.projection = projection;
            // 投影法が変更されたら再描画
            if (this.layerGroup) {
                this.renderCircles();
            }
        }
        /**
         * サークルを描画します
         * @private
         */
        renderCircles() {
            if (!this.layerGroup || !this.projection)
                return;
            // 既存のサークルを削除
            this.layerGroup.selectAll('g.thematika-point-circle-layer').remove();
            // 各フィーチャーの座標を取得
            const circleData = this.data.features.map((feature, index) => {
                let coordinates;
                if (feature.geometry.type === 'Point') {
                    // ポイントの場合はそのまま使用
                    coordinates = feature.geometry.coordinates;
                }
                else {
                    // ポリゴンやラインの場合は中心点を計算
                    const centroid = getCentroid(feature);
                    coordinates = [centroid.x, centroid.y];
                }
                // 投影法で座標変換
                const projectedCoords = this.projection(coordinates);
                return {
                    feature,
                    index,
                    x: projectedCoords ? projectedCoords[0] : 0,
                    y: projectedCoords ? projectedCoords[1] : 0,
                    r: this.radiusFunction(feature, index)
                };
            }).filter(d => d.x !== null && d.y !== null); // 投影できない座標を除外
            // サークル要素を作成
            const circles = this.layerGroup
                .append('g')
                .attr('class', 'thematika-point-circle-layer')
                .selectAll('circle')
                .data(circleData)
                .enter()
                .append('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
                .attr('r', d => d.r)
                .attr('class', d => {
                const baseClass = 'thematika-point-circle';
                const customClass = this.attr.className || '';
                const featureClass = d.feature.properties?.class || '';
                return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
            });
            // 属性とスタイルを適用（共通メソッドを使用）
            this.applyAllStylesToElements(circles, this.layerGroup);
        }
        /**
         * GeoJSONデータを取得します
         * @returns 現在のGeoJSONデータ
         */
        getData() {
            return this.data;
        }
    }

    /**
     * GeoJSONデータをシンボル要素として描画するレイヤークラス
     * ポイントならそのまま、ポリゴンやラインなら中心点にシンボルを配置
     */
    class PointSymbolLayer extends BaseLayer {
        /**
         * PointSymbolLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options) {
            // 一意のIDを自動生成
            super(`point-symbol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
            // データの正規化
            this.data = Array.isArray(options.data)
                ? { type: 'FeatureCollection', features: options.data }
                : options.data;
            // サイズ設定の処理
            if (typeof options.size === 'function') {
                this.sizeFunction = options.size;
            }
            else {
                const size = options.size || 64; // デフォルトサイズは64（8x8ピクセル相当）
                this.sizeFunction = () => size;
            }
            // シンボルタイプ設定の処理
            if (typeof options.symbolType === 'function') {
                this.symbolTypeFunction = options.symbolType;
            }
            else {
                const symbolType = options.symbolType || d3Shape.symbolCross; // デフォルトはcross
                this.symbolTypeFunction = () => symbolType;
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.renderSymbols();
        }
        /**
         * 投影法を設定します
         * @param projection - 新しい投影法
         */
        setProjection(projection) {
            this.projection = projection;
            // 投影法が変更されたら再描画
            if (this.layerGroup) {
                this.renderSymbols();
            }
        }
        /**
         * シンボルを描画します
         * @private
         */
        renderSymbols() {
            if (!this.layerGroup || !this.projection)
                return;
            // 既存のシンボルを削除
            this.layerGroup.selectAll('g.thematika-point-symbol-layer').remove();
            // 各フィーチャーの座標を取得
            const symbolData = this.data.features.map((feature, index) => {
                let coordinates;
                if (feature.geometry.type === 'Point') {
                    // ポイントの場合はそのまま使用
                    coordinates = feature.geometry.coordinates;
                }
                else {
                    // ポリゴンやラインの場合は中心点を計算
                    const centroid = getCentroid(feature);
                    coordinates = [centroid.x, centroid.y];
                }
                // 投影法で座標変換
                const projectedCoords = this.projection(coordinates);
                return {
                    feature,
                    index,
                    x: projectedCoords ? projectedCoords[0] : 0,
                    y: projectedCoords ? projectedCoords[1] : 0,
                    size: this.sizeFunction(feature, index),
                    symbolType: this.symbolTypeFunction(feature, index)
                };
            }).filter(d => d.x !== null && d.y !== null); // 投影できない座標を除外
            // シンボル要素を作成
            const symbols = this.layerGroup
                .append('g')
                .attr('class', 'thematika-point-symbol-layer')
                .selectAll('path')
                .data(symbolData)
                .enter()
                .append('path')
                .attr('transform', d => `translate(${d.x}, ${d.y})`)
                .attr('d', d => {
                const symbolGenerator = d3Shape.symbol()
                    .type(d.symbolType)
                    .size(d.size);
                return symbolGenerator() || '';
            })
                .attr('class', d => {
                const baseClass = 'thematika-point-symbol';
                const customClass = this.attr.className || '';
                const featureClass = d.feature.properties?.class || '';
                return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
            });
            // 属性とスタイルを適用（共通メソッドを使用）
            this.applyAllStylesToElements(symbols, this.layerGroup);
        }
        /**
         * GeoJSONデータを取得します
         * @returns 現在のGeoJSONデータ
         */
        getData() {
            return this.data;
        }
    }

    /**
     * GeoJSONデータをスパイク要素として描画するレイヤークラス
     * ポイントならそのまま、ポリゴンやラインなら中心点にスパイクを配置
     */
    class PointSpikeLayer extends BaseLayer {
        /**
         * PointSpikeLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options) {
            // 一意のIDを自動生成
            super(`point-spike-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
            // データの正規化
            this.data = Array.isArray(options.data)
                ? { type: 'FeatureCollection', features: options.data }
                : options.data;
            // 長さ設定の処理
            if (typeof options.length === 'function') {
                this.lengthFunction = options.length;
            }
            else {
                const length = options.length || 50; // デフォルト長さは50
                this.lengthFunction = () => length;
            }
            // 方向設定の処理
            this.direction = options.direction || 'up';
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.renderSpikes();
        }
        /**
         * 投影法を設定します
         * @param projection - 新しい投影法
         */
        setProjection(projection) {
            this.projection = projection;
            // 投影法が変更されたら再描画
            if (this.layerGroup) {
                this.renderSpikes();
            }
        }
        /**
         * スパイクを描画します
         * @private
         */
        renderSpikes() {
            if (!this.layerGroup || !this.projection)
                return;
            // 既存のスパイクを削除
            this.layerGroup.selectAll('g.thematika-point-spike-layer').remove();
            // 各フィーチャーの座標を取得
            const spikeData = this.data.features.map((feature, index) => {
                let coordinates;
                if (feature.geometry.type === 'Point') {
                    // ポイントの場合はそのまま使用
                    coordinates = feature.geometry.coordinates;
                }
                else {
                    // ポリゴンやラインの場合は中心点を計算
                    const centroid = getCentroid(feature);
                    coordinates = [centroid.x, centroid.y];
                }
                // 投影法で座標変換
                const projectedCoords = this.projection(coordinates);
                return {
                    feature,
                    index,
                    x: projectedCoords ? projectedCoords[0] : 0,
                    y: projectedCoords ? projectedCoords[1] : 0,
                    length: this.lengthFunction(feature, index)
                };
            }).filter(d => d.x !== null && d.y !== null); // 投影できない座標を除外
            // スパイク要素を作成
            const spikes = this.layerGroup
                .append('g')
                .attr('class', 'thematika-point-spike-layer')
                .selectAll('path')
                .data(spikeData)
                .enter()
                .append('path')
                .attr('transform', d => `translate(${d.x},${d.y})`)
                .attr('d', d => this.generateSpikePath(d.length))
                .attr('class', d => {
                const baseClass = 'thematika-point-spike';
                const customClass = this.attr.className || '';
                const featureClass = d.feature.properties?.class || '';
                return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
            });
            // 属性とスタイルを適用（共通メソッドを使用）
            this.applyAllStylesToElements(spikes, this.layerGroup);
        }
        /**
         * スパイクのSVGパス文字列を生成します
         * @param length - スパイクの長さ
         * @returns SVGパス文字列
         * @private
         */
        generateSpikePath(length) {
            const width = length * 0.2; // スパイクの幅は長さの20%
            switch (this.direction) {
                case 'up':
                    return `M 0,0 L ${-width / 2},0 L 0,${-length} L ${width / 2},0 Z`;
                case 'down':
                    return `M 0,0 L ${-width / 2},0 L 0,${length} L ${width / 2},0 Z`;
                case 'left':
                    return `M 0,0 L 0,${-width / 2} L ${-length},0 L 0,${width / 2} Z`;
                case 'right':
                    return `M 0,0 L 0,${-width / 2} L ${length},0 L 0,${width / 2} Z`;
                default:
                    return `M 0,0 L ${-width / 2},0 L 0,${-length} L ${width / 2},0 Z`;
            }
        }
        /**
         * GeoJSONデータを取得します
         * @returns 現在のGeoJSONデータ
         */
        getData() {
            return this.data;
        }
    }

    /**
     * 複数点間をラインで接続するレイヤークラス
     * LineString/MultiLineString形式のGeoJSONデータをサポート
     */
    class LineConnectionLayer extends BaseLayer {
        /**
         * LineConnectionLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options) {
            // 一意のIDを自動生成
            super(`line-connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
            // データをFeatureCollectionに正規化
            if (Array.isArray(options.data)) {
                // Feature配列の場合
                this.data = { type: 'FeatureCollection', features: options.data };
            }
            else if (options.data.type === 'Feature') {
                // 単一Featureの場合
                this.data = { type: 'FeatureCollection', features: [options.data] };
            }
            else {
                // FeatureCollectionの場合
                this.data = options.data;
            }
            // データ検証
            this.validateData(this.data);
            this.lineType = options.lineType || 'straight';
            this.arcHeight = options.arcHeight || 0.3;
            this.arcControlPoint = options.arcControlPoint || 'center';
            this.arcOffset = options.arcOffset || 'perpendicular';
            this.startArrow = options.startArrow || false;
            this.endArrow = options.endArrow || false;
            this.arrowSize = options.arrowSize || 10;
            this.smoothType = options.smoothType || 'curveBasis';
        }
        /**
         * データを検証します
         * @param data - 検証対象のデータ
         * @private
         */
        validateData(data) {
            if (!data || data.type !== 'FeatureCollection') {
                throw new Error('LineConnectionLayer: データはFeatureCollectionである必要があります');
            }
            if (!Array.isArray(data.features)) {
                throw new Error('LineConnectionLayer: featuresが配列ではありません');
            }
            data.features.forEach((feature, index) => {
                if (!feature.geometry) {
                    throw new Error(`LineConnectionLayer: フィーチャー[${index}]にgeometryが存在しません`);
                }
                const geometry = feature.geometry;
                const { type, coordinates } = geometry;
                if (type !== 'LineString' && type !== 'MultiLineString') {
                    throw new Error(`LineConnectionLayer: フィーチャー[${index}]は'LineString'または'MultiLineString'である必要があります`);
                }
                // 座標の検証
                if (type === 'LineString') {
                    this.validateCoordinates(coordinates, index);
                }
                else if (type === 'MultiLineString') {
                    coordinates.forEach((line, lineIndex) => {
                        this.validateCoordinates(line, index, lineIndex);
                    });
                }
            });
        }
        /**
         * 座標配列を検証します
         * @private
         */
        validateCoordinates(coordinates, featureIndex, lineIndex) {
            const lineId = lineIndex !== undefined ? `[${featureIndex}]のライン[${lineIndex}]` : `[${featureIndex}]`;
            if (!Array.isArray(coordinates) || coordinates.length < 2) {
                throw new Error(`LineConnectionLayer: フィーチャー${lineId}は少なくとも2点の座標が必要です`);
            }
            coordinates.forEach((coord, coordIndex) => {
                if (!Array.isArray(coord) || coord.length < 2) {
                    throw new Error(`LineConnectionLayer: フィーチャー${lineId}の座標[${coordIndex}]は[経度, 緯度]の配列である必要があります`);
                }
                const [lon, lat] = coord;
                if (lon < -180 || lon > 180) {
                    throw new Error(`LineConnectionLayer: フィーチャー${lineId}の座標[${coordIndex}]の経度は-180から180の範囲である必要があります`);
                }
                if (lat < -90 || lat > 90) {
                    throw new Error(`LineConnectionLayer: フィーチャー${lineId}の座標[${coordIndex}]の緯度は-90から90の範囲である必要があります`);
                }
            });
        }
        /**
         * 投影法を設定します
         * @param projection - 地図投影法
         */
        setProjection(projection) {
            this.projection = projection;
            this.path = d3Geo.geoPath(projection);
            if (this.layerGroup) {
                this.layerGroup.selectAll('path').remove();
                this.layerGroup.selectAll('defs').remove();
                this.createArrowMarkers();
                this.renderLines();
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.createArrowMarkers();
            this.renderLines();
        }
        /**
         * 矢印のマーカーを作成します
         * @private
         */
        createArrowMarkers() {
            if (!this.layerGroup || (!this.startArrow && !this.endArrow))
                return;
            // defsを作成
            const defs = this.layerGroup.append('defs')
                .attr('class', 'thematika-line-connection-defs');
            // 基本的なマーカーを格納（後でdynamic markersが作成される）
            this.defs = defs;
        }
        /**
         * ライン描画を実行します（リファクタリング版：一括データバインディング）
         * @private
         */
        renderLines() {
            if (!this.layerGroup || !this.path || !this.projection)
                return;
            const lineGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-line-connection-layer');
            // 全ラインデータを準備
            const allLinesData = this.prepareAllLinesData();
            if (allLinesData.length === 0)
                return;
            // D3データバインディングで一括処理
            const paths = lineGroup
                .selectAll('.thematika-line-path')
                .data(allLinesData)
                .enter()
                .append('path')
                .attr('class', (d, i) => {
                const baseClass = 'thematika-line-path thematika-connection-line';
                const customClass = this.attr.className || '';
                const featureClass = d.feature.properties?.class || '';
                const lineClass = d.lineIndex !== undefined ? `line-${d.lineIndex}` : '';
                const globalLineClass = `global-line-${i}`;
                return [baseClass, customClass, featureClass, lineClass, globalLineClass].filter(Boolean).join(' ');
            })
                .attr('d', d => d.pathData)
                .style('fill', 'none');
            // 属性とスタイルを一括適用
            super.applyAllStylesToElements(paths, this.layerGroup);
            // 矢印マーカーを適用（スタイル適用後）
            this.applyArrowMarkers(paths);
        }
        /**
         * 全フィーチャーから統一されたラインデータを準備します
         * @returns 統一されたラインデータの配列
         * @private
         */
        prepareAllLinesData() {
            const allLinesData = [];
            this.data.features.forEach((feature, featureIndex) => {
                const geometry = feature.geometry;
                if (geometry.type === 'LineString') {
                    const coordinates = geometry.coordinates;
                    const pathData = this.generateLinePath(coordinates);
                    if (pathData) {
                        allLinesData.push({
                            feature,
                            featureIndex,
                            coordinates,
                            pathData,
                            needsStartArrow: this.startArrow,
                            needsEndArrow: this.endArrow
                        });
                    }
                }
                else if (geometry.type === 'MultiLineString') {
                    geometry.coordinates.forEach((line, lineIndex) => {
                        const pathData = this.generateLinePath(line);
                        if (pathData) {
                            allLinesData.push({
                                feature,
                                featureIndex,
                                coordinates: line,
                                lineIndex,
                                pathData,
                                needsStartArrow: this.startArrow,
                                needsEndArrow: this.endArrow
                            });
                        }
                    });
                }
            });
            return allLinesData;
        }
        /**
         * パス要素に矢印マーカーを適用します
         * @param paths - パス要素のselection
         * @private
         */
        applyArrowMarkers(paths) {
            if (!this.defs)
                return;
            const self = this;
            paths.each(function (d, i) {
                const path = d3Selection.select(this);
                // パスの現在のstroke色を取得
                const strokeColor = path.style('stroke') || path.attr('stroke') || '#333';
                if (d.needsStartArrow) {
                    const startMarkerId = `arrow-start-${self.id}-${i}`;
                    self.createDynamicMarker(startMarkerId, strokeColor, 'start');
                    path.attr('marker-start', `url(#${startMarkerId})`);
                }
                if (d.needsEndArrow) {
                    const endMarkerId = `arrow-end-${self.id}-${i}`;
                    self.createDynamicMarker(endMarkerId, strokeColor, 'end');
                    path.attr('marker-end', `url(#${endMarkerId})`);
                }
            });
        }
        /**
         * 動的に色付きマーカーを作成します
         * @param markerId - マーカーID
         * @param color - 矢印の色
         * @param type - マーカータイプ（start/end）
         * @private
         */
        createDynamicMarker(markerId, color, type) {
            if (!this.defs)
                return;
            // 既存のマーカーがあれば削除
            this.defs.select(`#${markerId}`).remove();
            const marker = this.defs.append('marker')
                .attr('id', markerId)
                .attr('viewBox', '0 0 10 10')
                .attr('markerWidth', this.arrowSize)
                .attr('markerHeight', this.arrowSize);
            if (type === 'start') {
                marker
                    .attr('refX', 1)
                    .attr('refY', 5)
                    .attr('orient', 'auto-start-reverse');
            }
            else {
                marker
                    .attr('refX', 9)
                    .attr('refY', 5)
                    .attr('orient', 'auto');
            }
            marker.append('path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                .style('fill', color);
        }
        /**
         * LineStringをセグメントごとに描画します（旧実装 - 非推奨）
         * @deprecated 新しいrenderLines()メソッドで置き換えられました
         * @private
         */
        /*
        private renderLineString(
          container: Selection<SVGGElement, unknown, HTMLElement, any>,
          coordinates: GeoJSON.Position[],
          feature: GeoJSON.Feature,
          featureIndex: number,
          lineIndex?: number
        ): void {
          // この実装は新しいrenderLines()メソッドで置き換えられました
        }
        */
        /**
         * セグメントのパスを生成します
         * @param start - 開始点の地理座標
         * @param end - 終了点の地理座標
         * @returns SVGパス文字列
         * @private
         */
        generateSegmentPath(start, end) {
            if (!this.projection)
                return '';
            const startPoint = this.projection(start);
            const endPoint = this.projection(end);
            if (!startPoint || !endPoint)
                return '';
            if (this.lineType === 'straight') {
                return `M${startPoint[0]},${startPoint[1]}L${endPoint[0]},${endPoint[1]}`;
            }
            else if (this.lineType === 'arc') {
                return this.generateArcPath(start, end, startPoint, endPoint);
            }
            else if (this.lineType === 'smooth') {
                // スムージングの場合は単一セグメントでは意味がないので直線として処理
                return `M${startPoint[0]},${startPoint[1]}L${endPoint[0]},${endPoint[1]}`;
            }
            else {
                return `M${startPoint[0]},${startPoint[1]}L${endPoint[0]},${endPoint[1]}`;
            }
        }
        /**
         * アークパスを生成します
         * @param start - 開始点の地理座標
         * @param end - 終了点の地理座標
         * @param startPoint - 開始点のピクセル座標
         * @param endPoint - 終了点のピクセル座標
         * @returns SVGパス文字列
         * @private
         */
        generateArcPath(start, end, startPoint, endPoint) {
            if (!this.projection)
                return '';
            // 制御点の基準位置を計算
            const baseControlPoint = this.calculateBaseControlPoint(start, end, startPoint, endPoint);
            if (!baseControlPoint)
                return '';
            // オフセットを適用して最終的な制御点を計算
            const controlPoint = this.applyArcOffset(baseControlPoint, startPoint, endPoint);
            // 二次ベジェ曲線でアークを描画
            return `M${startPoint[0]},${startPoint[1]}Q${controlPoint[0]},${controlPoint[1]} ${endPoint[0]},${endPoint[1]}`;
        }
        /**
         * アーク制御点の基準位置を計算します
         * @private
         */
        calculateBaseControlPoint(start, end, startPoint, endPoint) {
            if (!this.projection)
                return null;
            switch (this.arcControlPoint) {
                case 'center':
                    // 単純な数学的中点（地理的要因を無視）
                    const simpleMidGeo = [
                        (start[0] + end[0]) / 2,
                        (start[1] + end[1]) / 2
                    ];
                    return this.projection(simpleMidGeo);
                case 'weighted':
                    // 2点間の重み付け中点（単純計算）
                    const weight = 0.5; // TODO: 重みを設定可能にする
                    const weightedGeo = [
                        start[0] + (end[0] - start[0]) * weight,
                        start[1] + (end[1] - start[1]) * weight
                    ];
                    return this.projection(weightedGeo);
                default:
                    // 絶対座標で制御点を指定
                    if (Array.isArray(this.arcControlPoint)) {
                        return this.projection(this.arcControlPoint);
                    }
                    return null;
            }
        }
        /**
         * 制御点にオフセットを適用します
         * @private
         */
        applyArcOffset(basePoint, startPoint, endPoint) {
            const dx = endPoint[0] - startPoint[0];
            const dy = endPoint[1] - startPoint[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            let offsetX = 0;
            let offsetY = 0;
            switch (this.arcOffset) {
                case 'perpendicular':
                    // 垂直方向のオフセット（現在の実装）
                    offsetX = -dy / distance * this.arcHeight * distance;
                    offsetY = dx / distance * this.arcHeight * distance;
                    break;
                case 'north':
                    offsetY = -this.arcHeight * distance;
                    break;
                case 'south':
                    offsetY = this.arcHeight * distance;
                    break;
                case 'east':
                    offsetX = this.arcHeight * distance;
                    break;
                case 'west':
                    offsetX = -this.arcHeight * distance;
                    break;
                default:
                    // 相対座標でオフセットを指定
                    if (Array.isArray(this.arcOffset)) {
                        offsetX = this.arcOffset[0] * distance;
                        offsetY = this.arcOffset[1] * distance;
                    }
                    break;
            }
            return [
                basePoint[0] + offsetX,
                basePoint[1] + offsetY
            ];
        }
        /**
         * スムージングでLineStringを描画します（旧実装 - 非推奨）
         * @deprecated 新しいrenderLines()メソッドで置き換えられました
         * @private
         */
        /*
        private renderSmoothLineString(
          container: Selection<SVGGElement, unknown, HTMLElement, any>,
          coordinates: GeoJSON.Position[],
          feature: GeoJSON.Feature,
          featureIndex: number,
          lineIndex?: number
        ): void {
          // この実装は新しいrenderLines()メソッドで置き換えられました
        }
        */
        /**
         * 地理座標系でスムージングパスを生成します
         * @private
         */
        geoSmoothPath(coordinates) {
            if (!this.projection)
                return '';
            // 地理座標をピクセル座標に変換
            const pixelCoordinates = coordinates
                .map(coord => this.projection([coord[0], coord[1]]))
                .filter(coord => coord !== null);
            if (pixelCoordinates.length < 2)
                return '';
            // カーブタイプに応じたカーブ関数を取得
            const curveFunction = this.getCurveFunction();
            // D3のlineジェネレーターを使用してスムージングパスを生成
            const lineGenerator = d3Shape.line()
                .x(d => d[0])
                .y(d => d[1])
                .curve(curveFunction);
            return lineGenerator(pixelCoordinates) || '';
        }
        /**
         * 設定されたカーブタイプに応じたカーブ関数を取得します
         * @private
         */
        getCurveFunction() {
            switch (this.smoothType) {
                case 'curveBasis':
                    return d3Shape.curveBasis;
                case 'curveCardinal':
                    return d3Shape.curveCardinal;
                case 'curveCatmullRom':
                    return d3Shape.curveCatmullRom;
                case 'curveLinear':
                    return d3Shape.curveLinear;
                case 'curveMonotoneX':
                    return d3Shape.curveMonotoneX;
                case 'curveMonotoneY':
                    return d3Shape.curveMonotoneY;
                case 'curveNatural':
                    return d3Shape.curveNatural;
                case 'curveStep':
                    return d3Shape.curveStep;
                case 'curveStepAfter':
                    return d3Shape.curveStepAfter;
                case 'curveStepBefore':
                    return d3Shape.curveStepBefore;
                default:
                    return d3Shape.curveBasis;
            }
        }
        /**
         * ライン座標から統一されたパス文字列を生成します
         * @param coordinates - ライン座標配列
         * @returns SVGパス文字列
         * @private
         */
        generateLinePath(coordinates) {
            if (!this.projection || coordinates.length < 2)
                return '';
            switch (this.lineType) {
                case 'straight':
                    return this.generateStraightPath(coordinates);
                case 'arc':
                    return this.generateArcLinePath(coordinates);
                case 'smooth':
                    return this.generateSmoothPath(coordinates);
                default:
                    return this.generateStraightPath(coordinates);
            }
        }
        /**
         * 直線パスを生成します
         * @param coordinates - ライン座標配列
         * @returns SVGパス文字列
         * @private
         */
        generateStraightPath(coordinates) {
            if (!this.projection)
                return '';
            const projectedPoints = coordinates
                .map(coord => this.projection(coord))
                .filter(point => point !== null);
            if (projectedPoints.length < 2)
                return '';
            let pathString = `M${projectedPoints[0][0]},${projectedPoints[0][1]}`;
            for (let i = 1; i < projectedPoints.length; i++) {
                pathString += `L${projectedPoints[i][0]},${projectedPoints[i][1]}`;
            }
            return pathString;
        }
        /**
         * アークパスを生成します（セグメント毎にアーク処理）
         * @param coordinates - ライン座標配列
         * @returns SVGパス文字列
         * @private
         */
        generateArcLinePath(coordinates) {
            if (!this.projection || coordinates.length < 2)
                return '';
            let pathString = '';
            for (let i = 0; i < coordinates.length - 1; i++) {
                const segmentPath = this.generateSegmentPath(coordinates[i], coordinates[i + 1]);
                if (i === 0) {
                    pathString = segmentPath;
                }
                else {
                    // 既存のパスに継続して追加（Mコマンドを削除してQから開始）
                    const segmentWithoutMove = segmentPath.replace(/^M[^LQ]*/, '');
                    pathString += segmentWithoutMove;
                }
            }
            return pathString;
        }
        /**
         * スムースパスを生成します
         * @param coordinates - ライン座標配列
         * @returns SVGパス文字列
         * @private
         */
        generateSmoothPath(coordinates) {
            return this.geoSmoothPath(coordinates);
        }
        /**
         * GeoJSONデータを取得します
         * @returns GeoJSONデータ
         */
        getData() {
            return this.data;
        }
    }

    /**
     * テーパー（太さが変化する）アーク型ポリゴンで始点と終点を結ぶレイヤークラス
     * LineString/MultiLineString形式のGeoJSONデータをサポート
     * 中間頂点は無視し、最初と最後の座標のみを使用
     */
    class LineTaperedLayer extends BaseLayer {
        /**
         * LineTaperedLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options) {
            super(`line-tapered-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
            // データをFeatureCollectionに正規化
            if (Array.isArray(options.data)) {
                this.data = { type: 'FeatureCollection', features: options.data };
            }
            else if (options.data.type === 'Feature') {
                this.data = { type: 'FeatureCollection', features: [options.data] };
            }
            else {
                this.data = options.data;
            }
            // データ検証
            this.validateData(this.data);
            this.startSize = options.startSize !== undefined ? options.startSize : 10;
            this.endSize = options.endSize !== undefined ? options.endSize : 2;
            this.arcHeight = options.arcHeight !== undefined ? options.arcHeight : 0.3;
            this.flipArc = options.flipArc !== undefined ? options.flipArc : false;
            this.startArrow = options.startArrow || false;
            this.endArrow = options.endArrow || false;
            this.arrowSize = options.arrowSize || 10;
            this.arrowWidth = options.arrowWidth;
        }
        /**
         * データを検証します
         * @private
         */
        validateData(data) {
            if (!data || data.type !== 'FeatureCollection') {
                throw new Error('LineTaperedLayer: データはFeatureCollectionである必要があります');
            }
            if (!Array.isArray(data.features)) {
                throw new Error('LineTaperedLayer: featuresが配列ではありません');
            }
            data.features.forEach((feature, index) => {
                if (!feature.geometry) {
                    throw new Error(`LineTaperedLayer: フィーチャー[${index}]にgeometryが存在しません`);
                }
                const geometry = feature.geometry;
                const { type, coordinates } = geometry;
                if (type !== 'LineString' && type !== 'MultiLineString') {
                    throw new Error(`LineTaperedLayer: フィーチャー[${index}]は'LineString'または'MultiLineString'である必要があります`);
                }
                if (type === 'LineString') {
                    this.validateCoordinates(coordinates, index);
                }
                else if (type === 'MultiLineString') {
                    coordinates.forEach((line, lineIndex) => {
                        this.validateCoordinates(line, index, lineIndex);
                    });
                }
            });
        }
        /**
         * 座標配列を検証します
         * @private
         */
        validateCoordinates(coordinates, featureIndex, lineIndex) {
            const lineId = lineIndex !== undefined ? `[${featureIndex}]のライン[${lineIndex}]` : `[${featureIndex}]`;
            if (!Array.isArray(coordinates) || coordinates.length < 2) {
                throw new Error(`LineTaperedLayer: フィーチャー${lineId}は少なくとも2点の座標が必要です`);
            }
            coordinates.forEach((coord, coordIndex) => {
                if (!Array.isArray(coord) || coord.length < 2) {
                    throw new Error(`LineTaperedLayer: フィーチャー${lineId}の座標[${coordIndex}]は[経度, 緯度]の配列である必要があります`);
                }
                const [lon, lat] = coord;
                if (lon < -180 || lon > 180) {
                    throw new Error(`LineTaperedLayer: フィーチャー${lineId}の座標[${coordIndex}]の経度は-180から180の範囲である必要があります`);
                }
                if (lat < -90 || lat > 90) {
                    throw new Error(`LineTaperedLayer: フィーチャー${lineId}の座標[${coordIndex}]の緯度は-90から90の範囲である必要があります`);
                }
            });
        }
        /**
         * 投影法を設定します
         * @param projection - 地図投影法
         */
        setProjection(projection) {
            this.projection = projection;
            this.path = d3Geo.geoPath(projection);
            if (this.layerGroup) {
                this.layerGroup.selectAll('path').remove();
                this.renderTaperedLines();
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.renderTaperedLines();
        }
        /**
         * テーパーライン描画を実行します
         * @private
         */
        renderTaperedLines() {
            if (!this.layerGroup || !this.path || !this.projection)
                return;
            const lineGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-line-tapered-layer');
            // 全ラインデータを準備
            const allLinesData = this.prepareAllLinesData();
            if (allLinesData.length === 0)
                return;
            // D3データバインディングで一括処理
            const paths = lineGroup
                .selectAll('.thematika-tapered-path')
                .data(allLinesData)
                .enter()
                .append('path')
                .attr('class', (d, i) => {
                const baseClass = 'thematika-tapered-path thematika-tapered-line';
                const customClass = this.attr.className || '';
                const featureClass = d.feature.properties?.class || '';
                const lineClass = d.lineIndex !== undefined ? `line-${d.lineIndex}` : '';
                const globalLineClass = `global-line-${i}`;
                return [baseClass, customClass, featureClass, lineClass, globalLineClass].filter(Boolean).join(' ');
            })
                .attr('d', d => d.pathData)
                .style('stroke', 'none');
            // 属性とスタイルを一括適用
            super.applyAllStylesToElements(paths, this.layerGroup);
        }
        /**
         * 全フィーチャーから統一されたテーパーラインデータを準備します
         * @returns テーパーラインデータの配列
         * @private
         */
        prepareAllLinesData() {
            const allLinesData = [];
            this.data.features.forEach((feature, featureIndex) => {
                const geometry = feature.geometry;
                if (geometry.type === 'LineString') {
                    const coordinates = geometry.coordinates;
                    const start = coordinates[0];
                    const end = coordinates[coordinates.length - 1];
                    const pathData = this.generateTaperedPolygon(start, end, feature, featureIndex);
                    if (pathData) {
                        allLinesData.push({
                            feature,
                            featureIndex,
                            start,
                            end,
                            pathData
                        });
                    }
                }
                else if (geometry.type === 'MultiLineString') {
                    geometry.coordinates.forEach((line, lineIndex) => {
                        const start = line[0];
                        const end = line[line.length - 1];
                        const pathData = this.generateTaperedPolygon(start, end, feature, featureIndex);
                        if (pathData) {
                            allLinesData.push({
                                feature,
                                featureIndex,
                                start,
                                end,
                                pathData,
                                lineIndex
                            });
                        }
                    });
                }
            });
            return allLinesData;
        }
        /**
         * テーパーアークポリゴンのSVGパスを生成します
         * @param start - 始点の地理座標
         * @param end - 終点の地理座標
         * @param feature - フィーチャー情報
         * @param featureIndex - フィーチャーインデックス
         * @returns SVGパス文字列
         * @private
         */
        generateTaperedPolygon(start, end, feature, featureIndex) {
            if (!this.projection)
                return '';
            const startPoint = this.projection([start[0], start[1]]);
            const endPoint = this.projection([end[0], end[1]]);
            if (!startPoint || !endPoint)
                return '';
            // startSize/endSizeの値を解決
            const sSize = typeof this.startSize === 'function'
                ? this.startSize(feature, featureIndex)
                : this.startSize;
            const eSize = typeof this.endSize === 'function'
                ? this.endSize(feature, featureIndex)
                : this.endSize;
            // flipArcの値を解決
            const flipped = typeof this.flipArc === 'function'
                ? this.flipArc(feature, featureIndex)
                : this.flipArc;
            // ラインの方向ベクトルと法線ベクトルを計算
            const dx = endPoint[0] - startPoint[0];
            const dy = endPoint[1] - startPoint[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance === 0)
                return '';
            // 始点-終点間の直線の法線（垂直方向）単位ベクトル
            const nx = -dy / distance;
            const ny = dx / distance;
            // アークの制御点を先に計算（端点キャップの方向決定に必要）
            const arcOffset = distance * this.arcHeight * (flipped ? -1 : 1);
            // 中心線の制御点（始点-終点の中点を法線方向にオフセット）
            const controlCenterX = (startPoint[0] + endPoint[0]) / 2 + nx * arcOffset;
            const controlCenterY = (startPoint[1] + endPoint[1]) / 2 + ny * arcOffset;
            // 二次ベジェ曲線の接線方向から各端点の法線を計算
            // 始点での接線: 始点→制御点の方向
            const startTanX = controlCenterX - startPoint[0];
            const startTanY = controlCenterY - startPoint[1];
            const startTanLen = Math.sqrt(startTanX * startTanX + startTanY * startTanY);
            const startNx = startTanLen > 0 ? -startTanY / startTanLen : nx;
            const startNy = startTanLen > 0 ? startTanX / startTanLen : ny;
            // 終点での接線: 制御点→終点の方向
            const endTanX = endPoint[0] - controlCenterX;
            const endTanY = endPoint[1] - controlCenterY;
            const endTanLen = Math.sqrt(endTanX * endTanX + endTanY * endTanY);
            const endNx = endTanLen > 0 ? -endTanY / endTanLen : nx;
            const endNy = endTanLen > 0 ? endTanX / endTanLen : ny;
            // 始点側の上下2点（始点でのアーク接線に垂直）
            const startTop = [
                startPoint[0] + startNx * sSize / 2,
                startPoint[1] + startNy * sSize / 2
            ];
            const startBottom = [
                startPoint[0] - startNx * sSize / 2,
                startPoint[1] - startNy * sSize / 2
            ];
            // 終点側の上下2点（終点でのアーク接線に垂直）
            const endTop = [
                endPoint[0] + endNx * eSize / 2,
                endPoint[1] + endNy * eSize / 2
            ];
            const endBottom = [
                endPoint[0] - endNx * eSize / 2,
                endPoint[1] - endNy * eSize / 2
            ];
            // 上辺の制御点（始点Top・終点Topの中点を法線方向にオフセット）
            const controlTopX = (startTop[0] + endTop[0]) / 2 + nx * arcOffset;
            const controlTopY = (startTop[1] + endTop[1]) / 2 + ny * arcOffset;
            // 下辺の制御点（始点Bottom・終点Bottomの中点を法線方向にオフセット）
            const controlBottomX = (startBottom[0] + endBottom[0]) / 2 + nx * arcOffset;
            const controlBottomY = (startBottom[1] + endBottom[1]) / 2 + ny * arcOffset;
            // 矢印の頂点を計算
            // 終点矢印
            let endArrowTip = null;
            let endArrowTop = null;
            let endArrowBottom = null;
            if (this.endArrow) {
                endArrowTip = [
                    endPoint[0] + (endTanX / endTanLen) * this.arrowSize,
                    endPoint[1] + (endTanY / endTanLen) * this.arrowSize
                ];
                // arrowWidth指定時は矢印の底辺を端点サイズとは独立に設定
                const endAW = this.arrowWidth !== undefined ? this.arrowWidth : eSize;
                endArrowTop = [
                    endPoint[0] + endNx * endAW / 2,
                    endPoint[1] + endNy * endAW / 2
                ];
                endArrowBottom = [
                    endPoint[0] - endNx * endAW / 2,
                    endPoint[1] - endNy * endAW / 2
                ];
            }
            // 始点矢印
            let startArrowTip = null;
            let startArrowTop = null;
            let startArrowBottom = null;
            if (this.startArrow) {
                startArrowTip = [
                    startPoint[0] - (startTanX / startTanLen) * this.arrowSize,
                    startPoint[1] - (startTanY / startTanLen) * this.arrowSize
                ];
                const startAW = this.arrowWidth !== undefined ? this.arrowWidth : sSize;
                startArrowTop = [
                    startPoint[0] + startNx * startAW / 2,
                    startPoint[1] + startNy * startAW / 2
                ];
                startArrowBottom = [
                    startPoint[0] - startNx * startAW / 2,
                    startPoint[1] - startNy * startAW / 2
                ];
            }
            // ポリゴンパスを生成
            const pathParts = [];
            // 始点側
            if (startArrowTip && startArrowTop && startArrowBottom) {
                pathParts.push(`M${startArrowBottom[0]},${startArrowBottom[1]}`);
                pathParts.push(`L${startArrowTip[0]},${startArrowTip[1]}`);
                pathParts.push(`L${startArrowTop[0]},${startArrowTop[1]}`);
                // arrowWidth != sSizeの場合、矢印底辺からテーパー幅へ接続
                pathParts.push(`L${startTop[0]},${startTop[1]}`);
            }
            else {
                pathParts.push(`M${startTop[0]},${startTop[1]}`);
            }
            // 上辺アーク: startTop → endTop
            pathParts.push(`Q${controlTopX},${controlTopY} ${endTop[0]},${endTop[1]}`);
            // 終点側
            if (endArrowTip && endArrowTop && endArrowBottom) {
                pathParts.push(`L${endArrowTop[0]},${endArrowTop[1]}`);
                pathParts.push(`L${endArrowTip[0]},${endArrowTip[1]}`);
                pathParts.push(`L${endArrowBottom[0]},${endArrowBottom[1]}`);
                pathParts.push(`L${endBottom[0]},${endBottom[1]}`);
            }
            else {
                pathParts.push(`L${endBottom[0]},${endBottom[1]}`);
            }
            // 下辺アーク: endBottom → startBottom
            pathParts.push(`Q${controlBottomX},${controlBottomY} ${startBottom[0]},${startBottom[1]}`);
            // 始点矢印の場合、startBottomからstartArrowBottomへ接続して閉じる
            if (startArrowTip && startArrowBottom) {
                pathParts.push(`L${startArrowBottom[0]},${startArrowBottom[1]}`);
            }
            pathParts.push('Z');
            return pathParts.join('');
        }
        /**
         * GeoJSONデータを取得します
         * @returns GeoJSONデータ
         */
        getData() {
            return this.data;
        }
    }

    /**
     * エッジバンドリング効果を適用したラインレイヤークラス
     * D3のcurveBundleとForce-directed layoutを使用して複数のラインを視覚的に整理します
     */
    class LineEdgeBundlingLayer extends BaseLayer {
        /**
         * LineEdgeBundlingLayerを初期化します
         * @param options - レイヤーの設定オプション
         */
        constructor(options) {
            // 一意のIDを自動生成
            super(`line-edgebundling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
            // データをFeatureCollectionに正規化
            if (Array.isArray(options.data)) {
                this.data = { type: 'FeatureCollection', features: options.data };
            }
            else if (options.data.type === 'Feature') {
                this.data = { type: 'FeatureCollection', features: [options.data] };
            }
            else {
                this.data = options.data;
            }
            // データ検証
            this.validateData(this.data);
            // オプション設定
            this.bundlingStrength = options.bundlingStrength ?? 0.85;
            this.forceStrength = options.forceStrength ?? 20;
            this.segmentSteps = options.segmentSteps ?? 'auto';
            this.showControlPoints = options.showControlPoints ?? false;
            this.showOriginalLines = options.showOriginalLines ?? false;
            this.animateForce = options.animateForce ?? true;
            this.controlPointSize = options.controlPointSize ?? 3;
            this.endpointSize = options.endpointSize ?? 6;
        }
        /**
         * データを検証します
         * @param data - 検証対象のデータ
         * @private
         */
        validateData(data) {
            if (!data || data.type !== 'FeatureCollection') {
                throw new Error('LineEdgeBundlingLayer: データはFeatureCollectionである必要があります');
            }
            if (!Array.isArray(data.features)) {
                throw new Error('LineEdgeBundlingLayer: featuresが配列ではありません');
            }
            data.features.forEach((feature, index) => {
                if (!feature.geometry) {
                    throw new Error(`LineEdgeBundlingLayer: フィーチャー[${index}]にgeometryが存在しません`);
                }
                const geometry = feature.geometry;
                const { type, coordinates } = geometry;
                if (type !== 'LineString' && type !== 'MultiLineString') {
                    throw new Error(`LineEdgeBundlingLayer: フィーチャー[${index}]は'LineString'または'MultiLineString'である必要があります`);
                }
                // 座標の検証
                if (type === 'LineString') {
                    this.validateCoordinates(coordinates, index);
                }
                else if (type === 'MultiLineString') {
                    coordinates.forEach((line, lineIndex) => {
                        this.validateCoordinates(line, index, lineIndex);
                    });
                }
            });
        }
        /**
         * 座標配列を検証します
         * @private
         */
        validateCoordinates(coordinates, featureIndex, lineIndex) {
            const lineId = lineIndex !== undefined ? `[${featureIndex}]のライン[${lineIndex}]` : `[${featureIndex}]`;
            if (!Array.isArray(coordinates) || coordinates.length < 2) {
                throw new Error(`LineEdgeBundlingLayer: フィーチャー${lineId}は少なくとも2点の座標が必要です`);
            }
            coordinates.forEach((coord, coordIndex) => {
                if (!Array.isArray(coord) || coord.length < 2) {
                    throw new Error(`LineEdgeBundlingLayer: フィーチャー${lineId}の座標[${coordIndex}]は[経度, 緯度]の配列である必要があります`);
                }
                const [lon, lat] = coord;
                if (lon < -180 || lon > 180) {
                    throw new Error(`LineEdgeBundlingLayer: フィーチャー${lineId}の座標[${coordIndex}]の経度は-180から180の範囲である必要があります`);
                }
                if (lat < -90 || lat > 90) {
                    throw new Error(`LineEdgeBundlingLayer: フィーチャー${lineId}の座標[${coordIndex}]の緯度は-90から90の範囲である必要があります`);
                }
            });
        }
        /**
         * 投影法を設定します
         * @param projection - 地図投影法
         */
        setProjection(projection) {
            this.projection = projection;
            this.path = d3Geo.geoPath(projection);
            if (this.layerGroup) {
                // 既存の要素をクリア
                this.layerGroup.selectAll('*').remove();
                // Force simulationを停止
                if (this.simulation) {
                    this.simulation.stop();
                }
                // 再描画
                this.renderBundledLines();
            }
        }
        /**
         * レイヤーを描画します
         * @param container - 描画先のSVGコンテナ
         */
        render(container) {
            this.layerGroup = this.createLayerGroup(container);
            this.renderBundledLines();
        }
        /**
         * バンドリングされたラインを描画します
         * @private
         */
        renderBundledLines() {
            if (!this.layerGroup || !this.path || !this.projection)
                return;
            // バンドリングデータを生成
            this.bundlingData = this.generateBundlingData();
            if (!this.bundlingData || this.bundlingData.paths.length === 0)
                return;
            // グループを作成
            const bundleGroup = this.layerGroup
                .append('g')
                .attr('class', 'thematika-line-edgebundling-layer');
            // 元のラインを描画（オプション）
            if (this.showOriginalLines) {
                this.renderOriginalLines(bundleGroup);
            }
            // バンドリングされたラインを描画
            this.renderBundledPaths(bundleGroup);
            // 制御点を描画（オプション）
            if (this.showControlPoints) {
                this.renderControlPoints(bundleGroup);
            }
            // Force simulationを開始
            this.startForceSimulation();
        }
        /**
         * GeoJSONからバンドリング用のデータを生成します
         * @returns バンドリングデータ
         * @private
         */
        generateBundlingData() {
            const bundle = {
                nodes: [],
                links: [],
                paths: []
            };
            const nodeMap = new Map();
            let nodeId = 0;
            // 各LineStringを処理
            this.data.features.forEach((feature, featureIndex) => {
                const geometry = feature.geometry;
                if (geometry.type === 'LineString') {
                    const pathData = this.processLineString(geometry.coordinates, feature, featureIndex, bundle, nodeMap, nodeId);
                    if (pathData) {
                        nodeId = pathData.nextNodeId;
                    }
                }
                else if (geometry.type === 'MultiLineString') {
                    geometry.coordinates.forEach((line, lineIndex) => {
                        const pathData = this.processLineString(line, feature, featureIndex, bundle, nodeMap, nodeId, lineIndex);
                        if (pathData) {
                            nodeId = pathData.nextNodeId;
                        }
                    });
                }
            });
            return bundle;
        }
        /**
         * 単一のLineStringを処理してバンドリングデータに追加します
         * @private
         */
        processLineString(coordinates, feature, featureIndex, bundle, nodeMap, currentNodeId, lineIndex) {
            if (!this.projection || coordinates.length < 2)
                return null;
            const pathNodes = [];
            let nodeId = currentNodeId;
            // 始点と終点を投影
            const startProj = this.projection(coordinates[0]);
            const endProj = this.projection(coordinates[coordinates.length - 1]);
            if (!startProj || !endProj)
                return null;
            // 始点ノード
            const startKey = `${startProj[0]},${startProj[1]}`;
            if (!nodeMap.has(startKey)) {
                const startNode = {
                    id: `node-${nodeId++}`,
                    x: startProj[0],
                    y: startProj[1],
                    fx: startProj[0], // 固定
                    fy: startProj[1],
                    type: 'endpoint',
                    feature,
                    featureIndex,
                    lineIndex
                };
                nodeMap.set(startKey, startNode);
                bundle.nodes.push(startNode);
            }
            pathNodes.push(nodeMap.get(startKey));
            // 中間制御点を生成
            const distance = Math.sqrt(Math.pow(endProj[0] - startProj[0], 2) +
                Math.pow(endProj[1] - startProj[1], 2));
            const numSegments = this.calculateSegmentSteps(distance);
            let prevNode = nodeMap.get(startKey);
            for (let i = 1; i < numSegments; i++) {
                const t = i / numSegments;
                const controlNode = {
                    id: `node-${nodeId++}`,
                    x: startProj[0] + t * (endProj[0] - startProj[0]),
                    y: startProj[1] + t * (endProj[1] - startProj[1]),
                    type: 'control',
                    feature,
                    featureIndex,
                    lineIndex
                };
                bundle.nodes.push(controlNode);
                pathNodes.push(controlNode);
                // リンクを追加
                bundle.links.push({
                    source: prevNode.id,
                    target: controlNode.id
                });
                prevNode = controlNode;
            }
            // 終点ノード
            const endKey = `${endProj[0]},${endProj[1]}`;
            if (!nodeMap.has(endKey)) {
                const endNode = {
                    id: `node-${nodeId++}`,
                    x: endProj[0],
                    y: endProj[1],
                    fx: endProj[0], // 固定
                    fy: endProj[1],
                    type: 'endpoint',
                    feature,
                    featureIndex,
                    lineIndex
                };
                nodeMap.set(endKey, endNode);
                bundle.nodes.push(endNode);
            }
            pathNodes.push(nodeMap.get(endKey));
            // 最後のリンク
            bundle.links.push({
                source: prevNode.id,
                target: nodeMap.get(endKey).id
            });
            // パスを追加
            bundle.paths.push({
                nodes: pathNodes,
                feature,
                featureIndex,
                lineIndex
            });
            return { nextNodeId: nodeId };
        }
        /**
         * 距離に基づいて制御点の数を計算します
         * @private
         */
        calculateSegmentSteps(distance) {
            if (this.segmentSteps === 'auto') {
                // 距離に基づいて自動計算（最小3、最大10）
                return Math.max(3, Math.min(10, Math.floor(distance / 50)));
            }
            else {
                return Math.max(2, this.segmentSteps);
            }
        }
        /**
         * 元のラインを描画します
         * @private
         */
        renderOriginalLines(container) {
            if (!this.path)
                return;
            const originalGroup = container
                .append('g')
                .attr('class', 'thematika-original-lines');
            originalGroup
                .selectAll('path')
                .data(this.data.features)
                .enter()
                .append('path')
                .attr('d', this.path)
                .attr('class', 'thematika-line-original')
                .style('fill', 'none')
                .style('stroke', '#999')
                .style('stroke-width', 1)
                .style('opacity', 0.3);
        }
        /**
         * バンドリングされたパスを描画します
         * @private
         */
        renderBundledPaths(container) {
            if (!this.bundlingData)
                return;
            const bundledGroup = container
                .append('g')
                .attr('class', 'thematika-bundled-lines');
            // curveBundle用のライン生成関数
            const lineGenerator = d3Shape.line()
                .curve(d3Shape.curveBundle.beta(this.bundlingStrength))
                .x(d => d.x)
                .y(d => d.y);
            // バンドリングされたパスを描画
            const paths = bundledGroup
                .selectAll('path')
                .data(this.bundlingData.paths)
                .enter()
                .append('path')
                .attr('class', (d, i) => {
                const baseClass = 'thematika-line-bundled';
                const customClass = this.attr.className || '';
                const featureClass = d.feature.properties?.class || '';
                const lineClass = d.lineIndex !== undefined ? `line-${d.lineIndex}` : '';
                const globalLineClass = `bundled-line-${i}`;
                return [baseClass, customClass, featureClass, lineClass, globalLineClass].filter(Boolean).join(' ');
            })
                .attr('d', d => lineGenerator(d.nodes) || '')
                .style('fill', 'none');
            // 属性とスタイルを適用
            super.applyAllStylesToElements(paths, bundledGroup);
        }
        /**
         * 制御点を描画します
         * @private
         */
        renderControlPoints(container) {
            if (!this.bundlingData)
                return;
            const pointsGroup = container
                .append('g')
                .attr('class', 'thematika-control-points');
            pointsGroup
                .selectAll('circle')
                .data(this.bundlingData.nodes)
                .enter()
                .append('circle')
                .attr('r', d => d.type === 'endpoint' ? this.endpointSize : this.controlPointSize)
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
                .attr('class', d => d.type === 'endpoint' ? 'thematika-endpoint' : 'thematika-control-point')
                .style('fill', d => d.type === 'endpoint' ? '#2d3436' : '#4ecdc4')
                .style('stroke', 'white')
                .style('stroke-width', d => d.type === 'endpoint' ? 2 : 1);
        }
        /**
         * Force simulationを開始します
         * @private
         */
        startForceSimulation() {
            if (!this.bundlingData)
                return;
            // 既存のsimulationを停止
            if (this.simulation) {
                this.simulation.stop();
            }
            // 新しいsimulationを作成
            this.simulation = d3Force.forceSimulation(this.bundlingData.nodes)
                .force('charge', d3Force.forceManyBody()
                .strength(this.forceStrength)
                .distanceMax(100))
                .force('link', d3Force.forceLink(this.bundlingData.links)
                .id((d) => d.id)
                .strength(0.5)
                .distance(0))
                .alphaDecay(0.02);
            if (this.animateForce) {
                // アニメーション有効の場合
                this.simulation.on('tick', () => this.updatePositions());
                this.simulation.alpha(0.3).restart();
            }
            else {
                // アニメーション無効の場合、固定回数実行して即座に収束
                for (let i = 0; i < 300; i++) {
                    this.simulation.tick();
                    if (this.simulation.alpha() < 0.01) {
                        break;
                    }
                }
                this.updatePositions();
            }
        }
        /**
         * Force simulationのtickイベントで位置を更新します
         * @private
         */
        updatePositions() {
            if (!this.layerGroup || !this.bundlingData)
                return;
            // バンドリングされたラインを更新
            const lineGenerator = d3Shape.line()
                .curve(d3Shape.curveBundle.beta(this.bundlingStrength))
                .x(d => d.x)
                .y(d => d.y);
            this.layerGroup
                .selectAll('.thematika-line-bundled')
                .data(this.bundlingData.paths)
                .attr('d', d => lineGenerator(d.nodes) || '');
            // 制御点の位置を更新
            if (this.showControlPoints) {
                this.layerGroup
                    .selectAll('.thematika-control-point, .thematika-endpoint')
                    .data(this.bundlingData.nodes)
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
            }
        }
        /**
         * レイヤーを削除します
         */
        destroy() {
            // Force simulationを停止
            if (this.simulation) {
                this.simulation.stop();
                this.simulation = undefined;
            }
            // 基底クラスのdestroyを呼び出し
            super.destroy();
        }
        /**
         * Force simulationを取得します（デバッグ用）
         * @returns Force simulation
         */
        getSimulation() {
            if (!this.animateForce) {
                return undefined;
            }
            return this.simulation;
        }
        /**
         * バンドリング強度を動的に変更します
         * @param strength - 新しいバンドリング強度（0-1）
         */
        setBundlingStrength(strength) {
            this.bundlingStrength = Math.max(0, Math.min(1, strength));
            if (this.layerGroup) {
                this.updatePositions();
            }
        }
    }

    /*!
     * Textures.js v1.2.3 (ESM)
     * SVG patterns for Data Visualization
     * https://github.com/riccardoscalco/textures
     * 
     * Copyright (c) Riccardo Scalco
     * Licensed under the MIT License
     * 
     * Included in d3-thematika under MIT License terms
     */

    function random() {
      return "".concat(Math.random().toString(36), "00000000000000000").replace(/[^a-z]+/g, '').slice(0, 5);
    }

    function circles() {
      var size = 20;
      var background = '';
      var radius = 2;
      var complement = false;
      var fill = '#343434';
      var stroke = '#343434';
      var strokeWidth = 0;
      var id = random();

      var $ = function $(selection) {
        var group = selection.append('defs').append('pattern').attr('id', id).attr('patternUnits', 'userSpaceOnUse').attr('width', size).attr('height', size);

        if (background) {
          group.append('rect').attr('width', size).attr('height', size).attr('fill', background);
        }

        group.append('circle').attr('cx', size / 2).attr('cy', size / 2).attr('r', radius).attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth);

        if (complement) {
          for (var _i = 0, _arr = [[0, 0], [0, size], [size, 0], [size, size]]; _i < _arr.length; _i++) {
            var corner = _arr[_i];
            group.append('circle').attr('cx', corner[0]).attr('cy', corner[1]).attr('r', radius).attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth);
          }
        }
      };

      $.heavier = function (_) {
        radius *= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.lighter = function (_) {
        radius /= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.thinner = function (_) {
        size *= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.thicker = function (_) {
        size /= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.background = function (_) {
        background = _;
        return $;
      };

      $.size = function (_) {
        size = _;
        return $;
      };

      $.complement = function (_) {
        complement = arguments.length === 0 ? true : _;
        return $;
      };

      $.radius = function (_) {
        radius = _;
        return $;
      };

      $.fill = function (_) {
        fill = _;
        return $;
      };

      $.stroke = function (_) {
        stroke = _;
        return $;
      };

      $.strokeWidth = function (_) {
        strokeWidth = _;
        return $;
      };

      $.id = function (_) {
        if (arguments.length === 0) {
          return id;
        }

        id = _;
        return $;
      };

      $.url = function () {
        return "url(#".concat(id, ")");
      };

      return $;
    }

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

      return arr2;
    }

    function _createForOfIteratorHelper(o, allowArrayLike) {
      var it;

      if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
        if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike) {
          if (it) o = it;
          var i = 0;

          var F = function () {};

          return {
            s: F,
            n: function () {
              if (i >= o.length) return {
                done: true
              };
              return {
                done: false,
                value: o[i++]
              };
            },
            e: function (e) {
              throw e;
            },
            f: F
          };
        }

        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }

      var normalCompletion = true,
          didErr = false,
          err;
      return {
        s: function () {
          it = o[Symbol.iterator]();
        },
        n: function () {
          var step = it.next();
          normalCompletion = step.done;
          return step;
        },
        e: function (e) {
          didErr = true;
          err = e;
        },
        f: function () {
          try {
            if (!normalCompletion && it.return != null) it.return();
          } finally {
            if (didErr) throw err;
          }
        }
      };
    }

    function lines() {
      var size = 20;
      var stroke = '#343434';
      var strokeWidth = 2;
      var background = '';
      var id = random();
      var orientation = ['diagonal'];
      var shapeRendering = 'auto';

      var path = function path(orientation) {
        var s = size;

        switch (orientation) {
          case '0/8':
          case 'vertical':
            return "M ".concat(s / 2, ", 0 l 0, ").concat(s);

          case '1/8':
            return "M ".concat(-s / 4, ",").concat(s, " l ").concat(s / 2, ",").concat(-s, " M ").concat(s / 4, ",").concat(s, " l ").concat(s / 2, ",").concat(-s, " M ").concat(s * 3 / 4, ",").concat(s, " l ").concat(s / 2, ",").concat(-s);

          case '2/8':
          case 'diagonal':
            return "M 0,".concat(s, " l ").concat(s, ",").concat(-s, " M ").concat(-s / 4, ",").concat(s / 4, " l ").concat(s / 2, ",").concat(-s / 2, " M ").concat(3 / 4 * s, ",").concat(5 / 4 * s, " l ").concat(s / 2, ",").concat(-s / 2);

          case '3/8':
            return "M 0,".concat(3 / 4 * s, " l ").concat(s, ",").concat(-s / 2, " M 0,").concat(s / 4, " l ").concat(s, ",").concat(-s / 2, " M 0,").concat(s * 5 / 4, " l ").concat(s, ",").concat(-s / 2);

          case '4/8':
          case 'horizontal':
            return "M 0,".concat(s / 2, " l ").concat(s, ",0");

          case '5/8':
            return "M 0,".concat(-s / 4, " l ").concat(s, ",").concat(s / 2, "M 0,").concat(s / 4, " l ").concat(s, ",").concat(s / 2, " M 0,").concat(s * 3 / 4, " l ").concat(s, ",").concat(s / 2);

          case '6/8':
            return "M 0,0 l ".concat(s, ",").concat(s, " M ").concat(-s / 4, ",").concat(3 / 4 * s, " l ").concat(s / 2, ",").concat(s / 2, " M ").concat(s * 3 / 4, ",").concat(-s / 4, " l ").concat(s / 2, ",").concat(s / 2);

          case '7/8':
            return "M ".concat(-s / 4, ",0 l ").concat(s / 2, ",").concat(s, " M ").concat(s / 4, ",0 l ").concat(s / 2, ",").concat(s, " M ").concat(s * 3 / 4, ",0 l ").concat(s / 2, ",").concat(s);

          default:
            return "M ".concat(s / 2, ", 0 l 0, ").concat(s);
        }
      };

      var $ = function $(selection) {
        var group = selection.append('defs').append('pattern').attr('id', id).attr('patternUnits', 'userSpaceOnUse').attr('width', size).attr('height', size);

        if (background) {
          group.append('rect').attr('width', size).attr('height', size).attr('fill', background);
        }

        var _iterator = _createForOfIteratorHelper(orientation),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var o = _step.value;
            group.append('path').attr('d', path(o)).attr('stroke-width', strokeWidth).attr('shape-rendering', shapeRendering).attr('stroke', stroke).attr('stroke-linecap', 'square');
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      };

      $.heavier = function (_) {
        strokeWidth *= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.lighter = function (_) {
        strokeWidth /= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.thinner = function (_) {
        size *= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.thicker = function (_) {
        size /= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.background = function (_) {
        background = _;
        return $;
      };

      $.size = function (_) {
        size = _;
        return $;
      };

      $.orientation = function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        if (arguments.length === 0) {
          return $;
        }

        orientation = args;
        return $;
      };

      $.shapeRendering = function (_) {
        shapeRendering = _;
        return $;
      };

      $.stroke = function (_) {
        stroke = _;
        return $;
      };

      $.strokeWidth = function (_) {
        strokeWidth = _;
        return $;
      };

      $.id = function (_) {
        if (arguments.length === 0) {
          return id;
        }

        id = _;
        return $;
      };

      $.url = function () {
        return "url(#".concat(id, ")");
      };

      return $;
    }

    function paths() {
      var width = 1;
      var height = 1;
      var size = 20;
      var stroke = '#343434';
      var strokeWidth = 2;
      var background = '';

      var d = function d(s) {
        return "M ".concat(s / 4, ",").concat(s * 3 / 4, "l").concat(s / 4, ",").concat(-s / 2, "l").concat(s / 4, ",").concat(s / 2);
      };

      var id = random();
      var fill = 'transparent';
      var shapeRendering = 'auto';

      var path = function path(_) {
        var s = size;

        switch (_) {
          case 'squares':
            return "M ".concat(s / 4, " ").concat(s / 4, " l ").concat(s / 2, " 0 l 0 ").concat(s / 2, " l ").concat(-s / 2, " 0 Z");

          case 'nylon':
            return "M 0 ".concat(s / 4, " l ").concat(s / 4, " 0 l 0 ").concat(-s / 4, " M ").concat(s * 3 / 4, " ").concat(s, " l 0 ").concat(-s / 4, " l ").concat(s / 4, " 0 M ").concat(s / 4, " ").concat(s / 2, " l 0 ").concat(s / 4, " l ").concat(s / 4, " 0 M ").concat(s / 2, " ").concat(s / 4, " l ").concat(s / 4, " 0 l 0 ").concat(s / 4);

          case 'waves':
            return "M 0 ".concat(s / 2, " c ").concat(s / 8, " ").concat(-s / 4, " , ").concat(s * 3 / 8, " ").concat(-s / 4, " , ").concat(s / 2, " 0 c ").concat(s / 8, " ").concat(s / 4, " , ").concat(s * 3 / 8, " ").concat(s / 4, " , ").concat(s / 2, " 0 M ").concat(-s / 2, " ").concat(s / 2, " c ").concat(s / 8, " ").concat(s / 4, " , ").concat(s * 3 / 8, " ").concat(s / 4, " , ").concat(s / 2, " 0 M ").concat(s, " ").concat(s / 2, " c ").concat(s / 8, " ").concat(-s / 4, " , ").concat(s * 3 / 8, " ").concat(-s / 4, " , ").concat(s / 2, " 0");

          case 'woven':
            return "M ".concat(s / 4, ",").concat(s / 4, "l").concat(s / 2, ",").concat(s / 2, "M").concat(s * 3 / 4, ",").concat(s / 4, "l").concat(s / 2, ",").concat(-s / 2, " M").concat(s / 4, ",").concat(s * 3 / 4, "l").concat(-s / 2, ",").concat(s / 2, "M").concat(s * 3 / 4, ",").concat(s * 5 / 4, "l").concat(s / 2, ",").concat(-s / 2, " M").concat(-s / 4, ",").concat(s / 4, "l").concat(s / 2, ",").concat(-s / 2);

          case 'crosses':
            return "M ".concat(s / 4, ",").concat(s / 4, "l").concat(s / 2, ",").concat(s / 2, "M").concat(s / 4, ",").concat(s * 3 / 4, "l").concat(s / 2, ",").concat(-s / 2);

          case 'caps':
            return "M ".concat(s / 4, ",").concat(s * 3 / 4, "l").concat(s / 4, ",").concat(-s / 2, "l").concat(s / 4, ",").concat(s / 2);

          case 'hexagons':
            width = 3;
            height = Math.sqrt(3);
            return "M ".concat(s, ",0 l ").concat(s, ",0 l ").concat(s / 2, ",").concat(s * Math.sqrt(3) / 2, " l ").concat(-s / 2, ",").concat(s * Math.sqrt(3) / 2, " l ").concat(-s, ",0 l ").concat(-s / 2, ",").concat(-s * Math.sqrt(3) / 2, " Z M 0,").concat(s * Math.sqrt(3) / 2, " l ").concat(s / 2, ",0 M ").concat(3 * s, ",").concat(s * Math.sqrt(3) / 2, " l ").concat(-s / 2, ",0");

          default:
            return _(s);
        }
      };

      var $ = function $(selection) {
        var p = path(d);
        var group = selection.append('defs').append('pattern').attr('id', id).attr('patternUnits', 'userSpaceOnUse').attr('width', size * width).attr('height', size * height);

        if (background) {
          group.append('rect').attr('width', size * width).attr('height', size * height).attr('fill', background);
        }

        group.append('path').attr('d', p).attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth).attr('stroke-linecap', 'square').attr('shape-rendering', shapeRendering);
      };

      $.heavier = function (_) {
        strokeWidth *= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.lighter = function (_) {
        strokeWidth /= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.thinner = function (_) {
        size *= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.thicker = function (_) {
        size /= arguments.length === 0 ? 2 : 2 * _;
        return $;
      };

      $.background = function (_) {
        background = _;
        return $;
      };

      $.shapeRendering = function (_) {
        shapeRendering = _;
        return $;
      };

      $.size = function (_) {
        size = _;
        return $;
      };

      $.d = function (_) {
        d = _;
        return $;
      };

      $.fill = function (_) {
        fill = _;
        return $;
      };

      $.stroke = function (_) {
        stroke = _;
        return $;
      };

      $.strokeWidth = function (_) {
        strokeWidth = _;
        return $;
      };

      $.id = function (_) {
        if (arguments.length === 0) {
          return id;
        }

        id = _;
        return $;
      };

      $.url = function () {
        return "url(#".concat(id, ")");
      };

      return $;
    }

    /* eslint import/no-anonymous-default-export: [2, {"allowObject": true}] */

    var main = {
      circles: circles,
      lines: lines,
      paths: paths
    };

    // @ts-ignore
    /**
     * ドットテクスチャを生成します
     * @param options - ドットテクスチャのオプション
     * @returns D3セレクションで使用可能なコールバック関数
     */
    function createDotsTexture(options) {
        const texture = main.circles()
            .radius(options.radius || 1)
            .fill(options.fill || '#000')
            .background(options.background || '#ffffff')
            .size(options.size || 4)
            .id(options.id);
        const textureFunction = (defs) => {
            defs.call(texture);
        };
        // texture.jsの.url()メソッドを委譲
        textureFunction.url = () => texture.url();
        return textureFunction;
    }
    /**
     * 線テクスチャを生成します
     * @param options - 線テクスチャのオプション
     * @returns D3セレクションで使用可能なコールバック関数
     */
    function createLinesTexture(options) {
        const texture = main.lines()
            .orientation(...(options.orientation || ['diagonal']))
            .stroke(options.stroke || '#000')
            .strokeWidth(options.strokeWidth || 1)
            .background(options.background || '#ffffff')
            .size(options.size || 4)
            .id(options.id);
        const textureFunction = (defs) => {
            defs.call(texture);
        };
        // texture.jsの.url()メソッドを委譲
        textureFunction.url = () => texture.url();
        return textureFunction;
    }
    /**
     * パステクスチャを生成します
     * @param options - パステクスチャのオプション
     * @returns D3セレクションで使用可能なコールバック関数
     */
    function createPathsTexture(options) {
        const texture = main.paths()
            .d(options.d || 'M 0,0 l 10,10 M 10,0 l -10,10')
            .size(options.size || 10)
            .background(options.background || '#ffffff')
            .fill(options.fill || 'none')
            .stroke(options.stroke || '#000')
            .strokeWidth(options.strokeWidth || 1)
            .id(options.id);
        const textureFunction = (defs) => {
            defs.call(texture);
        };
        // texture.jsの.url()メソッドを委譲
        textureFunction.url = () => texture.url();
        return textureFunction;
    }
    /**
     * 海の表現用テクスチャを生成します
     * @param options - 海テクスチャのオプション
     * @returns D3セレクションで使用可能なコールバック関数
     */
    function createOceanTexture(options = { id: 'ocean' }) {
        const { intensity = 'medium' } = options;
        const settings = {
            light: { size: 6, strokeWidth: 0.5, background: '#e3f2fd' },
            medium: { size: 4, strokeWidth: 0.8, background: '#bbdefb' },
            heavy: { size: 3, strokeWidth: 1.2, background: '#90caf9' }
        };
        const config = settings[intensity];
        return createLinesTexture({
            id: options.id,
            orientation: ['horizontal'],
            stroke: '#1976d2',
            strokeWidth: config.strokeWidth,
            background: config.background,
            size: config.size
        });
    }
    /**
     * 森林表現用テクスチャを生成します
     * @param options - 森林テクスチャのオプション
     * @returns D3セレクションで使用可能なコールバック関数
     */
    function createForestTexture(options = { id: 'forest' }) {
        const { density = 'medium' } = options;
        const settings = {
            sparse: { size: 8, radius: 1, background: '#e8f5e8' },
            medium: { size: 6, radius: 1.5, background: '#c8e6c9' },
            dense: { size: 4, radius: 2, background: '#a5d6a7' }
        };
        const config = settings[density];
        return createDotsTexture({
            id: options.id,
            radius: config.radius,
            fill: '#2e7d32',
            background: config.background,
            size: config.size
        });
    }
    /**
     * 砂漠表現用テクスチャを生成します
     * @param options - 砂漠テクスチャのオプション
     * @returns D3セレクションで使用可能なコールバック関数
     */
    function createDesertTexture(options = { id: 'desert' }) {
        return createPathsTexture({
            id: options.id,
            d: 'M 0,5 Q 5,0 10,5 Q 15,10 20,5',
            size: 20,
            background: '#fff8e1',
            fill: 'none',
            stroke: '#ff8f00',
            strokeWidth: 0.8
        });
    }
    /**
     * 山岳表現用テクスチャを生成します
     * @param options - 山岳テクスチャのオプション
     * @returns D3セレクションで使用可能なコールバック関数
     */
    function createMountainTexture(options = { id: 'mountain' }) {
        return createPathsTexture({
            id: options.id,
            d: 'M 0,10 L 5,0 L 10,10 Z',
            size: 10,
            background: '#efebe9',
            fill: '#5d4037',
            stroke: '#3e2723',
            strokeWidth: 0.5
        });
    }
    /**
     * よく使用されるテクスチャのプリセット
     */
    const TexturePresets = {
        /**
         * 軽い海テクスチャ
         */
        lightOcean: () => createOceanTexture({
            id: 'lightOcean',
            intensity: 'light'
        }),
        /**
         * 標準的な海テクスチャ
         */
        standardOcean: () => createOceanTexture({
            id: 'standardOcean',
            intensity: 'medium'
        }),
        /**
         * 濃い海テクスチャ
         */
        heavyOcean: () => createOceanTexture({
            id: 'heavyOcean',
            intensity: 'heavy'
        }),
        /**
         * 疎らな森テクスチャ
         */
        sparseForest: () => createForestTexture({
            id: 'sparseForest',
            density: 'sparse'
        }),
        /**
         * 標準的な森テクスチャ
         */
        standardForest: () => createForestTexture({
            id: 'standardForest',
            density: 'medium'
        }),
        /**
         * 密な森テクスチャ
         */
        denseForest: () => createForestTexture({
            id: 'denseForest',
            density: 'dense'
        }),
        /**
         * 砂漠テクスチャ
         */
        desert: () => createDesertTexture({
            id: 'desert'
        }),
        /**
         * 山岳テクスチャ
         */
        mountain: () => createMountainTexture({
            id: 'mountain'
        }),
        /**
         * シンプルなドットテクスチャ
         */
        simpleDots: () => createDotsTexture({
            id: 'simpleDots',
            background: '#ffffff',
            fill: '#000000',
            size: 4
        }),
        /**
         * シンプルな線テクスチャ
         */
        simpleLines: () => createLinesTexture({
            id: 'simpleLines',
            background: '#ffffff',
            stroke: '#000000',
            orientation: ['diagonal']
        })
    };

    /**
     * 投影法による座標変換が正しく動作しているかテストします
     * @param width - 地図の幅（ピクセル）
     * @param height - 地図の高さ（ピクセル）
     * @param projection - D3投影法オブジェクト
     * @param geoJson - テスト対象のGeoJSONデータ
     * @returns テスト結果
     */
    function testProjectionTransform(width, height, projection, geoJson) {
        let totalCoords = 0;
        let abnormalCoords = 0;
        const abnormalDetails = [];
        // 各地物の座標を検査
        geoJson.features.forEach((feature) => {
            const featureName = feature.properties?.name || `Feature ${feature.id || 'unknown'}`;
            // 地物の座標を再帰的に処理
            processGeometry(feature.geometry, featureName, projection, width, height, (coord, name, proj, w, h) => {
                const projected = proj([coord[0], coord[1]]);
                if (!projected)
                    return;
                totalCoords++;
                // 座標が範囲外の場合は異常値として記録
                if (projected[0] < 0 || projected[0] > w || projected[1] < 0 || projected[1] > h) {
                    abnormalCoords++;
                    abnormalDetails.push({
                        featureName: name,
                        originalCoord: [coord[0], coord[1]],
                        projectedCoord: [projected[0], projected[1]],
                        outOfBounds: {
                            x: projected[0] < 0 ? 'x < 0' : projected[0] > w ? `x > ${w}` : 'x OK',
                            y: projected[1] < 0 ? 'y < 0' : projected[1] > h ? `y > ${h}` : 'y OK'
                        }
                    });
                }
            });
        });
        const normalCoords = totalCoords - abnormalCoords;
        const isValid = abnormalCoords === 0;
        const summary = isValid
            ? `✅ すべての座標が正常範囲内です (0-${width} × 0-${height})`
            : `⚠️ ${abnormalCoords}個の座標が範囲外です`;
        return {
            totalCoords,
            normalCoords,
            abnormalCoords,
            abnormalDetails,
            isValid,
            summary
        };
    }
    /**
     * 地理ジオメトリを再帰的に処理して座標を取得
     */
    function processGeometry(geometry, featureName, projection, width, height, processor) {
        switch (geometry.type) {
            case 'Point':
                processor(geometry.coordinates, featureName, projection, width, height);
                break;
            case 'LineString':
                geometry.coordinates.forEach(coord => {
                    processor(coord, featureName, projection, width, height);
                });
                break;
            case 'Polygon':
                geometry.coordinates.forEach(ring => {
                    ring.forEach(coord => {
                        processor(coord, featureName, projection, width, height);
                    });
                });
                break;
            case 'MultiPoint':
                geometry.coordinates.forEach(coord => {
                    processor(coord, featureName, projection, width, height);
                });
                break;
            case 'MultiLineString':
                geometry.coordinates.forEach(lineString => {
                    lineString.forEach(coord => {
                        processor(coord, featureName, projection, width, height);
                    });
                });
                break;
            case 'MultiPolygon':
                geometry.coordinates.forEach(polygon => {
                    polygon.forEach(ring => {
                        ring.forEach(coord => {
                            processor(coord, featureName, projection, width, height);
                        });
                    });
                });
                break;
            case 'GeometryCollection':
                geometry.geometries.forEach(geom => {
                    processGeometry(geom, featureName, projection, width, height, processor);
                });
                break;
        }
    }
    /**
     * テスト結果をコンソールに出力
     * @param result - テスト結果
     * @param detailed - 詳細な異常値情報も出力するかどうか
     */
    function logTestResult(result, detailed = false) {
        console.log('=== 座標変換テスト結果 ===');
        console.log(`総座標数: ${result.totalCoords}`);
        console.log(`正常座標数: ${result.normalCoords}`);
        console.log(`異常座標数: ${result.abnormalCoords}`);
        console.log(result.summary);
        if (detailed && result.abnormalCoords > 0) {
            console.warn('異常値の詳細:');
            result.abnormalDetails.forEach((detail, index) => {
                console.warn(`  ${index + 1}. ${detail.featureName}: [${detail.originalCoord}] → [${detail.projectedCoord.map(c => c.toFixed(2))}] (${detail.outOfBounds.x}, ${detail.outOfBounds.y})`);
            });
        }
    }
    /**
     * 地図の境界ボックスが正しく設定されているかテスト
     * @param projection - D3投影法オブジェクト
     * @param geoJson - テスト対象のGeoJSONデータ
     * @returns テスト結果の概要
     */
    function testProjectionBounds(projection, geoJson) {
        try {
            // 地理データの境界を計算
            let minLng = Infinity, maxLng = -Infinity;
            let minLat = Infinity, maxLat = -Infinity;
            geoJson.features.forEach(feature => {
                processGeometry(feature.geometry, '', projection, 0, 0, (coord) => {
                    const [lng, lat] = coord;
                    minLng = Math.min(minLng, lng);
                    maxLng = Math.max(maxLng, lng);
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                });
            });
            // 境界の四隅を投影してテスト
            const corners = [
                [minLng, minLat],
                [maxLng, minLat],
                [maxLng, maxLat],
                [minLng, maxLat]
            ];
            const projectedCorners = corners.map(corner => projection(corner));
            const validCorners = projectedCorners.filter(corner => corner !== null);
            if (validCorners.length === corners.length) {
                return {
                    isValid: true,
                    message: '✅ 投影法の境界設定は正常です'
                };
            }
            else {
                return {
                    isValid: false,
                    message: `⚠️ 投影法で変換できない座標があります (${corners.length - validCorners.length}個)`
                };
            }
        }
        catch (error) {
            return {
                isValid: false,
                message: `❌ 境界テスト中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * タイル関連のユーティリティ関数
     * Web地図タイル（ラスタタイル、ベクタータイル）の座標計算とURL生成を行う
     */
    /**
     * Web Mercator投影法におけるタイル計算の定数
     */
    const TILE_SIZE = 256;
    const EARTH_CIRCUMFERENCE = 40075016.686; // メートル
    /**
     * 地理座標（経度、緯度）からタイル座標（x, y, z）を計算します
     * Web Mercator投影法（EPSG:3857）を使用
     *
     * @param longitude - 経度（度）
     * @param latitude - 緯度（度）
     * @param zoom - ズームレベル
     * @returns タイル座標
     *
     * @example
     * ```typescript
     * const tile = getTileXYZ(139.6917, 35.6895, 10); // 東京駅
     * console.log(tile); // { x: 909, y: 404, z: 10 }
     * ```
     */
    function getTileXYZ(longitude, latitude, zoom) {
        try {
            // 入力値の検証
            if (!isFinite(longitude) || !isFinite(latitude) || !isFinite(zoom)) {
                throw new Error('無効な座標またはズームレベルが指定されました');
            }
            if (longitude < -180 || longitude > 180) {
                throw new Error(`経度は-180から180の範囲で指定してください: ${longitude}`);
            }
            if (latitude < -85.051128779807 || latitude > 85.051128779807) {
                throw new Error(`緯度はWeb Mercator投影法の有効範囲（-85.05〜85.05度）で指定してください: ${latitude}`);
            }
            if (zoom < 0 || zoom > 30) {
                throw new Error(`ズームレベルは0から30の範囲で指定してください: ${zoom}`);
            }
            // ズームレベルでのタイル数
            const tileCount = Math.pow(2, zoom);
            // X座標の計算（経度ベース）
            const x = Math.floor((longitude + 180) / 360 * tileCount);
            // Y座標の計算（緯度ベース、Web Mercator投影法）
            const latRad = latitude * Math.PI / 180;
            const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * tileCount);
            return { x, y, z: zoom };
        }
        catch (error) {
            throw new Error(`タイル座標の計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * タイル座標から地理的境界（bounding box）を計算します
     *
     * @param x - タイルのX座標
     * @param y - タイルのY座標
     * @param z - ズームレベル
     * @returns タイルの地理的境界
     *
     * @example
     * ```typescript
     * const bounds = getTileBounds(909, 404, 10);
     * console.log(bounds.bounds); // [139.65, 35.68, 139.74, 35.74]
     * ```
     */
    function getTileBounds(x, y, z) {
        try {
            // 入力値の検証
            if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
                throw new Error('タイル座標は整数で指定してください');
            }
            if (z < 0 || z > 30) {
                throw new Error(`ズームレベルは0から30の範囲で指定してください: ${z}`);
            }
            const tileCount = Math.pow(2, z);
            if (x < 0 || x >= tileCount || y < 0 || y >= tileCount) {
                throw new Error(`タイル座標がズームレベル${z}の有効範囲外です: x=${x}, y=${y}`);
            }
            // 西端の経度（左端）
            const west = (x / tileCount) * 360 - 180;
            // 東端の経度（右端）
            const east = ((x + 1) / tileCount) * 360 - 180;
            // 北端の緯度（上端）- Web Mercator逆変換
            const northLatRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / tileCount)));
            const north = northLatRad * 180 / Math.PI;
            // 南端の緯度（下端）- Web Mercator逆変換
            const southLatRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / tileCount)));
            const south = southLatRad * 180 / Math.PI;
            return {
                west,
                south,
                east,
                north,
                bounds: [west, south, east, north]
            };
        }
        catch (error) {
            throw new Error(`タイル境界の計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 指定された地理的範囲に必要なタイルのURL一覧を生成します
     *
     * @param bounds - 地理的範囲 [west, south, east, north]
     * @param zoom - ズームレベル
     * @param options - タイル生成オプション
     * @returns タイルURL情報の配列
     *
     * @example
     * ```typescript
     * const tiles = generateTileUrls(
     *   [139.5, 35.5, 140.0, 36.0], // 東京周辺
     *   10,
     *   { urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' }
     * );
     * ```
     */
    function generateTileUrls(bounds, zoom, options) {
        try {
            const [west, south, east, north] = bounds;
            // 入力値の検証
            if (!Array.isArray(bounds) || bounds.length !== 4) {
                throw new Error('boundsは[west, south, east, north]の形式で指定してください');
            }
            if (!bounds.every(b => isFinite(b))) {
                throw new Error('boundsの値は有効な数値で指定してください');
            }
            if (west >= east || south >= north) {
                throw new Error('無効な境界が指定されました（west < east, south < northである必要があります）');
            }
            if (!options.urlTemplate || !options.urlTemplate.includes('{x}') ||
                !options.urlTemplate.includes('{y}') || !options.urlTemplate.includes('{z}')) {
                throw new Error('URLテンプレートには{x}, {y}, {z}のプレースホルダーを含める必要があります');
            }
            // デフォルト値の設定
            const minZoom = options.minZoom ?? 0;
            const maxZoom = options.maxZoom ?? 18;
            const clampToBounds = options.clampToBounds ?? true;
            // ズームレベルの検証
            if (zoom < minZoom || zoom > maxZoom) {
                throw new Error(`ズームレベル${zoom}は許可範囲（${minZoom}〜${maxZoom}）外です`);
            }
            // 範囲の各角のタイル座標を計算
            const topLeft = getTileXYZ(west, north, zoom);
            const bottomRight = getTileXYZ(east, south, zoom);
            // タイル範囲を決定
            const minTileX = Math.min(topLeft.x, bottomRight.x);
            const maxTileX = Math.max(topLeft.x, bottomRight.x);
            const minTileY = Math.min(topLeft.y, bottomRight.y);
            const maxTileY = Math.max(topLeft.y, bottomRight.y);
            const tiles = [];
            // 指定された範囲の全タイルを生成
            for (let x = minTileX; x <= maxTileX; x++) {
                for (let y = minTileY; y <= maxTileY; y++) {
                    try {
                        const tileBounds = getTileBounds(x, y, zoom);
                        // clampToBoundsが有効な場合、指定範囲外のタイルをスキップ
                        if (clampToBounds) {
                            const tileWest = tileBounds.west;
                            const tileEast = tileBounds.east;
                            const tileSouth = tileBounds.south;
                            const tileNorth = tileBounds.north;
                            // タイルが指定範囲と重複していない場合はスキップ
                            if (tileEast <= west || tileWest >= east ||
                                tileNorth <= south || tileSouth >= north) {
                                continue;
                            }
                        }
                        // URLテンプレートからURLを生成
                        const url = options.urlTemplate
                            .replace('{x}', x.toString())
                            .replace('{y}', y.toString())
                            .replace('{z}', zoom.toString());
                        tiles.push({
                            coordinate: { x, y, z: zoom },
                            url,
                            bounds: tileBounds
                        });
                    }
                    catch (tileError) {
                        // 個別のタイルエラーは警告として扱い、処理を続行
                        console.warn(`タイル(${x}, ${y}, ${zoom})の生成をスキップしました:`, tileError);
                    }
                }
            }
            if (tiles.length === 0) {
                console.warn('指定された範囲に有効なタイルが見つかりませんでした');
            }
            return tiles;
        }
        catch (error) {
            throw new Error(`タイルURL生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 指定された地理的範囲と表示サイズに最適なズームレベルを計算します
     *
     * @param bounds - 地理的範囲 [west, south, east, north]
     * @param mapWidth - 地図の表示幅（ピクセル）
     * @param mapHeight - 地図の表示高さ（ピクセル）
     * @param options - 計算オプション
     * @returns 最適なズームレベル
     *
     * @example
     * ```typescript
     * const zoom = calculateOptimalZoom([139.5, 35.5, 140.0, 36.0], 800, 600);
     * console.log(zoom); // 9
     * ```
     */
    function calculateOptimalZoom(bounds, mapWidth, mapHeight, options = {}) {
        try {
            const [west, south, east, north] = bounds;
            // 入力値の検証
            if (!Array.isArray(bounds) || bounds.length !== 4) {
                throw new Error('boundsは[west, south, east, north]の形式で指定してください');
            }
            if (!bounds.every(b => isFinite(b))) {
                throw new Error('boundsの値は有効な数値で指定してください');
            }
            if (west >= east || south >= north) {
                throw new Error('無効な境界が指定されました（west < east, south < northである必要があります）');
            }
            if (!isFinite(mapWidth) || !isFinite(mapHeight) || mapWidth <= 0 || mapHeight <= 0) {
                throw new Error('地図のサイズは正の数値で指定してください');
            }
            // デフォルト値
            const minZoom = options.minZoom ?? 0;
            const maxZoom = options.maxZoom ?? 18;
            const tileSize = options.tileSize ?? TILE_SIZE;
            // 経度幅と緯度幅
            const lonDiff = east - west;
            const latDiff = north - south;
            // Web Mercator投影法での距離計算
            const latCenter = (north + south) / 2;
            const latCenterRad = latCenter * Math.PI / 180;
            // 経度1度あたりのメートル距離（緯度による補正）
            const metersPerDegreeLon = EARTH_CIRCUMFERENCE * Math.cos(latCenterRad) / 360;
            // 緯度1度あたりのメートル距離（一定）
            const metersPerDegreeLat = EARTH_CIRCUMFERENCE / 360;
            // 範囲の幅をメートルで計算
            const widthMeters = lonDiff * metersPerDegreeLon;
            const heightMeters = latDiff * metersPerDegreeLat;
            // 各ズームレベルでの解像度を計算し、最適なものを選択
            let bestZoom = minZoom;
            for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
                // このズームレベルでの解像度（メートル/ピクセル）
                const resolution = EARTH_CIRCUMFERENCE / (tileSize * Math.pow(2, zoom));
                // 必要なピクセル数
                const requiredWidthPixels = widthMeters / resolution;
                const requiredHeightPixels = heightMeters / resolution;
                // 表示サイズに収まるかチェック
                if (requiredWidthPixels <= mapWidth && requiredHeightPixels <= mapHeight) {
                    bestZoom = zoom;
                }
                else {
                    // 収まらなくなったら前のズームレベルが最適
                    break;
                }
            }
            return Math.max(minZoom, Math.min(maxZoom, bestZoom));
        }
        catch (error) {
            throw new Error(`最適ズームレベルの計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * ズームレベルでの解像度（メートル/ピクセル）を計算します
     *
     * @param zoom - ズームレベル
     * @param latitude - 緯度（解像度は緯度により変動）
     * @param tileSize - タイルサイズ（ピクセル、デフォルト: 256）
     * @returns 解像度（メートル/ピクセル）
     *
     * @example
     * ```typescript
     * const resolution = getResolution(10, 35.6895); // 東京の緯度
     * console.log(resolution); // 約152.87メートル/ピクセル
     * ```
     */
    function getResolution(zoom, latitude = 0, tileSize = TILE_SIZE) {
        try {
            if (!isFinite(zoom) || zoom < 0) {
                throw new Error('無効なズームレベルが指定されました');
            }
            if (!isFinite(latitude) || latitude < -90 || latitude > 90) {
                throw new Error('無効な緯度が指定されました');
            }
            if (!isFinite(tileSize) || tileSize <= 0) {
                throw new Error('無効なタイルサイズが指定されました');
            }
            // Web Mercator投影法での解像度計算
            const latRad = latitude * Math.PI / 180;
            const baseResolution = EARTH_CIRCUMFERENCE / (tileSize * Math.pow(2, zoom));
            // 緯度による補正（Web Mercator投影法では高緯度ほど歪みが大きくなる）
            const correctionFactor = Math.cos(latRad);
            return baseResolution * correctionFactor;
        }
        catch (error) {
            throw new Error(`解像度の計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 指定されたタイル座標が有効な範囲内にあるかチェックします
     *
     * @param x - タイルのX座標
     * @param y - タイルのY座標
     * @param z - ズームレベル
     * @returns 有効な場合はtrue
     *
     * @example
     * ```typescript
     * const isValid = isValidTileCoordinate(909, 404, 10);
     * console.log(isValid); // true
     * ```
     */
    function isValidTileCoordinate(x, y, z) {
        if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
            return false;
        }
        if (z < 0 || z > 30) {
            return false;
        }
        const tileCount = Math.pow(2, z);
        return x >= 0 && x < tileCount && y >= 0 && y < tileCount;
    }

    /**
     * カラーパレットユーティリティ
     * 科学的に検証済みのカラーパレットと色覚アクセシビリティ機能を提供
     */
    /**
     * ColorBrewer パレット
     * Cynthia A. Brewerによる科学的に検証されたカラーパレット
     */
    const ColorBrewerPalettes = {
        // カテゴリカルパレット
        Set1: {
            name: 'Set1',
            type: 'categorical',
            colors: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'],
            colorBlindSafe: false,
            description: '鮮やかなカテゴリカルカラー（最大9クラス）',
            maxClasses: 9
        },
        Set2: {
            name: 'Set2',
            type: 'categorical',
            colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
            colorBlindSafe: true,
            description: 'パステル調カテゴリカルカラー（色覚障害対応、最大8クラス）',
            maxClasses: 8
        },
        Set3: {
            name: 'Set3',
            type: 'categorical',
            colors: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'],
            colorBlindSafe: false,
            description: '薄い色調のカテゴリカルカラー（最大12クラス）',
            maxClasses: 12
        },
        // 連続パレット（シングルハゼ）
        Blues: {
            name: 'Blues',
            type: 'sequential',
            colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
            colorBlindSafe: true,
            description: '青系連続カラー（色覚障害対応）',
            maxClasses: 9
        },
        Greens: {
            name: 'Greens',
            type: 'sequential',
            colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
            colorBlindSafe: true,
            description: '緑系連続カラー（色覚障害対応）',
            maxClasses: 9
        },
        Oranges: {
            name: 'Oranges',
            type: 'sequential',
            colors: ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'],
            colorBlindSafe: true,
            description: 'オレンジ系連続カラー（色覚障害対応）',
            maxClasses: 9
        },
        // 連続パレット（マルチハゼ）
        YlOrRd: {
            name: 'YlOrRd',
            type: 'sequential',
            colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'],
            colorBlindSafe: true,
            description: '黄-オレンジ-赤系連続カラー（色覚障害対応）',
            maxClasses: 9
        },
        YlGnBu: {
            name: 'YlGnBu',
            type: 'sequential',
            colors: ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58'],
            colorBlindSafe: true,
            description: '黄-緑-青系連続カラー（色覚障害対応）',
            maxClasses: 9
        },
        // 発散パレット
        RdYlBu: {
            name: 'RdYlBu',
            type: 'diverging',
            colors: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee090', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695'],
            colorBlindSafe: false,
            description: '赤-黄-青系発散カラー',
            maxClasses: 11
        },
        RdBu: {
            name: 'RdBu',
            type: 'diverging',
            colors: ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061'],
            colorBlindSafe: true,
            description: '赤-青系発散カラー（色覚障害対応）',
            maxClasses: 11
        },
        BrBG: {
            name: 'BrBG',
            type: 'diverging',
            colors: ['#543005', '#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30'],
            colorBlindSafe: true,
            description: '茶-緑系発散カラー（色覚障害対応）',
            maxClasses: 11
        }
    };
    /**
     * Viridis パレット
     * 知覚的に均一で色覚障害に配慮したパレット
     */
    // Viridisパレット集
    // NOTE: The variable name was misspelled as `ViridissPalettes` which could
    // lead to confusion for library consumers.  Correct the name to
    // `ViridisPalettes` so it matches the actual palette name.
    const ViridisPalettes = {
        Viridis: {
            name: 'Viridis',
            type: 'sequential',
            colors: ['#440154', '#482777', '#3f4a8a', '#31678e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'],
            colorBlindSafe: true,
            description: 'Viridis連続カラー（知覚的均一、色覚障害対応）',
            maxClasses: 9
        },
        Plasma: {
            name: 'Plasma',
            type: 'sequential',
            colors: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
            colorBlindSafe: true,
            description: 'Plasma連続カラー（知覚的均一、色覚障害対応）',
            maxClasses: 10
        },
        Inferno: {
            name: 'Inferno',
            type: 'sequential',
            colors: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d03c', '#fcffa4'],
            colorBlindSafe: true,
            description: 'Inferno連続カラー（知覚的均一、色覚障害対応）',
            maxClasses: 10
        },
        Magma: {
            name: 'Magma',
            type: 'sequential',
            colors: ['#000004', '#180f3d', '#440f76', '#721f81', '#9e2f7f', '#cd4071', '#f1605d', '#fd9668', '#feca8d', '#fcfdbf'],
            colorBlindSafe: true,
            description: 'Magma連続カラー（知覚的均一、色覚障害対応）',
            maxClasses: 10
        }
    };
    /**
     * CARTO パレット
     * カルトグラフィーに特化したパレット
     */
    const CARTOPalettes = {
        Prism: {
            name: 'Prism',
            type: 'categorical',
            colors: ['#5F4690', '#1D6996', '#38A6A5', '#0F8554', '#73AF48', '#EDAD08', '#E17C05', '#CC503E', '#94346E', '#6F4070', '#994E95'],
            colorBlindSafe: true,
            description: 'CARTO Prism カテゴリカルカラー（色覚障害対応）',
            maxClasses: 11
        },
        Safe: {
            name: 'Safe',
            type: 'categorical',
            colors: ['#88CCEE', '#CC6677', '#DDCC77', '#117733', '#332288', '#AA4499', '#44AA99', '#999933', '#882255', '#661100', '#6699CC', '#888888'],
            colorBlindSafe: true,
            description: 'CARTO Safe カテゴリカルカラー（色覚障害完全対応）',
            maxClasses: 12
        },
        Vivid: {
            name: 'Vivid',
            type: 'categorical',
            colors: ['#E58606', '#5D69B1', '#52BCA3', '#99C945', '#CC61B0', '#24796C', '#DAA51B', '#2F8AC4', '#764E9F', '#ED645A', '#CC3A8E', '#A5AA99'],
            colorBlindSafe: false,
            description: 'CARTO Vivid カテゴリカルカラー（鮮やか）',
            maxClasses: 12
        }
    };
    /**
     * Tailwind CSS パレット
     * モダンで洗練されたWebデザイン用カラーパレット
     */
    const TailwindPalettes = {
        TailwindVivid: {
            name: 'TailwindVivid',
            type: 'categorical',
            colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
            colorBlindSafe: true,
            description: 'Tailwind CSS ビビッドカラー（500シェード）',
            maxClasses: 8
        },
        TailwindRich: {
            name: 'TailwindRich',
            type: 'categorical',
            colors: ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#65A30D'],
            colorBlindSafe: true,
            description: 'Tailwind CSS リッチカラー（600シェード）',
            maxClasses: 8
        },
        TailwindDeep: {
            name: 'TailwindDeep',
            type: 'categorical',
            colors: ['#1D4ED8', '#B91C1C', '#047857', '#B45309', '#6D28D9', '#BE185D', '#0E7490', '#4D7C0F'],
            colorBlindSafe: true,
            description: 'Tailwind CSS ディープカラー（700シェード）',
            maxClasses: 8
        },
        TailwindDark: {
            name: 'TailwindDark',
            type: 'categorical',
            colors: ['#1E40AF', '#991B1B', '#065F46', '#92400E', '#5B21B6', '#9D174D', '#155E75', '#3F6212'],
            colorBlindSafe: true,
            description: 'Tailwind CSS ダークカラー（800シェード）',
            maxClasses: 8
        },
        TailwindWarm: {
            name: 'TailwindWarm',
            type: 'categorical',
            colors: ['#F97316', '#EF4444', '#F59E0B', '#EAB308', '#EC4899', '#F43F5E', '#D946EF', '#A855F7'],
            colorBlindSafe: false,
            description: 'Tailwind CSS 暖色系（オレンジ・レッド・ピンク系）',
            maxClasses: 8
        },
        TailwindCool: {
            name: 'TailwindCool',
            type: 'categorical',
            colors: ['#3B82F6', '#06B6D4', '#0EA5E9', '#10B981', '#22C55E', '#84CC16', '#6366F1', '#8B5CF6'],
            colorBlindSafe: true,
            description: 'Tailwind CSS 寒色系（ブルー・グリーン・パープル系）',
            maxClasses: 8
        },
        TailwindNeon: {
            name: 'TailwindNeon',
            type: 'categorical',
            colors: ['#06B6D4', '#10B981', '#84CC16', '#EAB308', '#F59E0B', '#EC4899', '#D946EF', '#8B5CF6'],
            colorBlindSafe: true,
            description: 'Tailwind CSS ネオンカラー（明るく鮮やかな色調）',
            maxClasses: 8
        },
        // 連続パレット
        TailwindBlues: {
            name: 'TailwindBlues',
            type: 'sequential',
            colors: ['#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A'],
            colorBlindSafe: true,
            description: 'Tailwind CSS ブルー系連続カラー',
            maxClasses: 9
        },
        TailwindGreens: {
            name: 'TailwindGreens',
            type: 'sequential',
            colors: ['#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B'],
            colorBlindSafe: true,
            description: 'Tailwind CSS グリーン系連続カラー',
            maxClasses: 9
        },
        TailwindPurples: {
            name: 'TailwindPurples',
            type: 'sequential',
            colors: ['#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95'],
            colorBlindSafe: true,
            description: 'Tailwind CSS パープル系連続カラー',
            maxClasses: 9
        }
    };
    /**
     * 全パレットを統合
     */
    const AllPalettes = {
        ...ColorBrewerPalettes,
        ...ViridisPalettes,
        ...CARTOPalettes,
        ...TailwindPalettes
    };
    /**
     * 色覚シミュレーション用変換マトリックス
     */
    const colorBlindnessMatrices = {
        protanopia: [
            [0.567, 0.433, 0.000],
            [0.558, 0.442, 0.000],
            [0.000, 0.242, 0.758]
        ],
        deuteranopia: [
            [0.625, 0.375, 0.000],
            [0.700, 0.300, 0.000],
            [0.000, 0.300, 0.700]
        ],
        tritanopia: [
            [0.950, 0.050, 0.000],
            [0.000, 0.433, 0.567],
            [0.000, 0.475, 0.525]
        ]
    };
    /**
     * 色覚障害シミュレーション
     */
    function simulateColorBlindness(color, type) {
        const rgb = hexToRgb(color);
        if (!rgb)
            return color;
        const matrix = colorBlindnessMatrices[type];
        const r = Math.round(matrix[0][0] * rgb.r + matrix[0][1] * rgb.g + matrix[0][2] * rgb.b);
        const g = Math.round(matrix[1][0] * rgb.r + matrix[1][1] * rgb.g + matrix[1][2] * rgb.b);
        const b = Math.round(matrix[2][0] * rgb.r + matrix[2][1] * rgb.g + matrix[2][2] * rgb.b);
        return rgbToHex(Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b)));
    }
    /**
     * アクセシビリティチェック
     */
    function checkColorBlindnessSafety(palette) {
        const types = ['protanopia', 'deuteranopia', 'tritanopia'];
        for (const type of types) {
            const simulatedColors = palette.map(color => simulateColorBlindness(color, type));
            // 色の区別可能性をチェック（簡易版）
            for (let i = 0; i < simulatedColors.length; i++) {
                for (let j = i + 1; j < simulatedColors.length; j++) {
                    const distance = calculateColorDistance(simulatedColors[i], simulatedColors[j]);
                    if (distance < 50) { // 閾値は調整可能
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * パレット推奨システム
     */
    function recommendPalette(type, numClasses, requireColorBlindSafe = true) {
        const candidates = Object.values(AllPalettes).filter(palette => {
            if (palette.type !== type)
                return false;
            if (palette.maxClasses && numClasses > palette.maxClasses)
                return false;
            if (requireColorBlindSafe && !palette.colorBlindSafe)
                return false;
            return true;
        });
        return candidates.map(palette => {
            let score = 100;
            let reason = `${palette.name} - ${palette.description}`;
            // クラス数の適合度
            if (palette.maxClasses) {
                const classFit = 1 - Math.abs(numClasses - palette.maxClasses) / palette.maxClasses;
                score *= classFit;
            }
            // 色覚障害対応ボーナス
            if (palette.colorBlindSafe) {
                score *= 1.2;
                reason += ' (色覚障害対応)';
            }
            return { palette, score, reason };
        }).sort((a, b) => b.score - a.score);
    }
    /**
     * 指定した数のクラスに最適化されたパレットを生成
     */
    function generateOptimizedPalette(basePalette, numClasses) {
        if (numClasses <= basePalette.colors.length) {
            // パレットをサブセット
            if (basePalette.type === 'categorical') {
                return basePalette.colors.slice(0, numClasses);
            }
            else {
                // 連続・発散パレットは等間隔でサンプリング
                const indices = Array.from({ length: numClasses }, (_, i) => Math.floor(i * (basePalette.colors.length - 1) / (numClasses - 1)));
                return indices.map(i => basePalette.colors[i]);
            }
        }
        else {
            // 補間が必要な場合（実装簡略化）
            return basePalette.colors;
        }
    }
    /**
     * ユーティリティ関数
     */
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    function rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    function calculateColorDistance(color1, color2) {
        const rgb1 = hexToRgb(color1);
        const rgb2 = hexToRgb(color2);
        if (!rgb1 || !rgb2)
            return 0;
        // ユークリッド距離（簡易版）
        return Math.sqrt(Math.pow(rgb1.r - rgb2.r, 2) +
            Math.pow(rgb1.g - rgb2.g, 2) +
            Math.pow(rgb1.b - rgb2.b, 2));
    }

    exports.AllPalettes = AllPalettes;
    exports.BaseLayer = BaseLayer;
    exports.CARTOPalettes = CARTOPalettes;
    exports.ColorBrewerPalettes = ColorBrewerPalettes;
    exports.FilterPresets = FilterPresets;
    exports.GeojsonLayer = GeojsonLayer;
    exports.GraticuleLayer = GraticuleLayer;
    exports.ImageLayer = ImageLayer;
    exports.LayerManager = LayerManager;
    exports.LegendLayer = LegendLayer;
    exports.LineConnectionLayer = LineConnectionLayer;
    exports.LineEdgeBundlingLayer = LineEdgeBundlingLayer;
    exports.LineTaperedLayer = LineTaperedLayer;
    exports.Map = Map$1;
    exports.OutlineLayer = OutlineLayer;
    exports.PointCircleLayer = PointCircleLayer;
    exports.PointSpikeLayer = PointSpikeLayer;
    exports.PointSymbolLayer = PointSymbolLayer;
    exports.TailwindPalettes = TailwindPalettes;
    exports.TexturePresets = TexturePresets;
    exports.ViridisPalettes = ViridisPalettes;
    exports.WebFontPresets = WebFontPresets;
    exports.calculateOptimalZoom = calculateOptimalZoom;
    exports.chainFilters = chainFilters;
    exports.checkColorBlindnessSafety = checkColorBlindnessSafety;
    exports.createBloom = createBloom;
    exports.createClipPolygon = createClipPolygon;
    exports.createColorMatrix = createColorMatrix;
    exports.createCustomFilter = createCustomFilter;
    exports.createDesertTexture = createDesertTexture;
    exports.createDotsTexture = createDotsTexture;
    exports.createDropShadow = createDropShadow;
    exports.createEdgeDetect = createEdgeDetect;
    exports.createEmboss = createEmboss;
    exports.createForestTexture = createForestTexture;
    exports.createGaussianBlur = createGaussianBlur;
    exports.createGlow = createGlow;
    exports.createInnerShadow = createInnerShadow;
    exports.createLinesTexture = createLinesTexture;
    exports.createMountainTexture = createMountainTexture;
    exports.createNoise = createNoise;
    exports.createOceanTexture = createOceanTexture;
    exports.createOutline = createOutline;
    exports.createPathsTexture = createPathsTexture;
    exports.createSharpen = createSharpen;
    exports.createWebFont = createWebFont;
    exports.expandBbox = expandBbox;
    exports.generateOptimizedPalette = generateOptimizedPalette;
    exports.generateTileUrls = generateTileUrls;
    exports.getBbox = getBbox;
    exports.getBboxCenter = getBboxCenter;
    exports.getBboxDimensions = getBboxDimensions;
    exports.getCentroid = getCentroid;
    exports.getFilterUrl = getFilterUrl;
    exports.getResolution = getResolution;
    exports.getTileBounds = getTileBounds;
    exports.getTileXYZ = getTileXYZ;
    exports.isValidGeoJSON = isValidGeoJSON;
    exports.isValidTileCoordinate = isValidTileCoordinate;
    exports.logTestResult = logTestResult;
    exports.merge = merge;
    exports.mergeBbox = mergeBbox;
    exports.recommendPalette = recommendPalette;
    exports.simulateColorBlindness = simulateColorBlindness;
    exports.testProjectionBounds = testProjectionBounds;
    exports.testProjectionTransform = testProjectionTransform;
    exports.textures = main;

}));
//# sourceMappingURL=thematika.umd.js.map

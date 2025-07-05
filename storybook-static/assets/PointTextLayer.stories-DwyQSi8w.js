import{B as F,c as k,M as S,G as A}from"./story-helpers-DJRNUMPK.js";import{g as j}from"./gis-utils-Dz9V2CcG.js";import*as d from"d3-geo";import"d3-selection";class P extends F{constructor(e){if(super(`point-text-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,e.attr||{},e.style||{}),this.data=Array.isArray(e.data)?{type:"FeatureCollection",features:e.data}:e.data,this.textProperty=e.textProperty||"text",typeof e.dx=="function")this.dxFunction=e.dx;else{const r=e.dx||0;this.dxFunction=()=>r}if(typeof e.dy=="function")this.dyFunction=e.dy;else{const r=e.dy||0;this.dyFunction=()=>r}if(typeof e.rotate=="function")this.rotateFunction=e.rotate;else{const r=e.rotate||0;this.rotateFunction=()=>r}if(this.lengthAdjust=e.lengthAdjust||"spacing",this.alignmentBaseline=e.alignmentBaseline||"middle",this.textAnchor=e.textAnchor||"start",typeof e.fontFamily=="function")this.fontFamilyFunction=e.fontFamily;else{const r=e.fontFamily||"メイリオ, Meiryo, 'ＭＳ Ｐゴシック', MS Gothic, sans-serif";this.fontFamilyFunction=()=>r}if(typeof e.fontSize=="function")this.fontSizeFunction=e.fontSize;else{const r=e.fontSize||16;this.fontSizeFunction=()=>r}if(typeof e.fontWeight=="function")this.fontWeightFunction=e.fontWeight;else{const r=e.fontWeight||"normal";this.fontWeightFunction=()=>r}}render(e){this.layerGroup=this.createLayerGroup(e),this.renderTexts()}on(e,r){this.layerGroup&&this.layerGroup.selectAll("text").on(e,function(t,o){r(t,o)})}setProjection(e){this.projection=e,this.layerGroup&&this.renderTexts()}renderTexts(){if(!this.layerGroup||!this.projection)return;this.layerGroup.selectAll("g.thematika-point-text-layer").remove();const e=this.data.features.map((t,o)=>{let a;if(t.geometry.type==="Point")a=t.geometry.coordinates;else{const s=j(t);a=[s.x,s.y]}const i=this.projection?this.projection(a):null;let p="";return t.properties&&(p=t.properties[this.textProperty]||t.properties.name||""),{feature:t,index:o,text:String(p),x:i?i[0]:0,y:i?i[1]:0,dx:this.dxFunction(t,o),dy:this.dyFunction(t,o),rotate:this.rotateFunction(t,o),fontFamily:this.fontFamilyFunction(t,o),fontSize:this.fontSizeFunction(t,o),fontWeight:this.fontWeightFunction(t,o)}}).filter(t=>t.x!==null&&t.y!==null&&t.text!==""),r=this.layerGroup.append("g").attr("class","thematika-point-text-layer").selectAll("text").data(e).enter().append("text").attr("x",t=>t.x).attr("y",t=>t.y).attr("dx",t=>t.dx).attr("dy",t=>t.dy).attr("transform",t=>t.rotate!==0?`rotate(${t.rotate}, ${t.x}, ${t.y})`:null).attr("lengthAdjust",this.lengthAdjust).attr("alignment-baseline",this.alignmentBaseline).attr("text-anchor",this.textAnchor).attr("font-family",t=>t.fontFamily).attr("font-size",t=>t.fontSize).attr("font-weight",t=>t.fontWeight).attr("class",t=>{const o="thematika-point-text",a=this.attr.className||"",i=t.feature.properties?.class||"";return[o,a,i].filter(Boolean).join(" ")}).text(t=>t.text);this.applyAllStylesToElements(r,this.layerGroup)}getData(){return this.data}}const C={title:"Layers/PointTextLayer",tags:["autodocs"],parameters:{docs:{description:{component:"GeoJSONデータからテキストラベルを表示するレイヤー。ポイントはそのまま、ポリゴンやラインは中心点にテキストを配置します。"}}},argTypes:{textProperty:{control:{type:"text"},description:"テキスト取得元プロパティ名",defaultValue:"text"},dx:{control:{type:"range",min:-50,max:50,step:5},description:"X方向オフセット",defaultValue:0},dy:{control:{type:"range",min:-50,max:50,step:5},description:"Y方向オフセット",defaultValue:0},rotate:{control:{type:"range",min:0,max:360,step:15},description:"回転角度",defaultValue:0},lengthAdjust:{control:{type:"radio"},options:["spacing","spacingAndGlyphs"],description:"テキスト長さ調整",defaultValue:"spacing"},alignmentBaseline:{control:{type:"select"},options:["auto","baseline","middle","central","hanging","alphabetic"],description:"ベースライン位置",defaultValue:"middle"},textAnchor:{control:{type:"radio"},options:["start","middle","end"],description:"テキストアンカー",defaultValue:"start"},fontFamily:{control:{type:"text"},description:"フォントファミリー",defaultValue:"メイリオ, Meiryo, sans-serif"},fontSize:{control:{type:"range",min:8,max:32,step:2},description:"フォントサイズ",defaultValue:14},fontWeight:{control:{type:"select"},options:["normal","bold","lighter","300","400","600","700"],description:"フォントウェイト",defaultValue:"normal"},fill:{control:{type:"color"},description:"テキスト色",defaultValue:"#333333"},stroke:{control:{type:"color"},description:"アウトライン色",defaultValue:"#ffffff"},strokeWidth:{control:{type:"range",min:0,max:5,step:.5},description:"アウトライン幅",defaultValue:2},projection:{control:{type:"select"},options:["naturalEarth1","mercator","equirectangular","orthographic"],description:"投影法",defaultValue:"naturalEarth1"},dataType:{control:{type:"radio"},options:["cities","countries","mixed"],description:"データタイプ",defaultValue:"cities"}}};function g(n){switch(n){case"cities":return{type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:[139.6917,35.6895]},properties:{text:"東京",name:"Tokyo",population:1396e4,type:"capital"}},{type:"Feature",geometry:{type:"Point",coordinates:[135.5023,34.6937]},properties:{text:"大阪",name:"Osaka",population:2691e3,type:"major"}},{type:"Feature",geometry:{type:"Point",coordinates:[-74.006,40.7128]},properties:{text:"NYC",name:"New York",population:8336e3,type:"major"}},{type:"Feature",geometry:{type:"Point",coordinates:[-.1276,51.5074]},properties:{text:"London",name:"London",population:8982e3,type:"capital"}},{type:"Feature",geometry:{type:"Point",coordinates:[2.3522,48.8566]},properties:{text:"Paris",name:"Paris",population:2161e3,type:"capital"}},{type:"Feature",geometry:{type:"Point",coordinates:[116.4074,39.9042]},properties:{text:"北京",name:"Beijing",population:2154e4,type:"capital"}}]};case"countries":return{type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Polygon",coordinates:[[[135,30],[145,30],[145,45],[135,45],[135,30]]]},properties:{text:"Japan",name:"Japan",area:377975}},{type:"Feature",geometry:{type:"Polygon",coordinates:[[[-10,50],[2,50],[2,60],[-10,60],[-10,50]]]},properties:{text:"UK",name:"United Kingdom",area:242495}},{type:"Feature",geometry:{type:"Polygon",coordinates:[[[-5,42],[8,42],[8,52],[-5,52],[-5,42]]]},properties:{text:"France",name:"France",area:643801}}]};case"mixed":return{type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:[139.7,35.7]},properties:{text:"東京駅",name:"Tokyo Station",type:"station"}},{type:"Feature",geometry:{type:"LineString",coordinates:[[139.7,35.7],[135.5,34.7]]},properties:{text:"東海道新幹線",name:"Tokaido Shinkansen",type:"railway"}},{type:"Feature",geometry:{type:"Polygon",coordinates:[[[139,35],[140,35],[140,36],[139,36],[139,35]]]},properties:{text:"東京都",name:"Tokyo Prefecture",type:"prefecture"}}]};default:return g("cities")}}function W(n,e,r){let t;switch(n){case"mercator":t=d.geoMercator();break;case"equirectangular":t=d.geoEquirectangular();break;case"orthographic":t=d.geoOrthographic().rotate([-20,-10]);break;case"naturalEarth1":default:t=d.geoNaturalEarth1();break}return t.scale(120).translate([e/2,r/2])}function c(n){const e=k(),r=800,t=500,o=W(n.projection,r,t),a=new S({container:"#map",width:r,height:t,projection:o,backgroundColor:"#f0f8ff"}),i=new A({step:[30,30],attr:{fill:"none",stroke:"#eee",strokeWidth:.5,strokeDasharray:"2,2",opacity:.7}}),p=g(n.dataType),s=new P({data:p,textProperty:n.textProperty,dx:n.dx,dy:n.dy,rotate:n.rotate,lengthAdjust:n.lengthAdjust,alignmentBaseline:n.alignmentBaseline,textAnchor:n.textAnchor,fontFamily:n.fontFamily,fontSize:n.fontSize,fontWeight:n.fontWeight,attr:{fill:n.fill,stroke:n.stroke,strokeWidth:n.strokeWidth}});return a.addLayer("graticule",i),a.addLayer("text",s),s.on("click",(x,l)=>{console.log("Text clicked:",l),alert(`Clicked: ${l.properties?.text||l.properties?.name||"Unknown"}`)}),s.on("mouseover",(x,l)=>{console.log("Text hover:",l)}),e}const y={args:{textProperty:"text",dx:0,dy:0,rotate:0,lengthAdjust:"spacing",alignmentBaseline:"middle",textAnchor:"start",fontFamily:"メイリオ, Meiryo, sans-serif",fontSize:14,fontWeight:"normal",fill:"#333333",stroke:"#ffffff",strokeWidth:2,projection:"naturalEarth1",dataType:"cities"},render:c},f={args:{textProperty:"text",dx:5,dy:-5,rotate:0,lengthAdjust:"spacing",alignmentBaseline:"middle",textAnchor:"start",fontFamily:"Arial, sans-serif",fontSize:16,fontWeight:"bold",fill:"#2c3e50",stroke:"#ecf0f1",strokeWidth:3,projection:"naturalEarth1",dataType:"cities"},render:c},u={args:{textProperty:"text",dx:0,dy:0,rotate:0,lengthAdjust:"spacing",alignmentBaseline:"middle",textAnchor:"middle",fontFamily:"Georgia, serif",fontSize:18,fontWeight:"600",fill:"#34495e",stroke:"#bdc3c7",strokeWidth:2,projection:"naturalEarth1",dataType:"countries"},render:c},m={args:{textProperty:"text",dx:0,dy:0,rotate:45,lengthAdjust:"spacing",alignmentBaseline:"middle",textAnchor:"start",fontFamily:"Impact, sans-serif",fontSize:12,fontWeight:"bold",fill:"#e74c3c",stroke:"#f8f9fa",strokeWidth:2,projection:"orthographic",dataType:"mixed"},render:c},h={args:{textProperty:"name",dx:8,dy:8,rotate:0,lengthAdjust:"spacingAndGlyphs",alignmentBaseline:"hanging",textAnchor:"start",fontFamily:"Courier New, monospace",fontSize:10,fontWeight:"300",fill:"#6c757d",stroke:"#ffffff",strokeWidth:1,projection:"mercator",dataType:"cities"},render:c};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    textProperty: 'text',
    dx: 0,
    dy: 0,
    rotate: 0,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'start',
    fontFamily: 'メイリオ, Meiryo, sans-serif',
    fontSize: 14,
    fontWeight: 'normal',
    fill: '#333333',
    stroke: '#ffffff',
    strokeWidth: 2,
    projection: 'naturalEarth1',
    dataType: 'cities'
  },
  render: createPointTextStory
}`,...y.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    textProperty: 'text',
    dx: 5,
    dy: -5,
    rotate: 0,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'start',
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    fontWeight: 'bold',
    fill: '#2c3e50',
    stroke: '#ecf0f1',
    strokeWidth: 3,
    projection: 'naturalEarth1',
    dataType: 'cities'
  },
  render: createPointTextStory
}`,...f.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    textProperty: 'text',
    dx: 0,
    dy: 0,
    rotate: 0,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'middle',
    fontFamily: 'Georgia, serif',
    fontSize: 18,
    fontWeight: '600',
    fill: '#34495e',
    stroke: '#bdc3c7',
    strokeWidth: 2,
    projection: 'naturalEarth1',
    dataType: 'countries'
  },
  render: createPointTextStory
}`,...u.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    textProperty: 'text',
    dx: 0,
    dy: 0,
    rotate: 45,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'start',
    fontFamily: 'Impact, sans-serif',
    fontSize: 12,
    fontWeight: 'bold',
    fill: '#e74c3c',
    stroke: '#f8f9fa',
    strokeWidth: 2,
    projection: 'orthographic',
    dataType: 'mixed'
  },
  render: createPointTextStory
}`,...m.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    textProperty: 'name',
    dx: 8,
    dy: 8,
    rotate: 0,
    lengthAdjust: 'spacingAndGlyphs',
    alignmentBaseline: 'hanging',
    textAnchor: 'start',
    fontFamily: 'Courier New, monospace',
    fontSize: 10,
    fontWeight: '300',
    fill: '#6c757d',
    stroke: '#ffffff',
    strokeWidth: 1,
    projection: 'mercator',
    dataType: 'cities'
  },
  render: createPointTextStory
}`,...h.parameters?.docs?.source}}};const B=["Default","WorldCapitals","CountryLabels","RotatedLabels","SmallCapsStyle"];export{u as CountryLabels,y as Default,m as RotatedLabels,h as SmallCapsStyle,f as WorldCapitals,B as __namedExportsOrder,C as default};

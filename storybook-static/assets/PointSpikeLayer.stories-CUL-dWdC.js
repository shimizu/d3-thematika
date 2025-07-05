import{B as b,c as x,a as w,l as T,M as W,G as $}from"./story-helpers-DJRNUMPK.js";import{g as v}from"./gis-utils-Dz9V2CcG.js";import*as M from"d3-geo";import"d3-selection";class D extends b{constructor(e){if(super(`point-spike-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,e.attr||{},e.style||{}),this.data=Array.isArray(e.data)?{type:"FeatureCollection",features:e.data}:e.data,typeof e.length=="function")this.lengthFunction=e.length;else{const r=e.length||50;this.lengthFunction=()=>r}this.direction=e.direction||"up"}render(e){this.layerGroup=this.createLayerGroup(e),this.renderSpikes()}on(e,r){this.layerGroup&&this.layerGroup.selectAll("path").on(e,function(t,o){r(t,o)})}setProjection(e){this.projection=e,this.layerGroup&&this.renderSpikes()}renderSpikes(){if(!this.layerGroup||!this.projection)return;this.layerGroup.selectAll("g.thematika-point-spike-layer").remove();const e=this.data.features.map((t,o)=>{let n;if(t.geometry.type==="Point")n=t.geometry.coordinates;else{const c=v(t);n=[c.x,c.y]}const s=this.projection(n);return{feature:t,index:o,x:s?s[0]:0,y:s?s[1]:0,length:this.lengthFunction(t,o)}}).filter(t=>t.x!==null&&t.y!==null),r=this.layerGroup.append("g").attr("class","thematika-point-spike-layer").selectAll("path").data(e).enter().append("path").attr("transform",t=>`translate(${t.x},${t.y})`).attr("d",t=>this.generateSpikePath(t.length)).attr("class",t=>{const o="thematika-point-spike",n=this.attr.className||"",s=t.feature.properties?.class||"";return[o,n,s].filter(Boolean).join(" ")});this.applyAllStylesToElements(r,this.layerGroup)}generateSpikePath(e){const r=e*.2;switch(this.direction){case"up":return`M 0,0 L ${-r/2},0 L 0,${-e} L ${r/2},0 Z`;case"down":return`M 0,0 L ${-r/2},0 L 0,${e} L ${r/2},0 Z`;case"left":return`M 0,0 L 0,${-r/2} L ${-e},0 L 0,${r/2} Z`;case"right":return`M 0,0 L 0,${-r/2} L ${e},0 L 0,${r/2} Z`;default:return`M 0,0 L ${-r/2},0 L 0,${-e} L ${r/2},0 Z`}}getData(){return this.data}}const j={title:"Layers/PointSpikeLayer",tags:["autodocs"],parameters:{docs:{description:{component:"GeoJSONデータをスパイク要素として描画するレイヤー。ポイントはそのまま、ポリゴンやラインは中心点にスパイクを配置します。"}}},argTypes:{lengthType:{control:{type:"select"},options:["fixed","variable","data-driven"],description:"長さの計算方法",defaultValue:"fixed"},baseLength:{control:{type:"range",min:10,max:200,step:5},description:"基本長さ",defaultValue:50},direction:{control:{type:"select"},options:["up","down","left","right"],description:"スパイクの方向",defaultValue:"up"},fill:{control:{type:"color"},description:"塗りつぶし色",defaultValue:"#ff6b6b"},stroke:{control:{type:"color"},description:"境界線の色",defaultValue:"#d63031"},strokeWidth:{control:{type:"range",min:0,max:3,step:.1},description:"境界線の太さ",defaultValue:1},opacity:{control:{type:"range",min:0,max:1,step:.1},description:"透明度",defaultValue:.8},dataSource:{control:{type:"select"},options:["points","polygons"],description:"データソース",defaultValue:"points"}}},i=a=>{const e=x();return setTimeout(async()=>{const r=e.querySelector("#map"),t=r.clientWidth,o=r.clientHeight;let n;a.dataSource==="points"?n=w(50):n=await T();const s=M.geoNaturalEarth1().fitExtent([[10,10],[t-10,o-10]],n),c=new W({container:"#map",width:t,height:o,projection:s}),L=new $({step:[20,20],attr:{fill:"none",stroke:"#eee",strokeWidth:.5,opacity:.5}});let p;switch(a.lengthType){case"variable":p=(m,k)=>k%5*10+a.baseLength;break;case"data-driven":p=m=>{const k=m.properties?.value||m.properties?.POP_EST||0;return Math.min(Math.sqrt(k/1e6)*a.baseLength+10,200)};break;default:p=a.baseLength}const S=new D({data:n,length:p,direction:a.direction,attr:{fill:a.fill,stroke:a.stroke,strokeWidth:a.strokeWidth,opacity:a.opacity}});c.addLayer("graticule",L),c.addLayer("spikes",S)},0),e},l={args:{lengthType:"fixed",baseLength:50,direction:"up",fill:"#ff6b6b",stroke:"#d63031",strokeWidth:1,opacity:.8,dataSource:"points"},render:i},d={args:{lengthType:"variable",baseLength:30,direction:"up",fill:"#74b9ff",stroke:"#0984e3",strokeWidth:.5,opacity:.7,dataSource:"points"},render:i},h={args:{lengthType:"data-driven",baseLength:20,direction:"up",fill:"#fd79a8",stroke:"#e84393",strokeWidth:.5,opacity:.6,dataSource:"polygons"},render:i},u={args:{lengthType:"fixed",baseLength:40,direction:"down",fill:"#00b894",stroke:"#00a085",strokeWidth:1,opacity:.8,dataSource:"points"},render:i},g={args:{lengthType:"fixed",baseLength:35,direction:"left",fill:"#fdcb6e",stroke:"#e17055",strokeWidth:1,opacity:.8,dataSource:"points"},render:i},y={args:{lengthType:"fixed",baseLength:35,direction:"right",fill:"#a29bfe",stroke:"#6c5ce7",strokeWidth:1,opacity:.8,dataSource:"points"},render:i},f={args:{lengthType:"fixed",baseLength:30,direction:"up",fill:"none",stroke:"#2d3436",strokeWidth:1.5,opacity:1,dataSource:"points"},render:i};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    lengthType: 'fixed',
    baseLength: 50,
    direction: 'up',
    fill: '#ff6b6b',
    stroke: '#d63031',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    lengthType: 'variable',
    baseLength: 30,
    direction: 'up',
    fill: '#74b9ff',
    stroke: '#0984e3',
    strokeWidth: 0.5,
    opacity: 0.7,
    dataSource: 'points'
  },
  render
}`,...d.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    lengthType: 'data-driven',
    baseLength: 20,
    direction: 'up',
    fill: '#fd79a8',
    stroke: '#e84393',
    strokeWidth: 0.5,
    opacity: 0.6,
    dataSource: 'polygons'
  },
  render
}`,...h.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    lengthType: 'fixed',
    baseLength: 40,
    direction: 'down',
    fill: '#00b894',
    stroke: '#00a085',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
}`,...u.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    lengthType: 'fixed',
    baseLength: 35,
    direction: 'left',
    fill: '#fdcb6e',
    stroke: '#e17055',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
}`,...g.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    lengthType: 'fixed',
    baseLength: 35,
    direction: 'right',
    fill: '#a29bfe',
    stroke: '#6c5ce7',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
}`,...y.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    lengthType: 'fixed',
    baseLength: 30,
    direction: 'up',
    fill: 'none',
    stroke: '#2d3436',
    strokeWidth: 1.5,
    opacity: 1,
    dataSource: 'points'
  },
  render
}`,...f.parameters?.docs?.source}}};const C=["Default","VariableLength","DataDrivenLength","DownwardSpikes","LeftwardSpikes","RightwardSpikes","MinimalStyle"];export{h as DataDrivenLength,l as Default,u as DownwardSpikes,g as LeftwardSpikes,f as MinimalStyle,y as RightwardSpikes,d as VariableLength,C as __namedExportsOrder,j as default};

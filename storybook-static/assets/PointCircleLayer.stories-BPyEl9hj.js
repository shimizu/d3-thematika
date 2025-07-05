import{c as h,a as S,l as g,M as R,G as W}from"./story-helpers-DJRNUMPK.js";import{P as T}from"./point-circle-layer-B8uqri2T.js";import*as v from"d3-geo";import"d3-selection";import"./gis-utils-Dz9V2CcG.js";const M={title:"Layers/PointCircleLayer",tags:["autodocs"],parameters:{docs:{description:{component:"GeoJSONデータをサークル要素として描画するレイヤー。ポイントはそのまま、ポリゴンやラインは中心点にサークルを配置します。"}}},argTypes:{radiusType:{control:{type:"select"},options:["fixed","variable","data-driven"],description:"半径の計算方法",defaultValue:"fixed"},baseRadius:{control:{type:"range",min:1,max:30,step:1},description:"基本半径",defaultValue:5},fill:{control:{type:"color"},description:"塗りつぶし色",defaultValue:"#ff6b6b"},stroke:{control:{type:"color"},description:"境界線の色",defaultValue:"#d63031"},strokeWidth:{control:{type:"range",min:0,max:3,step:.1},description:"境界線の太さ",defaultValue:1},opacity:{control:{type:"range",min:0,max:1,step:.1},description:"透明度",defaultValue:.8},dataSource:{control:{type:"select"},options:["points","polygons"],description:"データソース",defaultValue:"points"}}},n=e=>{const p=h();return setTimeout(async()=>{const l=p.querySelector("#map"),u=l.clientWidth,f=l.clientHeight;let a;e.dataSource==="points"?a=S(50):a=await g();const m=v.geoNaturalEarth1().fitExtent([[10,10],[u-10,f-10]],a),y=new R({container:"#map",width:u,height:f,projection:m}),b=new W({step:[20,20],attr:{fill:"none",stroke:"#eee",strokeWidth:.5,opacity:.5}});let t;switch(e.radiusType){case"variable":t=(d,c)=>c%5+e.baseRadius;break;case"data-driven":t=d=>{const c=d.properties?.value||d.properties?.POP_EST||0;return Math.min(Math.sqrt(c/1e6)*e.baseRadius+2,30)};break;default:t=e.baseRadius}const k=new T({data:a,r:t,attr:{fill:e.fill,stroke:e.stroke,strokeWidth:e.strokeWidth,opacity:e.opacity}});y.addLayer("graticule",b),y.addLayer("circles",k)},0),p},r={args:{radiusType:"fixed",baseRadius:5,fill:"#ff6b6b",stroke:"#d63031",strokeWidth:1,opacity:.8,dataSource:"points"},render:n},o={args:{radiusType:"variable",baseRadius:3,fill:"#74b9ff",stroke:"#0984e3",strokeWidth:.5,opacity:.7,dataSource:"points"},render:n},s={args:{radiusType:"data-driven",baseRadius:2,fill:"#fd79a8",stroke:"#e84393",strokeWidth:.5,opacity:.6,dataSource:"polygons"},render:n},i={args:{radiusType:"fixed",baseRadius:3,fill:"none",stroke:"#2d3436",strokeWidth:1.5,opacity:1,dataSource:"points"},render:n};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    radiusType: 'fixed',
    baseRadius: 5,
    fill: '#ff6b6b',
    stroke: '#d63031',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
}`,...r.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    radiusType: 'variable',
    baseRadius: 3,
    fill: '#74b9ff',
    stroke: '#0984e3',
    strokeWidth: 0.5,
    opacity: 0.7,
    dataSource: 'points'
  },
  render
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    radiusType: 'data-driven',
    baseRadius: 2,
    fill: '#fd79a8',
    stroke: '#e84393',
    strokeWidth: 0.5,
    opacity: 0.6,
    dataSource: 'polygons'
  },
  render
}`,...s.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    radiusType: 'fixed',
    baseRadius: 3,
    fill: 'none',
    stroke: '#2d3436',
    strokeWidth: 1.5,
    opacity: 1,
    dataSource: 'points'
  },
  render
}`,...i.parameters?.docs?.source}}};const w=["Default","VariableRadius","DataDrivenRadius","MinimalStyle"];export{s as DataDrivenRadius,r as Default,i as MinimalStyle,o as VariableRadius,w as __namedExportsOrder,M as default};

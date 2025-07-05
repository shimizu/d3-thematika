import{c as W,l as j,M as T,G as E,g as q}from"./story-helpers-DJRNUMPK.js";import{G as V}from"./geojson-layer-DyQVU0vZ.js";import*as c from"d3-geo";import{c as L,s as C,B as G,o as x}from"./Blues-CiT2pB3o.js";import"d3-selection";const D=L("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf"),_={title:"Layers/GeojsonLayer",tags:["autodocs"],parameters:{docs:{description:{component:"GeoJSONデータを描画する基本レイヤー。ポリゴン、ライン、ポイントなど様々な地理データを表示できます。"}}},argTypes:{fill:{control:{type:"color"},description:"塗りつぶし色",defaultValue:"#3498db"},stroke:{control:{type:"color"},description:"境界線の色",defaultValue:"#2c3e50"},strokeWidth:{control:{type:"range",min:.5,max:5,step:.5},description:"境界線の太さ",defaultValue:1},opacity:{control:{type:"range",min:0,max:1,step:.1},description:"透明度",defaultValue:.8},projection:{control:{type:"select"},options:["naturalEarth1","mercator","equirectangular","orthographic","albers"],description:"投影法",defaultValue:"naturalEarth1"},dataType:{control:{type:"select"},options:["world","sample"],description:"データソース",defaultValue:"world"},colorScheme:{control:{type:"select"},options:["single","categorical","sequential"],description:"カラースキーム",defaultValue:"single"}}},n=e=>{const f=W();return setTimeout(async()=>{const y=f.querySelector("#map"),k=y.clientWidth,S=y.clientHeight;let o;e.dataType==="world"?o=await j():o=q();let t;switch(e.projection){case"mercator":t=c.geoMercator();break;case"equirectangular":t=c.geoEquirectangular();break;case"orthographic":t=c.geoOrthographic();break;case"albers":t=c.geoAlbers();break;default:t=c.geoNaturalEarth1()}t.fitExtent([[10,10],[k-10,S-10]],o);const b=new T({container:"#map",width:k,height:S,projection:t}),w=new E({step:[20,20],attr:{fill:"none",stroke:"#cccccc",strokeWidth:.5,opacity:.5}});let s;switch(e.colorScheme){case"categorical":const a=x(D);s=(r,g)=>a(String(g%10));break;case"sequential":const h=C(G).domain([0,o.features.length]);s=(r,g)=>h(g);break;default:s=e.fill}const m=new V({data:o,attr:{fill:s,stroke:e.stroke,strokeWidth:e.strokeWidth,opacity:e.opacity}});b.addLayer("graticule",w),b.addLayer("geojson",m),m.on("mouseenter",(a,h)=>{const r=a.target;r.style.opacity="1",r.style.strokeWidth=String(e.strokeWidth*2)}),m.on("mouseleave",(a,h)=>{const r=a.target;r.style.opacity=String(e.opacity),r.style.strokeWidth=String(e.strokeWidth)})},0),f},l={args:{fill:"#3498db",stroke:"#2c3e50",strokeWidth:1,opacity:.8,projection:"naturalEarth1",dataType:"world",colorScheme:"single"},render:n},i={args:{fill:"#3498db",stroke:"#2c3e50",strokeWidth:.5,opacity:.7,projection:"naturalEarth1",dataType:"world",colorScheme:"categorical"},render:n},p={args:{fill:"#3498db",stroke:"#ffffff",strokeWidth:.5,opacity:.9,projection:"naturalEarth1",dataType:"world",colorScheme:"sequential"},render:n},d={args:{fill:"#e74c3c",stroke:"#c0392b",strokeWidth:1,opacity:.8,projection:"orthographic",dataType:"world",colorScheme:"single"},render:n},u={args:{fill:"#27ae60",stroke:"#229954",strokeWidth:2,opacity:.6,projection:"albers",dataType:"sample",colorScheme:"single"},render:n};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    fill: '#3498db',
    stroke: '#2c3e50',
    strokeWidth: 1,
    opacity: 0.8,
    projection: 'naturalEarth1',
    dataType: 'world',
    colorScheme: 'single'
  },
  render
}`,...l.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    fill: '#3498db',
    stroke: '#2c3e50',
    strokeWidth: 0.5,
    opacity: 0.7,
    projection: 'naturalEarth1',
    dataType: 'world',
    colorScheme: 'categorical'
  },
  render
}`,...i.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    fill: '#3498db',
    stroke: '#ffffff',
    strokeWidth: 0.5,
    opacity: 0.9,
    projection: 'naturalEarth1',
    dataType: 'world',
    colorScheme: 'sequential'
  },
  render
}`,...p.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    fill: '#e74c3c',
    stroke: '#c0392b',
    strokeWidth: 1,
    opacity: 0.8,
    projection: 'orthographic',
    dataType: 'world',
    colorScheme: 'single'
  },
  render
}`,...d.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    fill: '#27ae60',
    stroke: '#229954',
    strokeWidth: 2,
    opacity: 0.6,
    projection: 'albers',
    dataType: 'sample',
    colorScheme: 'single'
  },
  render
}`,...u.parameters?.docs?.source}}};const v=["Default","CategoricalColors","SequentialColors","OrthographicView","SampleData"];export{i as CategoricalColors,l as Default,d as OrthographicView,u as SampleData,p as SequentialColors,v as __namedExportsOrder,_ as default};

import{c as m,M as g,G as k}from"./story-helpers-DJRNUMPK.js";import*as t from"d3-geo";import"d3-selection";const j={title:"Layers/GraticuleLayer",tags:["autodocs"],parameters:{docs:{description:{component:"経緯線（グリッド）を描画するレイヤー。地図の座標系を視覚化します。"}}},argTypes:{step:{control:{type:"object"},description:"経緯線の間隔 [経度, 緯度]",defaultValue:[10,10]},stroke:{control:{type:"color"},description:"線の色",defaultValue:"#333333"},strokeWidth:{control:{type:"range",min:.5,max:5,step:.5},description:"線の太さ",defaultValue:1.5},opacity:{control:{type:"range",min:0,max:1,step:.1},description:"透明度",defaultValue:1},projection:{control:{type:"select"},options:["naturalEarth1","mercator","equirectangular","orthographic"],description:"投影法",defaultValue:"naturalEarth1"}}},c=r=>{const i=m();return setTimeout(()=>{const p=i.querySelector("#map"),d=p.clientWidth,l=p.clientHeight;let e;switch(r.projection){case"mercator":e=t.geoMercator();break;case"equirectangular":e=t.geoEquirectangular();break;case"orthographic":e=t.geoOrthographic();break;default:e=t.geoNaturalEarth1()}e.fitSize([d,l],{type:"Sphere"});const u=new g({container:"#map",width:d,height:l,projection:e}),h=new k({step:r.step,attr:{fill:"none",stroke:r.stroke,strokeWidth:r.strokeWidth,opacity:r.opacity}});u.addLayer("graticule",h)},0),i},o={args:{step:[20,20],stroke:"#333333",strokeWidth:1.5,opacity:1,projection:"naturalEarth1"},render:c},a={args:{step:[10,10],stroke:"#4444ff",strokeWidth:1,opacity:1,projection:"naturalEarth1"},render:c},n={args:{step:[30,30],stroke:"#ff4444",strokeWidth:2,opacity:1,projection:"naturalEarth1"},render:c},s={args:{step:[20,20],stroke:"#228822",strokeWidth:1.5,opacity:1,projection:"orthographic"},render:c};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    step: [20, 20],
    stroke: '#333333',
    strokeWidth: 1.5,
    opacity: 1,
    projection: 'naturalEarth1'
  },
  render
}`,...o.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    step: [10, 10],
    stroke: '#4444ff',
    strokeWidth: 1,
    opacity: 1,
    projection: 'naturalEarth1'
  },
  render
}`,...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    step: [30, 30],
    stroke: '#ff4444',
    strokeWidth: 2,
    opacity: 1,
    projection: 'naturalEarth1'
  },
  render
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    step: [20, 20],
    stroke: '#228822',
    strokeWidth: 1.5,
    opacity: 1,
    projection: 'orthographic'
  },
  render
}`,...s.parameters?.docs?.source}}};const E=["Default","DenseGrid","SparseGrid","OrthographicProjection"];export{o as Default,a as DenseGrid,s as OrthographicProjection,n as SparseGrid,E as __namedExportsOrder,j as default};

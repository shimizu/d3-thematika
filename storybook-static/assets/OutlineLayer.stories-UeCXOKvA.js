import{B as g,c as P,M as S,G as w}from"./story-helpers-DJRNUMPK.js";import{select as D}from"d3-selection";import*as c from"d3-geo";import{geoPath as C}from"d3-geo";import{P as b}from"./point-circle-layer-B8uqri2T.js";import"./gis-utils-Dz9V2CcG.js";class G extends g{constructor(t={}){const o={fill:"none",stroke:"#333333",strokeWidth:1,opacity:1};super(`outline-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,{...o,...t.attr},t.style||{}),this.createClipPath=t.createClipPath??!1,this.clipPathId=t.clipPathId||`outline-clip-${this.id}`}setProjection(t){this.path=C(t),this.layerGroup&&(this.layerGroup.selectAll("path").remove(),this.renderOutline())}render(t){this.layerGroup=this.createLayerGroup(t),this.renderOutline()}renderOutline(){if(!this.layerGroup||!this.path)return;const t={type:"Sphere"},o=this.path(t);if(this.createClipPath&&o){const n=this.layerGroup.node()?.closest("svg");if(n){const a=D(n);a.insert("defs",":first-child").append("clipPath").attr("id",this.clipPathId).append("path").attr("d",o);const i=a.select(".thematika-main-group");i.empty()||i.attr("clip-path",this.getClipPathUrl())}}const s=this.layerGroup.append("g").attr("class","thematika-outline-layer").append("path").datum(t).attr("d",this.path).attr("class",()=>{const n="thematika-outline",a=this.attr.className||"";return[n,a].filter(Boolean).join(" ")});this.applyAllStylesToElement(s,this.layerGroup)}getClipPathId(){return this.clipPathId}getClipPathUrl(){return`url(#${this.clipPathId})`}}const x={title:"Layers/OutlineLayer",tags:["autodocs"],parameters:{docs:{description:{component:"地球の輪郭（アウトライン）を描画するレイヤー。各種投影法の境界を表示し、クリップパス作成も可能です。"}}},argTypes:{projection:{control:{type:"select"},options:["naturalEarth1","mercator","equirectangular","orthographic","azimuthalEqualArea"],description:"投影法",defaultValue:"naturalEarth1"},fill:{control:{type:"color"},description:"塗りつぶし色",defaultValue:"#add8e6"},stroke:{control:{type:"color"},description:"境界線の色",defaultValue:"#4682b4"},strokeWidth:{control:{type:"range",min:0,max:10,step:.5},description:"境界線の幅",defaultValue:2},strokeDasharray:{control:{type:"text"},description:'破線パターン（例: "5,5"）',defaultValue:"none"},opacity:{control:{type:"range",min:0,max:1,step:.1},description:"透明度",defaultValue:.3},createClipPath:{control:{type:"boolean"},description:"クリップパスを作成",defaultValue:!1},showGraticule:{control:{type:"boolean"},description:"経緯線を表示",defaultValue:!0},showSampleData:{control:{type:"boolean"},description:"サンプルデータを表示",defaultValue:!0},rotation:{control:{type:"object"},description:"投影法の回転 [λ, φ, γ]",defaultValue:[0,0,0]},scale:{control:{type:"range",min:50,max:300,step:10},description:"投影法のスケール",defaultValue:120}}};function j(e,t,o,s,n){let a;switch(e){case"mercator":a=c.geoMercator();break;case"equirectangular":a=c.geoEquirectangular();break;case"orthographic":a=c.geoOrthographic();break;case"azimuthalEqualArea":a=c.geoAzimuthalEqualArea();break;case"naturalEarth1":default:a=c.geoNaturalEarth1();break}return a.scale(n).translate([t/2,o/2]).rotate(s)}function E(){return{type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:[139.6917,35.6895]},properties:{name:"東京",country:"Japan"}},{type:"Feature",geometry:{type:"Point",coordinates:[-74.006,40.7128]},properties:{name:"New York",country:"USA"}},{type:"Feature",geometry:{type:"Point",coordinates:[-.1276,51.5074]},properties:{name:"London",country:"UK"}},{type:"Feature",geometry:{type:"Point",coordinates:[2.3522,48.8566]},properties:{name:"Paris",country:"France"}},{type:"Feature",geometry:{type:"Point",coordinates:[116.4074,39.9042]},properties:{name:"Beijing",country:"China"}},{type:"Feature",geometry:{type:"Point",coordinates:[-46.6333,-23.5505]},properties:{name:"São Paulo",country:"Brazil"}},{type:"Feature",geometry:{type:"Point",coordinates:[151.2093,-33.8688]},properties:{name:"Sydney",country:"Australia"}},{type:"Feature",geometry:{type:"Point",coordinates:[28.0473,-26.2041]},properties:{name:"Johannesburg",country:"South Africa"}}]}}function l(e){const t=P(),o=800,s=500,n=j(e.projection,o,s,e.rotation,e.scale),a=new S({container:"#map",width:o,height:s,projection:n,backgroundColor:"#f0f8ff"});if(e.showGraticule){const i=new w({step:[30,30],attr:{fill:"none",stroke:"#ddd",strokeWidth:.5,strokeDasharray:"2,2",opacity:.7}});a.addLayer("graticule",i)}const f=new G({createClipPath:e.createClipPath,attr:{fill:e.fill,stroke:e.stroke,strokeWidth:e.strokeWidth,strokeDasharray:e.strokeDasharray==="none"?void 0:e.strokeDasharray,opacity:e.opacity}});if(a.addLayer("outline",f),e.showSampleData){const i=E(),k=new b({data:i,r:4,attr:{fill:"#e74c3c",stroke:"#c0392b",strokeWidth:1,opacity:.8}});a.addLayer("data",k)}const r=document.createElement("div");return r.innerHTML=`
    <p><strong>OutlineLayerデモ</strong></p>
    <p>投影法: ${e.projection}</p>
    <p>回転: [${e.rotation.join(", ")}]</p>
    <p>スケール: ${e.scale}</p>
    ${e.createClipPath?'<p style="color: blue;">✓ クリップパス作成中</p>':""}
  `,r.style.position="absolute",r.style.top="10px",r.style.left="10px",r.style.background="rgba(255,255,255,0.9)",r.style.padding="10px",r.style.borderRadius="4px",r.style.fontSize="12px",r.style.pointerEvents="none",t.appendChild(r),t}const p={args:{projection:"naturalEarth1",fill:"#add8e6",stroke:"#4682b4",strokeWidth:2,strokeDasharray:"none",opacity:.3,createClipPath:!1,showGraticule:!0,showSampleData:!0,rotation:[0,0,0],scale:120},render:l},u={args:{projection:"orthographic",fill:"#87ceeb",stroke:"#4169e1",strokeWidth:3,strokeDasharray:"none",opacity:.4,createClipPath:!0,showGraticule:!0,showSampleData:!0,rotation:[-10,-20,0],scale:200},render:l},h={args:{projection:"orthographic",fill:"#98fb98",stroke:"#228b22",strokeWidth:2,strokeDasharray:"5,5",opacity:.5,createClipPath:!1,showGraticule:!1,showSampleData:!0,rotation:[100,-30,15],scale:180},render:l},d={args:{projection:"azimuthalEqualArea",fill:"#ffd700",stroke:"#ff8c00",strokeWidth:2.5,strokeDasharray:"none",opacity:.6,createClipPath:!0,showGraticule:!0,showSampleData:!1,rotation:[0,-90,0],scale:150},render:l},y={args:{projection:"mercator",fill:"#f0e68c",stroke:"#daa520",strokeWidth:1,strokeDasharray:"10,5",opacity:.2,createClipPath:!1,showGraticule:!0,showSampleData:!0,rotation:[0,0,0],scale:100},render:l},m={args:{projection:"equirectangular",fill:"#dda0dd",stroke:"#9370db",strokeWidth:3,strokeDasharray:"none",opacity:.8,createClipPath:!0,showGraticule:!1,showSampleData:!1,rotation:[0,0,0],scale:120},render:l};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    projection: 'naturalEarth1',
    fill: '#add8e6',
    stroke: '#4682b4',
    strokeWidth: 2,
    strokeDasharray: 'none',
    opacity: 0.3,
    createClipPath: false,
    showGraticule: true,
    showSampleData: true,
    rotation: [0, 0, 0],
    scale: 120
  },
  render: createOutlineStory
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    projection: 'orthographic',
    fill: '#87ceeb',
    stroke: '#4169e1',
    strokeWidth: 3,
    strokeDasharray: 'none',
    opacity: 0.4,
    createClipPath: true,
    showGraticule: true,
    showSampleData: true,
    rotation: [-10, -20, 0],
    scale: 200
  },
  render: createOutlineStory
}`,...u.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    projection: 'orthographic',
    fill: '#98fb98',
    stroke: '#228b22',
    strokeWidth: 2,
    strokeDasharray: '5,5',
    opacity: 0.5,
    createClipPath: false,
    showGraticule: false,
    showSampleData: true,
    rotation: [100, -30, 15],
    scale: 180
  },
  render: createOutlineStory
}`,...h.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    projection: 'azimuthalEqualArea',
    fill: '#ffd700',
    stroke: '#ff8c00',
    strokeWidth: 2.5,
    strokeDasharray: 'none',
    opacity: 0.6,
    createClipPath: true,
    showGraticule: true,
    showSampleData: false,
    rotation: [0, -90, 0],
    scale: 150
  },
  render: createOutlineStory
}`,...d.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    projection: 'mercator',
    fill: '#f0e68c',
    stroke: '#daa520',
    strokeWidth: 1,
    strokeDasharray: '10,5',
    opacity: 0.2,
    createClipPath: false,
    showGraticule: true,
    showSampleData: true,
    rotation: [0, 0, 0],
    scale: 100
  },
  render: createOutlineStory
}`,...y.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    projection: 'equirectangular',
    fill: '#dda0dd',
    stroke: '#9370db',
    strokeWidth: 3,
    strokeDasharray: 'none',
    opacity: 0.8,
    createClipPath: true,
    showGraticule: false,
    showSampleData: false,
    rotation: [0, 0, 0],
    scale: 120
  },
  render: createOutlineStory
}`,...m.parameters?.docs?.source}}};const V=["NaturalEarth","Orthographic","OrthographicRotated","AzimuthalEqualArea","Mercator","EquirectangularClipped"];export{d as AzimuthalEqualArea,m as EquirectangularClipped,y as Mercator,p as NaturalEarth,u as Orthographic,h as OrthographicRotated,V as __namedExportsOrder,x as default};

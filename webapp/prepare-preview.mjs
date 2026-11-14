// Package the same app for an inline viewer's HTML size and outer-layout limits.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const folder=new URL('./',import.meta.url);
const font=await readFile(new URL('../skills/cs-concept-script/assets/fonts/Alexandria-Variable.ttf',folder));
let html=await readFile(new URL('dist/index.html',folder),'utf8');
html=html.replace(/@font-face\{[^}]+\}/,'');
const fontLoader=`<script>window.__fontReady=(async()=>{const data=Uint8Array.from(atob('${gzipSync(font).toString('base64')}'),c=>c.charCodeAt(0));const bytes=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();const font=await new FontFace('Alexandria',bytes,{weight:'100 900'}).load();document.fonts.add(font);})();</script>`;
const inlineStyle=`<style>
html,body{background:none!important}.app-shell{padding:0!important;max-width:none}.site-header{display:none}.workspace{grid-template-columns:minmax(0,1fr);gap:0}.sidebar{border:0;padding:8px 0 0;display:block}.sidebar-heading,.sidebar-note,.sidebar-footer{display:none}.algorithm-nav{display:flex;gap:9px}.algorithm-option{width:auto;min-width:175px;padding:10px 14px;gap:10px}.algorithm-option b{font-size:11px}.algorithm-option .nav-arrow{margin-left:12px}.algorithm-option.selected:before{display:none}main{padding-top:20px}.lesson-header,.lesson-footer{display:none}.skip-link{display:none}
@media(min-width:650px){.lab-grid{grid-template-columns:minmax(0,1fr) minmax(290px,.85fr)}.playback{display:flex;margin:0 0 16px}.code-line{font-size:10.5px;padding-inline:12px}.line-number{width:23px}.panel-heading{padding-inline:17px}.stage{margin-inline:10px}.variables{padding-inline:14px}.step-story{padding-inline:16px}}
@media(max-width:390px){.algorithm-option{min-width:0;width:50%;padding:10px 8px;gap:7px}.algorithm-option b{font-size:10px}}
</style>`;
html=html.replace('</head>',fontLoader+'</head>');
await mkdir(new URL('review/',folder),{recursive:true});
await writeFile(new URL('review/browser-base.html',folder),html);
await writeFile(new URL('review/inline.html',folder),html.replace('</head>',inlineStyle+'</head>'));
console.log('Prepared browser and inline views of the current build.');

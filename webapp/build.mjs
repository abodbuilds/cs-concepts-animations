import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const folder = new URL('./', import.meta.url);
const [template,css,algorithms,app,font] = await Promise.all([
  readFile(new URL('index.html',folder),'utf8'),readFile(new URL('styles.css',folder),'utf8'),
  readFile(new URL('algorithms.js',folder),'utf8'),readFile(new URL('app.js',folder),'utf8'),
  readFile(new URL('../skills/cs-concept-script/assets/fonts/Alexandria-Variable.ttf',folder)),
]);
const bundledCSS=css.replace("url('../skills/cs-concept-script/assets/fonts/Alexandria-Variable.ttf')",`url('data:font/ttf;base64,${font.toString('base64')}')`);
const safeScript=code=>code.replace(/<\/script/gi,'<\\/script');
const html=template.replace('<link rel="stylesheet" href="styles.css">',`<style>${bundledCSS}</style>`)
  .replace('<script src="algorithms.js" defer></script>',`<script>${safeScript(algorithms)}</script>`)
  .replace('<script src="app.js" defer></script>',`<script>${safeScript(app)}</script>`);
await mkdir(new URL('dist/',folder),{recursive:true});
await writeFile(new URL('dist/index.html',folder),html);
await writeFile(new URL('dist/FONT-LICENSE.txt',folder),await readFile(new URL('../skills/cs-concept-script/assets/fonts/OFL.txt',folder)));
console.log(`Built ${fileURLToPath(new URL('dist/index.html',folder))} (${Buffer.byteLength(html)} bytes; no network dependencies)`);

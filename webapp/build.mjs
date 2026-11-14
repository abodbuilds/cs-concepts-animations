import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const folder = new URL('./', import.meta.url);
const [template,css,algorithms,app,font] = await Promise.all([
  readFile(new URL('index.html',folder),'utf8'),readFile(new URL('styles.css',folder),'utf8'),
  readFile(new URL('algorithms.js',folder),'utf8'),readFile(new URL('app.js',folder),'utf8'),
  readFile(new URL('../skills/cs-concept-script/assets/fonts/Alexandria-Variable.ttf',folder)),
]);
const lessonFiles=(await readdir(new URL('lessons/',folder))).filter(name=>name.endsWith('.js')).sort();
const lessonScripts=await Promise.all(lessonFiles.map(name=>readFile(new URL('lessons/'+name,folder),'utf8')));
const lessonView=await readFile(new URL('lesson-view.js',folder),'utf8');
const bundledCSS=css.replace("url('../skills/cs-concept-script/assets/fonts/Alexandria-Variable.ttf')",`url('data:font/ttf;base64,${font.toString('base64')}')`);
const safeScript=code=>code.replace(/<\/script/gi,'<\\/script');
const html=template.replace('<link rel="stylesheet" href="styles.css">',`<style>${bundledCSS}</style>`)
  .replace('<script src="algorithms.js" defer></script>',`<script>${safeScript(algorithms)}</script>`)
  .replace('<!-- lesson-modules -->',lessonScripts.map(code=>`<script>${safeScript(code)}</script>`).join('\n'))
  .replace('<script src="lesson-view.js" defer></script>',`<script>${safeScript(lessonView)}</script>`)
  .replace('<script src="app.js" defer></script>',`<script>${safeScript(app)}</script>`);
await mkdir(new URL('dist/',folder),{recursive:true});
await writeFile(new URL('dist/index.html',folder),html);
await writeFile(new URL('dist/FONT-LICENSE.txt',folder),await readFile(new URL('../skills/cs-concept-script/assets/fonts/OFL.txt',folder)));
console.log(`Built ${fileURLToPath(new URL('dist/index.html',folder))} (${Buffer.byteLength(html)} bytes; the app runs offline, only the Plausible analytics script loads from the network)`);

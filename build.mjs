import {mkdir,copyFile,rm} from 'node:fs/promises';
const files=['index.html','styles.css','app.js','core.js','services.json','taoyuan-dinner.json','manifest.webmanifest','icon.svg','sw.js','.nojekyll'];
await mkdir('dist',{recursive:true});
for(const file of files)await copyFile(file,'dist/'+file);
console.log('Built standalone static app in dist/');

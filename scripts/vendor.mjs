import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('public/vendor', { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await copyFile(`node_modules/three/build/${file}`, `public/vendor/${file}`);
await copyFile('node_modules/three/examples/jsm/controls/OrbitControls.js', 'public/vendor/OrbitControls.js');
await copyFile('node_modules/three/LICENSE', 'public/vendor/THREE-LICENSE.txt');

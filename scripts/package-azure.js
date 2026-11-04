/**
 * Builds the app and writes pa-assistant-azure.zip, ready to upload to Azure App Service.
 *   npm run package:azure
 * The zip has server.js, package.json, node_modules/ and public/ at its ROOT (not inside a folder).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.resolve(__dirname, '..');
const stage = path.join(root, 'deploy');
const zipPath = path.join(root, 'pa-assistant-azure.zip');

console.log('1/4 Building the Angular app (production)...');
execSync('npx ng build --configuration production', { cwd: root, stdio: 'inherit' });

console.log('2/4 Preparing the deploy folder...');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.cpSync(path.join(root, 'dist', 'pa-assistant', 'browser'), path.join(stage, 'public'), { recursive: true });
fs.copyFileSync(path.join(root, 'azure', 'server.js'), path.join(stage, 'server.js'));
fs.copyFileSync(path.join(root, 'azure', 'package.json'), path.join(stage, 'package.json'));

// Install the web server's few packages here, so Azure has nothing to build and the zip runs as it is.
console.log('   Installing server packages (express, proxy)...');
execSync('npm install --omit=dev --no-audit --no-fund', { cwd: stage, stdio: 'inherit' });

console.log('3/4 Creating the zip...');
fs.rmSync(zipPath, { force: true });
const out = fs.createWriteStream(zipPath);
const zip = archiver('zip', { zlib: { level: 9 } });
out.on('close', () => console.log(`4/4 Done: ${zipPath} (${(zip.pointer() / 1024).toFixed(0)} KB)`));
zip.on('error', (e) => { throw e; });
zip.pipe(out);
zip.directory(stage, false); // false = files at the zip root
zip.finalize();

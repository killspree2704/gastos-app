#!/usr/bin/env node
// Publica una actualizacion OTA de forma reproducible, sin pasos manuales:
//   1. Sube APP_VERSION en app.js (fuente de verdad).
//   2. Sincroniza www/ (lo que empaqueta el build nativo y el zip OTA) desde la raiz.
//   3. Empaqueta www/ en ota-releases/gastos-<version>.zip.
//   4. Calcula el checksum sha256 del zip y lo verifica leyendolo de vuelta.
//   5. Escribe update.json con version/url/checksum nuevos.
// No hace commit ni push: eso se confirma a mano despues de revisar el diff.
//
// Uso:
//   node release-ota.js            -> sube el ultimo numero (patch) automaticamente
//   node release-ota.js 1.6.0      -> fija la version exacta

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const WWW = path.join(ROOT, 'www');
const OTA_DIR = path.join(ROOT, 'ota-releases');
const UPDATE_JSON = path.join(ROOT, 'update.json');
const APP_JS = path.join(ROOT, 'app.js');
const GITHUB_REPO = 'killspree2704/gastos-app';
const GITHUB_BRANCH = 'master';

// Archivos y carpetas que forman el bundle OTA. Si se agrega un archivo nuevo
// a la app y no se agrega aqui, release-ota.js lo va a ignorar en silencio:
// mantener esta lista igual a lo que carga index.html / importa app.js.
const BUNDLE_ENTRIES = [
  'app.js',
  'capacitor.js',
  'capacitor-updater.js',
  'index.html',
  'manifest.json',
  'style.css',
  'sw.js',
  'icons',
  'fonts',
];

function fail(msg) {
  console.error(`\n[release-ota] ERROR: ${msg}`);
  process.exit(1);
}

function parseVersion(v) {
  const parts = String(v).trim().split('.').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n) || n < 0)) {
    fail(`version invalida: "${v}" (se espera X.Y.Z)`);
  }
  return parts;
}

function compareVersions(a, b) {
  const pa = parseVersion(a), pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function bumpPatch(v) {
  const [maj, min, patch] = parseVersion(v);
  return `${maj}.${min}.${patch + 1}`;
}

function readAppVersion(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/const APP_VERSION = '([^']+)'/);
  if (!m) fail(`no encontre "const APP_VERSION = '...'" en ${file}`);
  return m[1];
}

function writeAppVersion(file, newVersion) {
  const src = fs.readFileSync(file, 'utf8');
  const updated = src.replace(
    /const APP_VERSION = '[^']+'/,
    `const APP_VERSION = '${newVersion}'`
  );
  fs.writeFileSync(file, updated);
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function syncWww() {
  for (const entry of BUNDLE_ENTRIES) {
    const src = path.join(ROOT, entry);
    const dest = path.join(WWW, entry);
    if (!fs.existsSync(src)) fail(`falta ${entry} en la raiz del proyecto`);
    rmrf(dest);
    copyRecursive(src, dest);
  }
}

function zipWww(outFile) {
  rmrf(outFile);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  // Compress-Archive (PowerShell, incluido en Windows) para no depender de
  // ninguna libreria de zip externa. Cada entrada se agrega por su cuenta
  // para que queden como archivos/carpetas sueltos en la raiz del zip
  // (igual que los releases anteriores), no envueltos en una sola carpeta.
  const paths = BUNDLE_ENTRIES.map(e => path.join(WWW, e));
  const psPaths = paths.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
  const cmd = `Compress-Archive -Path ${psPaths} -DestinationPath '${outFile.replace(/'/g, "''")}' -CompressionLevel Optimal -Force`;
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { stdio: 'inherit' });
  if (!fs.existsSync(outFile)) fail(`Compress-Archive no genero ${outFile}`);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function main() {
  const currentVersion = readAppVersion(APP_JS);
  const manifest = JSON.parse(fs.readFileSync(UPDATE_JSON, 'utf8'));

  if (currentVersion !== manifest.version) {
    console.warn(
      `[release-ota] aviso: APP_VERSION (${currentVersion}) y update.json (${manifest.version}) ya no coincidian antes de empezar.`
    );
  }

  const requested = process.argv[2];
  const newVersion = requested || bumpPatch(currentVersion);
  parseVersion(newVersion);

  if (compareVersions(newVersion, currentVersion) <= 0) {
    fail(`la version nueva (${newVersion}) debe ser mayor que la actual (${currentVersion}); isNewerVersion() en app.js la ignoraria.`);
  }

  console.log(`[release-ota] ${currentVersion} -> ${newVersion}`);

  writeAppVersion(APP_JS, newVersion);
  console.log('[release-ota] APP_VERSION actualizado en app.js');

  syncWww();
  console.log('[release-ota] www/ sincronizado desde la raiz');

  const zipName = `gastos-${newVersion}.zip`;
  const zipPath = path.join(OTA_DIR, zipName);
  zipWww(zipPath);
  console.log(`[release-ota] zip generado: ota-releases/${zipName}`);

  const checksum = sha256(zipPath);
  const verify = sha256(zipPath);
  if (checksum !== verify) fail('el checksum no fue estable al recalcularlo; algo escribio el zip a medias');

  const newManifest = {
    version: newVersion,
    url: `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/ota-releases/${zipName}`,
    checksum,
  };
  fs.writeFileSync(UPDATE_JSON, JSON.stringify(newManifest, null, 2) + '\n');
  console.log('[release-ota] update.json escrito:');
  console.log(JSON.stringify(newManifest, null, 2));

  console.log('\n[release-ota] listo. Falta revisar y publicar:');
  console.log(`  git add app.js www/ ota-releases/${zipName} update.json`);
  console.log(`  git commit -m "Release OTA v${newVersion}"`);
  console.log('  git push');
}

main();

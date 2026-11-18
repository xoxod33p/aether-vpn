import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const installerDir = path.join(rootDir, 'installer');

console.log('[*] Synchronizing deliverables to installer/ directory...');

try {
  if (process.platform === 'win32') {
    execSync('powershell -NoProfile -Command "Stop-Process -Name aether-vpn-portable,aether-vpn,sing-box -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
  }
} catch (_) {}

try {
  execSync(process.platform === 'win32' ? 'ping 127.0.0.1 -n 2 > nul' : 'sleep 1', { stdio: 'ignore' });
} catch (_) {}

if (!fs.existsSync(installerDir)) {
  fs.mkdirSync(installerDir, { recursive: true });
}

let updatedCount = 0;

const releaseExe = path.join(rootDir, 'src-tauri', 'target', 'release', 'aether-vpn.exe');
const targetPortable = path.join(installerDir, 'aether-vpn-portable.exe');

if (fs.existsSync(releaseExe)) {
  try {
    fs.copyFileSync(releaseExe, targetPortable);
    const szMb = (fs.statSync(targetPortable).size / 1024 / 1024).toFixed(2);
    console.log(`[OK] Updated installer/aether-vpn-portable.exe (${szMb} MB)`);
    updatedCount++;
  } catch (err) {
    console.error(`[ERROR] Failed to update installer/aether-vpn-portable.exe: ${err.message}`);
    try {
      const backupTarget = path.join(installerDir, 'aether-vpn-portable-update.exe');
      fs.copyFileSync(releaseExe, backupTarget);
      console.log(`[WARN] Destination locked! Wrote to ${backupTarget} instead.`);
    } catch (e) {
      console.error(`[ERROR] Fallback copy also failed: ${e.message}`);
    }
  }
}

const nsisDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
if (fs.existsSync(nsisDir)) {
  const files = fs.readdirSync(nsisDir).filter(f => f.endsWith('.exe') && !f.endsWith('.nsis.zip'));
  for (const f of files) {
    const src = path.join(nsisDir, f);
    const dest = path.join(installerDir, f);
    try {
      fs.copyFileSync(src, dest);
      const szMb = (fs.statSync(dest).size / 1024 / 1024).toFixed(2);
      console.log(`[OK] Updated installer/${f} (${szMb} MB)`);
      updatedCount++;
    } catch (err) {
      console.error(`[ERROR] Failed to update NSIS setup installer: ${err.message}`);
    }
  }
}

const singboxSources = [
  path.join(rootDir, 'bin', 'sing-box.exe'),
  path.join(rootDir, 'src-tauri', 'bin', 'sing-box.exe'),
];

for (const src of singboxSources) {
  if (fs.existsSync(src)) {
    try {
      const targetSingbox = path.join(installerDir, 'sing-box.exe');
      fs.copyFileSync(src, targetSingbox);
      console.log(`[OK] Synced installer/sing-box.exe`);
      break;
    } catch (_) {}
  }
}

console.log(`[*] Deliverables update complete. (${updatedCount} files synchronized to installer/)`);

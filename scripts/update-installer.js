import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const installerDir = path.join(rootDir, 'installer');

console.log('[*] Synchronizing deliverables to installer/ directory...');

// 1. Forcefully kill any running instances so file locks are released
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

// 2. Portable executable copy
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

// 3. NSIS setup installer copy
const nsisSetup = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis', 'AetherVPN_0.1.0_x64-setup.exe');
const targetSetup = path.join(installerDir, 'AetherVPN_0.1.0_x64-setup.exe');

if (fs.existsSync(nsisSetup)) {
  try {
    fs.copyFileSync(nsisSetup, targetSetup);
    const szMb = (fs.statSync(targetSetup).size / 1024 / 1024).toFixed(2);
    console.log(`[OK] Updated installer/AetherVPN_0.1.0_x64-setup.exe (${szMb} MB)`);
    updatedCount++;
  } catch (err) {
    console.error(`[ERROR] Failed to update NSIS setup installer: ${err.message}`);
  }
}

// 4. Ensure sing-box.exe is synced
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

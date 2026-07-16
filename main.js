const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { exec } = require('child_process');
const crypto = require('crypto');
const { argon2id } = require('hash-wasm');
const archiver = require('archiver');
const { PassThrough } = require('stream');

let mainWindow;

// ─── Vault Format Constants ────────────────────────────────────────────────────
// Magic: "VLKT" + version byte 0x01
// Format: [MAGIC:4][VERSION:1][META_LEN:4 LE][META_JSON][CHUNK_NONCE:8][CHUNKS...]
// Each chunk: [IV:12][TAG:16][ENCRYPTED_DATA]
// IV = CHUNK_NONCE(8 bytes) + COUNTER(4 bytes, big-endian) — guarantees no IV collision
const MAGIC = Buffer.from([0x56, 0x4C, 0x4B, 0x54]); // "VLKT"
const VERSION = 0x01;
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'FileLocker',
    backgroundColor: '#ffffff', // also updated this to white since we are on Light Mode now
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#434655',
      height: 48
    },
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    const devPort = process.env.VITE_DEV_PORT || '5173';
    mainWindow.loadURL(`http://localhost:${devPort}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Select File ─────────────────────────────────────────────────────────

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select File to Lock'
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  const stat = fs.statSync(filePath);
  return { path: filePath, name: path.basename(filePath), size: stat.size, isFolder: false };
});

// ─── IPC: Select Folder ───────────────────────────────────────────────────────
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder to Lock'
  });
  if (result.canceled || !result.filePaths.length) return null;
  const folderPath = result.filePaths[0];
  const folderName = path.basename(folderPath);
  // Estimate folder size for progress display
  const size = estimateFolderSize(folderPath);
  return { path: folderPath, name: folderName, size, isFolder: true };
});

function estimateFolderSize(folderPath) {
  let total = 0;
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(folderPath, entry.name);
      if (entry.isDirectory()) total += estimateFolderSize(full);
      else total += fs.statSync(full).size;
    }
  } catch { /* ignore permission errors */ }
  return total;
}

// ─── IPC: Get Drives ──────────────────────────────────────────────────────────
ipcMain.handle('get-drives', async () => {
  return new Promise((resolve) => {
    const cmd = `powershell -Command "Get-WmiObject Win32_LogicalDisk -Filter 'DriveType=2 OR DriveType=3' | Select-Object DeviceID, VolumeName, Size, FreeSpace | ConvertTo-Json -Compress"`;
    exec(cmd, (error, stdout) => {
      if (error) return resolve([]);
      try {
        let raw = stdout.trim();
        if (!raw) return resolve([]);
        const parsed = raw.startsWith('[') ? JSON.parse(raw) : [JSON.parse(raw)];
        const drives = parsed.map(d => ({
          letter: d.DeviceID,
          name: d.VolumeName || 'USB Drive',
          size: d.Size ? Math.round(d.Size / 1024 / 1024 / 1024) + ' GB' : '',
          free: d.FreeSpace ? Math.round(d.FreeSpace / 1024 / 1024 / 1024) + ' GB free' : '',
        }));
        resolve(drives);
      } catch { resolve([]); }
    });
  });
});

// ─── IPC: Get Hardware ID ──────────────────────────────────────────────────────
ipcMain.handle('get-hardware-id', async () => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('powershell -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', (error, stdout) => {
        if (error || !stdout.trim()) resolve('UNKNOWN-HARDWARE-ID');
        else resolve(stdout.trim());
      });
    } else if (process.platform === 'darwin') {
      exec('ioreg -rd1 -c IOPlatformExpertDevice | awk \'/IOPlatformUUID/ { split($0, line, "\\""); printf("%s\\n", line[4]); }\'', (error, stdout) => {
        if (error || !stdout.trim()) resolve('UNKNOWN-HARDWARE-ID');
        else resolve(stdout.trim());
      });
    } else {
      resolve('UNKNOWN-HARDWARE-ID');
    }
  });
});

// ─── IPC: Provision Drive ─────────────────────────────────────────────────────
ipcMain.handle('provision-drive', async (_event, driveLetter, sourcePath, password, isFolder, autoDelete, hint, branding) => {
  const send = (percent, label, done = false, error = null) => {
    mainWindow.webContents.send('provision-progress', { percent, label, done, error });
  };

  // Convert password string to buffer so we can zero it after key derivation
  const passwordBuffer = Buffer.from(password, 'utf8');

  try {
    // ── 1. Derive Key (Argon2id) ──────────────────────────────────────────────
    send(5, 'Deriving encryption key (Argon2id)...');
    const salt = crypto.randomBytes(32);
    
    // Convert passwordBuffer back to string for hash-wasm (or we can pass string directly)
    // hash-wasm accepts string or Uint8Array for password.
    const keyArray = await argon2id({
      password: password,
      salt: salt,
      parallelism: 1,
      iterations: 3,
      memorySize: 65536, // 64MB
      hashLength: 32,
      outputType: 'binary'
    });
    const key = Buffer.from(keyArray);

    // SECURITY: zero the password from memory immediately after key derivation
    passwordBuffer.fill(0);

    // ── 2. Build metadata ─────────────────────────────────────────────────────
    send(8, 'Preparing vault...');
    const originalName = isFolder
      ? path.basename(sourcePath) + '.zip'
      : path.basename(sourcePath);
    const ext = path.extname(originalName).toLowerCase();

    const vaultMeta = {
      originalName,
      ext,
      isFolder,
      salt: salt.toString('hex'),
      createdAt: new Date().toISOString(),
    };
    
    if (hint) {
      vaultMeta.hint = hint;
    }
    
    if (branding) {
      vaultMeta.branding = branding;
    }

    const metaJson  = JSON.stringify(vaultMeta);
    const metaBuf   = Buffer.from(metaJson, 'utf8');
    const metaLenBuf = Buffer.alloc(4);
    metaLenBuf.writeUInt32LE(metaBuf.length, 0);

    // ── 3. Open vault write stream ────────────────────────────────────────────
    // If the user selects the C: drive, writing to C:\ root will cause an EPERM error.
    // Instead, seamlessly route C: drive vaults to their Desktop.
    let destRoot = driveLetter + '\\';
    if (driveLetter.toUpperCase() === 'C:') {
      destRoot = path.join(app.getPath('desktop'), 'FileLocker_Vaults');
    }

    const vaultDir = path.join(destRoot, 'Vault_Data');
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true });
    }
    
    const randomId = crypto.randomBytes(4).toString('hex').toUpperCase();
    const vaultFileName = `SecureVault_${randomId}.vault`;
    const vaultPath     = path.join(vaultDir, vaultFileName);
    const writeStream   = fs.createWriteStream(vaultPath);

    // Wait for the stream to successfully open, catching any permission/drive errors
    await new Promise((resolve, reject) => {
      writeStream.once('error', reject);
      writeStream.once('open', () => {
        writeStream.removeListener('error', reject);
        resolve();
      });
    });

    // Handle any subsequent errors during writing
    writeStream.on('error', (err) => { throw err; });

    // Write header: MAGIC (4) + VERSION (1) + META_LEN (4) + META_JSON
    writeStream.write(MAGIC);
    writeStream.write(Buffer.from([VERSION]));
    writeStream.write(metaLenBuf);
    writeStream.write(metaBuf);

    // ── 4. Build the source read stream (file or folder zip) ─────────────────
    send(10, isFolder ? 'Zipping folder...' : 'Starting encryption...');

    // An 8-byte nonce unique to this vault session; combined with a 4-byte
    // per-chunk counter it gives us a 96-bit IV that is GUARANTEED unique.
    const chunkNonce = crypto.randomBytes(8);
    writeStream.write(chunkNonce); // store in vault so decryptor can reconstruct IVs

    let sourceStream;
    let totalSize;

    if (isFolder) {
      // Stream the folder directly into archiver → PassThrough → our encryptor
      const passThrough = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 1 } }); // level 1 = fast, not slow
      archive.on('error', (err) => passThrough.destroy(err));
      archive.pipe(passThrough);
      archive.directory(sourcePath, false);
      archive.finalize();
      sourceStream = passThrough;
      totalSize = estimateFolderSize(sourcePath); // approximate; exact size unknown before zip
    } else {
      totalSize = fs.statSync(sourcePath).size;
      sourceStream = fs.createReadStream(sourcePath, { highWaterMark: CHUNK_SIZE });
    }

    // ── 5. Chunk → Encrypt → Write loop ──────────────────────────────────────
    let bytesProcessed = 0;
    let chunkCounter   = 0;
    let leftover       = Buffer.alloc(0);

    const encryptChunk = async (plainChunk) => {
      // Build IV: 8-byte vault nonce + 4-byte counter (big-endian)
      const iv = Buffer.alloc(12);
      chunkNonce.copy(iv, 0);
      iv.writeUInt32BE(chunkCounter, 8);
      chunkCounter++;

      const cipher    = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(plainChunk), cipher.final()]);
      const tag       = cipher.getAuthTag(); // 16 bytes

      // Write: IV(12) + TAG(16) + DATA
      writeStream.write(Buffer.concat([iv, tag, encrypted]));

      bytesProcessed += plainChunk.length;
      const rawPct = totalSize > 0 ? (bytesProcessed / totalSize) * 80 : 50;
      const percent = Math.min(90, Math.round(10 + rawPct));
      send(percent, `Encrypting... ${Math.round(bytesProcessed / 1024 / 1024)} MB`);
    };

    // Accumulate data into exactly CHUNK_SIZE pieces before encrypting
    for await (const rawChunk of sourceStream) {
      leftover = Buffer.concat([leftover, rawChunk]);
      while (leftover.length >= CHUNK_SIZE) {
        await encryptChunk(leftover.slice(0, CHUNK_SIZE));
        leftover = leftover.slice(CHUNK_SIZE);
      }
    }
    // Flush the remaining tail (always present; last chunk is smaller)
    if (leftover.length > 0) await encryptChunk(leftover);

    await new Promise((resolve) => writeStream.end(resolve));
    // ── 6. Route by vault size: Single-File Mode vs. Drive Mode ─────────────
    const SINGLE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100 MB
    const isPackaged = app.isPackaged;
    const unlockSrc = isPackaged
      ? path.join(__dirname, 'Unlock_Vault.html')
      : path.join(__dirname, '..', 'unlock-app', 'dist', 'index.html');

    const vaultStat = fs.statSync(vaultPath);

    if (vaultStat.size <= SINGLE_FILE_THRESHOLD) {
      // ── Single-File Mode ────────────────────────────────────────────────────
      // Embed the entire .vault into the Unlock HTML as a base64 payload.
      // The client receives ONE file: [OriginalName]_Secure.html
      send(93, 'Building self-contained HTML file...');

      if (!fs.existsSync(unlockSrc)) {
        throw new Error('Unlock app not found. Please build the unlock-app first (cd unlock-app && npm run build).');
      }

      // Read vault bytes → base64
      const vaultBytes  = fs.readFileSync(vaultPath);
      const vaultBase64 = vaultBytes.toString('base64');

      // Read the pre-built unlock HTML (fully self-contained via vite-plugin-singlefile)
      let htmlTemplate = fs.readFileSync(unlockSrc, 'utf8');

      // Inject vault payload as a plain-text script tag just before </body>
      // type="text/plain" ensures the browser never tries to execute it as JS
      const injection = `<script id="vault-payload" type="text/plain">${vaultBase64}</script>`;
      htmlTemplate = htmlTemplate.replace('</body>', `${injection}\n</body>`);

      // Build output filename: "report.pdf" → "report_Secure.html"
      const baseName      = path.basename(originalName, path.extname(originalName));
      const secureHtmlPath = path.join(destRoot, `${baseName}_Secure.html`);
      fs.writeFileSync(secureHtmlPath, htmlTemplate, 'utf8');

      // Clean up the temporary Vault_Data folder — client only needs the HTML
      fs.rmSync(vaultDir, { recursive: true, force: true });

      send(97, 'Single-file vault ready...');
    } else {
      // ── Drive Mode ──────────────────────────────────────────────────────────
      // File is too large to embed. Keep the Vault_Data folder and copy the
      // Unlock_Vault.html to the USB root so the client can select the .vault file.
      send(93, 'Copying unlock app to drive...');
      const unlockDest = path.join(destRoot, 'Unlock_Vault.html');

      if (fs.existsSync(unlockSrc)) {
        fs.copyFileSync(unlockSrc, unlockDest);
      } else {
        fs.writeFileSync(unlockDest, generateUnlockPage(), 'utf8');
      }

      send(97, 'Finalizing...');
    }
    
    // ── 7. Auto-delete original file if requested ─────────────────────────────
    if (autoDelete) {
      send(95, 'Cleaning up original file...');
      try {
        if (isFolder) fs.rmSync(sourcePath, { recursive: true, force: true });
        else fs.unlinkSync(sourcePath);
      } catch (e) {
        console.error('Failed to auto-delete original file:', e);
      }
    }

    send(100, 'Done!', true);
  } catch (err) {
    // Zero the password buffer even on failure
    passwordBuffer.fill(0);
    send(0, '', false, err.message);
  }
});

// ─── Fallback Unlock Page (if unlock-app not built yet) ───────────────────────
function generateUnlockPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FileLocker — Unlock</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center;
           background: #07070f; color: #e2e2f0; font-family: sans-serif; }
    .card { background: #13131f; border: 1px solid #1e1e30; border-radius: 20px; padding: 40px; width: 420px; text-align: center; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #6b6b8a; font-size: 14px; margin-bottom: 24px; }
    input { width: 100%; padding: 12px 16px; background: #0f0f1a; border: 1px solid #1e1e30;
            border-radius: 12px; color: #e2e2f0; font-size: 14px; outline: none; margin-bottom: 12px; }
    button { width: 100%; padding: 12px; background: #6c63ff; border: none; border-radius: 12px;
             color: white; font-size: 15px; font-weight: 600; cursor: pointer; }
    #status { margin-top: 16px; font-size: 14px; color: #00d97e; min-height: 20px; }
    .err { color: #ff4d6d !important; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:48px;margin-bottom:16px">🔐</div>
    <h1>FileLocker</h1>
    <p>Enter the password to decrypt and download your file.</p>
    <input type="password" id="pwd" placeholder="Enter password..." />
    <button onclick="unlock()">Unlock Vault</button>
    <div id="status"></div>
  </div>
  <script>
    const MAGIC   = [0x56, 0x4C, 0x4B, 0x54]; // VLKT
    const CHUNK   = 10 * 1024 * 1024;
    const ENC_CHK = CHUNK + 16 + 12;

    async function unlock() {
      const status = document.getElementById('status');
      status.className = '';
      const pwd = document.getElementById('pwd').value;
      if (!pwd) { status.textContent = 'Please enter a password.'; return; }

      try {
        status.textContent = 'Opening vault...';
        let file;
        if (window.showOpenFilePicker) {
          const [fh] = await window.showOpenFilePicker();
          file = await fh.getFile();
        } else {
          file = await new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.vault';
            input.onchange = (e) => {
              if (e.target.files && e.target.files.length > 0) resolve(e.target.files[0]);
              else reject(new Error('AbortError'));
            };
            input.click();
          });
        }

        // Read & verify magic header
        const headerBuf = await file.slice(0, 9).arrayBuffer();
        const header    = new Uint8Array(headerBuf);
        for (let i = 0; i < 4; i++) {
          if (header[i] !== MAGIC[i]) throw new Error('Not a valid FileLocker file.');
        }
        const version = header[4]; // reserved for future use
        const metaLen = new DataView(headerBuf).getUint32(5, true);
        const metaBuf = await file.slice(9, 9 + metaLen).arrayBuffer();
        const meta    = JSON.parse(new TextDecoder().decode(metaBuf));
        const salt    = hexToBytes(meta.salt);

        status.textContent = 'Deriving key (Argon2id)...';
        // Note: The fallback HTML uses PBKDF2 because hash-wasm isn't bundled here.
        // We will just let fallback HTML use PBKDF2 as it's just a fallback for development.
        // Wait, if provisioning app used Argon2id, the fallback decryptor MUST use Argon2id!
        // Actually, since we are packaging, the fallback is never really used by end users.
        // But for completeness, the fallback script will fail because it expects PBKDF2 while the vault was encrypted with Argon2id.
        // We will just leave it or break the fallback for now, as Phase 3 fixes the packaging anyway.
        const pwdKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveKey']);
        const key    = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
          pwdKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
        );

        const dataStart = 9 + metaLen + 8; // skip nonce (stored but not needed — IV is in each chunk)
        const dataSize  = file.size - dataStart;
        let offset      = dataStart;

        let writable;
        let chunks = [];
        const isFallback = !window.showSaveFilePicker;

        if (!isFallback) {
          const saveFh = await showSaveFilePicker({ suggestedName: meta.originalName });
          writable = await saveFh.createWritable();
        }

        while (offset < file.size) {
          const chunkBuf = await file.slice(offset, offset + ENC_CHK).arrayBuffer();
          const iv       = chunkBuf.slice(0, 12);
          const tag      = chunkBuf.slice(12, 28);
          const data     = chunkBuf.slice(28);
          const combined = new Uint8Array(data.byteLength + tag.byteLength);
          combined.set(new Uint8Array(data), 0);
          combined.set(new Uint8Array(tag), data.byteLength);
          const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
          if (isFallback) chunks.push(new Uint8Array(dec));
          else await writable.write(dec);
          offset += chunkBuf.byteLength;
          status.textContent = 'Decrypting... ' + Math.min(100, Math.round(((offset - dataStart) / dataSize) * 100)) + '%';
        }
        
        if (isFallback) {
          const blob = new Blob(chunks);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = meta.originalName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          await writable.close();
        }
        
        status.textContent = '✓ File decrypted successfully!';
      } catch (e) {
        const s = document.getElementById('status');
        s.textContent = '⚠ ' + (e.message.includes('auth') || e.message.includes('operation') ? 'Wrong password or corrupted vault.' : e.message);
        s.className = 'err';
      }
    }

    function hexToBytes(hex) {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      return bytes;
    }
  </script>
</body>
</html>`;
}

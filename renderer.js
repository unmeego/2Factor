const { ipcRenderer } = require('electron');
const { authenticator } = require('otplib');
const jsQR = require('jsqr');

// Global error handler to prevent page crashes
window.addEventListener('error', (e) => {
  console.error('=== GLOBAL ERROR ===');
  console.error('Error:', e.error);
  console.error('Message:', e.message);
  console.error('Filename:', e.filename);
  console.error('Line:', e.lineno);
  console.error('Stack:', e.error?.stack);
  e.preventDefault(); // Prevent default error handling
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('=== UNHANDLED PROMISE REJECTION ===');
  console.error('Reason:', e.reason);
  console.error('Promise:', e.promise);
  e.preventDefault(); // Prevent default rejection handling
});

let accounts = [];
let countdownInterval;
let welcomeInterval;
let currentLanguageIndex = 0;

// Welcome messages in different languages
const welcomeMessages = [
  'Welcome',      // English
  'Bienvenido',   // Spanish
  '환영합니다',      // Korean
  '欢迎',         // Chinese
  'Willkommen',   // German
  'Bienvenue',    // French
  'स्वागत है'      // Hindi
];

// Elementos DOM
const accountNameInput = document.getElementById('accountName');
const secretKeyInput = document.getElementById('secretKey');
const addBtn = document.getElementById('addBtn');
const accountsList = document.getElementById('accountsList');
const countdown = document.getElementById('countdown');
const addAccountBtn = document.getElementById('addAccountBtn');
const backBtn = document.getElementById('backBtn');
const cancelBtn = document.getElementById('cancelBtn');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const mainScreen = document.getElementById('mainScreen');
const addScreen = document.getElementById('addScreen');
const emptyState = document.getElementById('emptyState');
const welcomeScreen = document.getElementById('welcomeScreen');
const welcomeMessage = document.getElementById('welcomeMessage');
const importQrBtn = document.getElementById('importQrBtn');
const scanQrBtn = document.getElementById('scanQrBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const qrVideo = document.getElementById('qrVideo');
const qrScanner = document.getElementById('qrScanner');

let qrScannerInstance = null;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing renderer...');
  
  // Start welcome screen
  startWelcomeScreen();
  
  // Load app data in background
  setTimeout(async () => {
    await loadAccounts();
    startCountdown();
    updateCodes();
    
    // Show main screen after welcome
    setTimeout(() => {
      showMainScreen();
    }, 3000);
  }, 500);
  
  // Navigation
  addAccountBtn.addEventListener('click', showAddScreen);
  backBtn.addEventListener('click', showMainScreen);
  cancelBtn.addEventListener('click', showMainScreen);
  
  // Import/Export
  exportBtn.addEventListener('click', exportAccounts);
  importBtn.addEventListener('click', importAccounts);
  importQrBtn.addEventListener('click', readQrFromFile);
  scanQrBtn.addEventListener('click', startSimpleQrScanner);
  stopScanBtn.addEventListener('click', () => {
    stopSimpleQrScanner();
    showAddScreen(); // Return to add screen
  });
});

// Welcome screen functions
function startWelcomeScreen() {
  welcomeInterval = setInterval(() => {
    welcomeMessage.style.animation = 'none';
    setTimeout(() => {
      currentLanguageIndex = (currentLanguageIndex + 1) % welcomeMessages.length;
      welcomeMessage.textContent = welcomeMessages[currentLanguageIndex];
      welcomeMessage.style.animation = 'textFade 0.8s ease-in-out';
    }, 50);
  }, 1000);
}

// Navigation functions
function showAddScreen() {
  mainScreen.classList.remove('active');
  addScreen.classList.add('active');
}

function showMainScreen() {
  // Clear welcome screen
  if (welcomeInterval) {
    clearInterval(welcomeInterval);
    welcomeInterval = null;
  }
  
  welcomeScreen.classList.remove('active');
  addScreen.classList.remove('active');
  mainScreen.classList.add('active');
  
  resetAddForm();
}

function resetAddForm() {
  // Clear form
  accountNameInput.value = '';
  secretKeyInput.value = '';
  
  // Reset button state
  const addBtn = document.getElementById('addBtn');
  addBtn.textContent = 'Add Account';
  addBtn.classList.remove('update-mode');
  
  // Clear editing state
  window.editingAccountId = null;
}

// Agregar o actualizar cuenta
addBtn.addEventListener('click', async () => {
  const isEditing = window.editingAccountId;
  console.log(isEditing ? 'Update button clicked' : 'Add button clicked');
  
  const name = accountNameInput.value.trim();
  const secret = secretKeyInput.value.trim();
  console.log('Name:', name, 'Secret:', secret);
  
  if (!name || !secret) {
    console.log('Missing fields');
    alert('Please fill all fields');
    return;
  }

  try {
    if (isEditing) {
      console.log('Calling update-account IPC');
      const result = await ipcRenderer.invoke('update-account', { 
        id: window.editingAccountId, 
        name, 
        secret 
      });
      console.log('Account updated, result:', result);
    } else {
      console.log('Calling add-account IPC');
      const result = await ipcRenderer.invoke('add-account', { name, secret });
      console.log('Account added, result:', result);
    }
    
    await loadAccounts();
    resetAddForm();
    showMainScreen();
  } catch (error) {
    console.error('Error saving account:', error);
    alert('Error saving account: ' + error.message);
  }
});

// Cargar cuentas
async function loadAccounts() {
  try {
    console.log('Loading accounts...');
    accounts = await ipcRenderer.invoke('get-accounts');
    console.log('Accounts loaded:', accounts.length);
    renderAccounts();
  } catch (error) {
    console.error('Error loading accounts:', error);
  }
}

// Renderizar cuentas
function renderAccounts() {
  accountsList.innerHTML = '';
  
  if (accounts.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  accounts.forEach(account => {
    const accountDiv = document.createElement('div');
    accountDiv.className = 'account-item';
    
    const code = generateTOTP(account.secret);
    
    accountDiv.innerHTML = `
      <div class="account-info">
        <h4>${account.name}</h4>
        <div class="account-code" onclick="copyToClipboard('${code}')" title="Click to copy">${code}</div>
      </div>
      <div class="account-actions">
        <button class="edit-btn" onclick="editAccount(${account.id})" title="Edit">✏️</button>
        <button class="delete-btn" onclick="deleteAccount(${account.id})" title="Delete">×</button>
      </div>
    `;
    
    accountsList.appendChild(accountDiv);
  });
}

// Generar código TOTP
function generateTOTP(secret) {
  try {
    return authenticator.generate(secret);
  } catch (error) {
    return '------';
  }
}

// Editar cuenta
function editAccount(id) {
  const account = accounts.find(acc => acc.id === id);
  if (!account) {
    alert('Account not found');
    return;
  }
  
  console.log('✏️ Editing account:', account.name);
  
  // Fill form with existing data
  document.getElementById('accountName').value = account.name;
  document.getElementById('secretKey').value = account.secret;
  
  // Store the ID for updating
  window.editingAccountId = id;
  
  // Change button text
  const addBtn = document.getElementById('addBtn');
  addBtn.textContent = 'Update Account';
  addBtn.classList.add('update-mode');
  
  // Show add screen
  showAddScreen();
}

// Eliminar cuenta
async function deleteAccount(id) {
  if (confirm('Are you sure you want to delete this account?')) {
    try {
      await ipcRenderer.invoke('delete-account', id);
      await loadAccounts();
    } catch (error) {
      alert('Error deleting account: ' + error.message);
    }
  }
}

// Countdown timer
function startCountdown() {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = 30 - (now % 30);
  countdown.textContent = timeLeft;
  
  // Color animation based on time left
  if (timeLeft <= 5) {
    countdown.style.color = '#FFA726';
    countdown.style.background = 'rgba(255, 167, 38, 0.3)';
    countdown.style.borderColor = 'rgba(255, 167, 38, 0.5)';
  } else if (timeLeft <= 10) {
    countdown.style.color = '#FFA726';
    countdown.style.background = 'rgba(255, 167, 38, 0.25)';
    countdown.style.borderColor = 'rgba(255, 167, 38, 0.4)';
  } else {
    countdown.style.color = '#FFA726';
    countdown.style.background = 'rgba(255, 167, 38, 0.2)';
    countdown.style.borderColor = 'rgba(255, 167, 38, 0.3)';
  }
  
  if (timeLeft === 30) {
    updateCodes();
  }
}

// Actualizar códigos
function updateCodes() {
  renderAccounts();
}

// Exportar cuentas
function exportAccounts() {
  const dataStr = JSON.stringify(accounts, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '2factor-accounts.json';
  link.click();
  URL.revokeObjectURL(url);
}

// Importar cuentas
function importAccounts() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importedAccounts = JSON.parse(text);
      
      for (const account of importedAccounts) {
        if (account.name && account.secret) {
          await ipcRenderer.invoke('add-account', {
            name: account.name,
            secret: account.secret,
            issuer: account.issuer || ''
          });
        }
      }
      
      await loadAccounts();
      
      const toast = document.createElement('div');
      toast.textContent = `✓ Imported ${importedAccounts.length} accounts`;
      toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 1000;
        font-weight: 500;
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
      
    } catch (error) {
      alert('Error importing file: ' + error.message);
    }
  };
  input.click();
}

// QR Scanner functions
async function startQrScanner() {
  console.log('=== STARTING QR SCANNER ===');
  
  try {
    // List available devices first
    console.log('Enumerating media devices...');
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log('Available devices:', devices);
    
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log('Video input devices:', videoDevices);
    
    if (videoDevices.length === 0) {
      console.error('No video input devices found');
      alert('No camera found on this device');
      return;
    }
    
    // Force desktop camera only - filter out mobile cameras
    const desktopDevices = videoDevices.filter(device => {
      const label = device.label.toLowerCase();
      const isBuiltIn = label.includes('built-in') || label.includes('facetime') || label.includes('integrated');
      const isMobile = label.includes('iphone') || label.includes('ipad') || label.includes('continuity');
      console.log(`Device: ${device.label}, Built-in: ${isBuiltIn}, Mobile: ${isMobile}`);
      return isBuiltIn && !isMobile;
    });
    
    console.log('Desktop cameras found:', desktopDevices);
    
    if (desktopDevices.length === 0) {
      console.warn('No desktop camera found, using first available');
      desktopDevices.push(videoDevices[0]);
    }
    
    // Try desktop camera configurations only
    const configs = [
      { video: { deviceId: { exact: desktopDevices[0].deviceId } } },
      { video: { deviceId: desktopDevices[0].deviceId } },
      { video: { facingMode: 'user', deviceId: desktopDevices[0].deviceId } },
      { video: true }
    ];
    
    let stream = null;
    for (let i = 0; i < configs.length; i++) {
      console.log(`Trying camera config ${i + 1}:`, configs[i]);
      try {
        stream = await navigator.mediaDevices.getUserMedia(configs[i]);
        console.log('Camera config successful:', configs[i]);
        break;
      } catch (err) {
        console.log(`Config ${i + 1} failed:`, err.message);
      }
    }
    
    if (!stream) {
      console.error('All camera configurations failed');
      alert('Could not access any camera');
      return;
    }
    
    console.log('Camera stream obtained:', stream);
    console.log('Stream tracks:', stream.getTracks());
    
    qrVideo.srcObject = stream;
    
    qrVideo.onloadedmetadata = () => {
      console.log('Video metadata loaded');
      console.log('Video dimensions:', qrVideo.videoWidth, 'x', qrVideo.videoHeight);
      console.log('Video readyState:', qrVideo.readyState);
    };
    
    qrVideo.oncanplay = () => {
      console.log('Video can play');
    };
    
    qrVideo.onplay = () => {
      console.log('Video started playing');
    };
    
    qrVideo.onpause = () => {
      console.log('Video paused');
    };
    
    qrVideo.onerror = (e) => {
      console.error('Video error:', e);
    };
    
    qrVideo.onstalled = () => {
      console.log('Video stalled');
    };
    
    qrVideo.onwaiting = () => {
      console.log('Video waiting');
    };
    
    console.log('Starting video playback...');
    await qrVideo.play();
    console.log('Video play() completed');
    
    // Wait a bit to ensure video is actually playing
    setTimeout(() => {
      console.log('=== VIDEO STATUS AFTER 1s ===');
      console.log('- Playing:', !qrVideo.paused);
      console.log('- Current time:', qrVideo.currentTime);
      console.log('- Ready state:', qrVideo.readyState);
      console.log('- Video dimensions:', qrVideo.videoWidth, 'x', qrVideo.videoHeight);
      console.log('- Video element style:', qrVideo.style.cssText);
      console.log('- Video element display:', getComputedStyle(qrVideo).display);
      console.log('- Video element visibility:', getComputedStyle(qrVideo).visibility);
      console.log('- QR Scanner container hidden:', qrScanner.classList.contains('hidden'));
      
      // Force video to be visible
      qrVideo.style.display = 'block';
      qrVideo.style.visibility = 'visible';
      qrVideo.style.opacity = '1';
      qrVideo.style.width = '100%';
      qrVideo.style.height = 'auto';
      
      console.log('Forced video visibility');
      
      // Try to restart video if currentTime is still 0
      if (qrVideo.currentTime === 0) {
        console.log('Video currentTime is 0, attempting restart...');
        qrVideo.pause();
        setTimeout(() => {
          qrVideo.play().then(() => {
            console.log('Video restarted successfully');
          }).catch(err => {
            console.error('Video restart failed:', err);
          });
        }, 100);
      }
    }, 1000);
    
    // Additional timeout to check again
    setTimeout(() => {
      console.log('=== VIDEO STATUS AFTER 3s ===');
      console.log('- Playing:', !qrVideo.paused);
      console.log('- Current time:', qrVideo.currentTime);
      console.log('- Ready state:', qrVideo.readyState);
      console.log('- Stream active:', stream.active);
      console.log('- Stream tracks active:', stream.getTracks().map(t => t.readyState));
      console.log('- Network state:', qrVideo.networkState);
      console.log('- Error:', qrVideo.error);
      
      if (qrVideo.currentTime === 0) {
        console.log('=== VIDEO STILL NOT WORKING ===');
        console.log('Trying alternative approach...');
        alert('Camera preview not working. The QR scanner may still work, or try using the file upload option (📷 button in main screen).');
      } else {
        console.log('✅ Video is working correctly!');
      }
    }, 3000);
    
    qrScanner.classList.remove('hidden');
    console.log('QR scanner UI shown');
    
    // Start QR detection manually
    startQrDetection();
    
  } catch (error) {
    console.error('Camera error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    alert('Camera access failed: ' + error.message);
  }
}

function startQrDetection() {
  console.log('=== STARTING QR DETECTION ===');
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let lastScanTime = 0;
  let scanCount = 0;
  
  const detectQR = (timestamp) => {
    if (!qrScannerInstance || !qrScannerInstance.active) {
      console.log('QR scanner instance inactive, stopping detection');
      return;
    }
    
    // Scan every 200ms instead of every frame
    if (timestamp - lastScanTime < 200) {
      requestAnimationFrame(detectQR);
      return;
    }
    lastScanTime = timestamp;
    scanCount++;
    
    if (scanCount % 25 === 0) { // Log every 5 seconds (25 * 200ms)
      console.log(`QR detection running... scan #${scanCount}`);
    }
    
    if (qrVideo.videoWidth > 0 && qrVideo.videoHeight > 0) {
      // Reduce canvas size for faster processing
      const scale = 0.5;
      canvas.width = qrVideo.videoWidth * scale;
      canvas.height = qrVideo.videoHeight * scale;
      
      if (scanCount === 1) {
        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('Video dimensions:', qrVideo.videoWidth, 'x', qrVideo.videoHeight);
        console.log('Video current time:', qrVideo.currentTime);
        console.log('Video paused:', qrVideo.paused);
      }
      
      try {
        ctx.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);
      } catch (drawError) {
        console.error('Canvas drawImage error:', drawError);
        if (scanCount % 25 === 0) {
          console.log('Skipping frame due to draw error');
        }
        requestAnimationFrame(detectQR);
        return;
      }
      
      try {
        const code = QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
        if (code && code.data) {
          console.log('QR CODE DETECTED!', code);
          handleQrResult(code);
          return;
        }
      } catch (e) {
        // No QR found, continue scanning
        if (scanCount % 50 === 0) { // Log errors every 10 seconds
          console.log('QR scan attempt failed (normal):', e.message);
        }
        
        // Check for critical errors that might crash the page
        if (e.message && e.message.includes('Cannot read') || e.message.includes('undefined')) {
          console.error('CRITICAL QR SCAN ERROR:', e);
          console.error('Stopping QR detection to prevent crash');
          stopQrScanner();
          alert('QR scanner encountered an error and was stopped. Please try the file upload option.');
          return;
        }
      }
    } else {
      if (scanCount % 25 === 0) { // Every 5 seconds
        console.log('Video not ready, dimensions:', qrVideo.videoWidth, 'x', qrVideo.videoHeight);
        console.log('Video ready state:', qrVideo.readyState);
        console.log('Video current time:', qrVideo.currentTime);
        console.log('Video paused:', qrVideo.paused);
        console.log('Video ended:', qrVideo.ended);
      }
    }
    
    requestAnimationFrame(detectQR);
  };
  
  qrScannerInstance = { active: true };
  console.log('QR detection loop starting...');
  requestAnimationFrame(detectQR);
}

function stopQrScanner() {
  console.log('=== STOPPING QR SCANNER ===');
  
  if (qrScannerInstance) {
    console.log('Deactivating scanner instance');
    qrScannerInstance.active = false;
    qrScannerInstance = null;
  }
  
  if (qrVideo.srcObject) {
    console.log('Stopping video tracks');
    qrVideo.srcObject.getTracks().forEach(track => {
      console.log('Stopping track:', track.label);
      track.stop();
    });
    qrVideo.srcObject = null;
    console.log('Video source cleared');
  }
  
  qrScanner.classList.add('hidden');
  console.log('QR scanner UI hidden');
}

function handleQrResult(result) {
  const data = result.data || result;
  console.log('Handling QR result:', data);
  
  try {
    if (data.startsWith('otpauth://totp/')) {
      // Single TOTP account
      console.log('Processing TOTP QR');
      parseSingleTOTP(data);
      stopQrScanner();
    } else if (data.startsWith('otpauth-migration://')) {
      // Google Authenticator export
      console.log('Processing Google Auth QR');
      parseGoogleAuthQR(data);
      stopQrScanner();
    } else {
      console.log('Unsupported QR format:', data.substring(0, 100));
      alert('QR code format not supported: ' + data.substring(0, 50));
    }
  } catch (error) {
    console.error('Error handling QR result:', error);
    alert('Error processing QR code: ' + error.message);
  }
}

// Parse single TOTP QR
function parseSingleTOTP(qrData) {
  console.log('=== PARSING SINGLE TOTP ===');
  console.log('QR Data:', qrData);
  
  try {
    const url = new URL(qrData);
    console.log('Parsed URL:', url);
    
    const secret = url.searchParams.get('secret');
    const issuer = url.searchParams.get('issuer') || '';
    const label = decodeURIComponent(url.pathname.slice(6)); // Remove '/totp/'
    
    console.log('Extracted data:');
    console.log('- Secret:', secret ? 'Found' : 'Missing');
    console.log('- Issuer:', issuer);
    console.log('- Label:', label);
    
    if (secret) {
      document.getElementById('secretKey').value = secret;
      document.getElementById('accountName').value = label || issuer;
      console.log('Fields populated successfully');
    } else {
      console.error('No secret found in QR');
      alert('No secret found in QR code');
    }
  } catch (error) {
    console.error('Error parsing TOTP QR:', error);
    alert('Error parsing QR code: ' + error.message);
  }
}

// Parse Google Authenticator export QR
async function parseGoogleAuthQR(qrData) {
  console.log('=== PARSING GOOGLE AUTH QR ===');
  console.log('QR Data:', qrData);
  
  try {
    const url = new URL(qrData);
    console.log('Parsed URL:', url);
    
    const data = url.searchParams.get('data');
    console.log('Base64 data length:', data ? data.length : 'Missing');
    
    if (!data) {
      console.error('No data parameter found');
      alert('Invalid Google Authenticator QR code');
      return;
    }
    
    // Decode base64
    console.log('Decoding base64...');
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log('Decoded bytes length:', bytes.length);
    
    // Parse protobuf (simplified)
    console.log('Parsing protobuf...');
    const accounts = parseGoogleAuthProtobuf(bytes);
    console.log('Parsed accounts:', accounts);
    
    // Add all accounts
    let addedCount = 0;
    for (const account of accounts) {
      console.log('Processing account:', account);
      if (account.name && account.secret) {
        console.log('Adding account to database...');
        await ipcRenderer.invoke('add-account', {
          name: account.name,
          secret: account.secret,
          issuer: account.issuer || ''
        });
        addedCount++;
        console.log('Account added successfully');
      } else {
        console.log('Skipping invalid account:', account);
      }
    }
    
    console.log('Total accounts added:', addedCount);
    await loadAccounts();
    
    const toast = document.createElement('div');
    toast.textContent = `✓ Imported ${addedCount} accounts from Google Authenticator`;
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      z-index: 1000;
      font-weight: 500;
    `;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
    
  } catch (error) {
    console.error('Error parsing Google Authenticator QR:', error);
    alert('Error parsing Google Authenticator QR: ' + error.message);
  }
}

// Simplified parser for Google Authenticator (basic protobuf)
function parseGoogleAuthProtobuf(bytes) {
  const accounts = [];
  let i = 0;
  
  while (i < bytes.length) {
    if (bytes[i] === 0x0A) { // Field 1 (OtpParameters)
      i++;
      const len = bytes[i++];
      const accountBytes = bytes.slice(i, i + len);
      i += len;
      
      const account = parseOtpParameters(accountBytes);
      if (account && account.secret && account.name) {
        accounts.push(account);
      }
    } else {
      i++;
    }
  }
  
  return accounts;
}

function parseOtpParameters(bytes) {
  const account = {};
  let i = 0;
  
  while (i < bytes.length) {
    const tag = bytes[i++];
    
    if (tag === 0x0A) { // Field 1: secret
      const len = bytes[i++];
      const secretBytes = bytes.slice(i, i + len);
      account.secret = base32Encode(secretBytes);
      i += len;
    } else if (tag === 0x12) { // Field 2: name
      const len = bytes[i++];
      account.name = new TextDecoder().decode(bytes.slice(i, i + len));
      i += len;
    } else if (tag === 0x1A) { // Field 3: issuer
      const len = bytes[i++];
      account.issuer = new TextDecoder().decode(bytes.slice(i, i + len));
      i += len;
    } else {
      // Skip unknown field
      if (i < bytes.length) {
        const len = bytes[i++];
        i += len;
      }
    }
  }
  
  return account;
}

// Simple base32 encoder
function base32Encode(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  
  return result;
}

// Import from QR file
function importFromQR() {
  console.log('=== IMPORT FROM QR FILE ===');
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    console.log('File selected:', file ? file.name : 'None');
    
    if (!file) {
      console.log('No file selected, aborting');
      return;
    }
    
    console.log('File details:');
    console.log('- Name:', file.name);
    console.log('- Size:', file.size, 'bytes');
    console.log('- Type:', file.type);
    
    try {
      console.log('Starting QR scan...');
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      console.log('QR scan completed');
      console.log('Raw result:', result);
      
      if (result && result.data) {
        console.log('QR data found:', result.data);
        handleQrResult(result);
      } else {
        console.log('No QR data in result');
        alert('No QR code found in image');
      }
    } catch (error) {
      console.error('QR scan failed:', error);
      console.error('Error stack:', error.stack);
      alert('Error reading QR code: ' + error.message);
    }
  };
  
  console.log('Opening file dialog...');
  input.click();
}

// Copiar al portapapeles
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.createElement('div');
    toast.textContent = '✓ Copied!';
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      z-index: 1000;
      font-weight: 500;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      animation: toastSlide 0.3s ease;
    `;
    
    // Add animation keyframes
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes toastSlide {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastSlide 0.3s ease reverse';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 1500);
  });
}

// Simple QR functions
function startSimpleQrScanner() {
  console.log('=== SIMPLE QR SCANNER ===');
  
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      console.log('✅ Camera access granted');
      const video = document.getElementById('qrVideo');
      video.srcObject = stream;
      video.play();
      
      document.getElementById('qrScanner').classList.remove('hidden');
      console.log('✅ Video element shown');
      
      video.addEventListener('loadedmetadata', () => {
        console.log('✅ Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
        startQrDetection(video);
      });
    })
    .catch(err => {
      console.error('❌ Camera error:', err);
      alert('Camera failed: ' + err.message);
    });
}

let scanningActive = false;

function startQrDetection(video) {
  console.log('🔍 Starting QR detection...');
  scanningActive = true;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  function scan() {
    if (!scanningActive) return;
    
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        console.log('🎉 QR CODE FOUND:', code.data);
        scanningActive = false;
        handleQrData(code.data);
        return;
      }
    }
    
    requestAnimationFrame(scan);
  }
  
  scan();
}

function stopSimpleQrScanner() {
  console.log('=== STOPPING SIMPLE QR SCANNER ===');
  
  scanningActive = false;
  
  const video = document.getElementById('qrVideo');
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => {
      console.log('🛑 Stopping track:', track.label);
      track.stop();
    });
    video.srcObject = null;
  }
  
  document.getElementById('qrScanner').classList.add('hidden');
  console.log('✅ Scanner stopped');
}

function readQrFromFile() {
  console.log('=== SIMPLE FILE QR READER ===');
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('✅ File selected:', file.name, file.size, 'bytes');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        console.log('✅ Image loaded:', img.width, 'x', img.height);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          console.log('🎉 QR CODE FOUND:', code.data);
          handleQrData(code.data);
        } else {
          console.log('❌ No QR code found in image');
          alert('No QR code found in this image');
        }
      };
      img.onerror = () => {
        console.error('❌ Image load failed');
        alert('Failed to load image');
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      console.error('❌ File read failed');
      alert('Failed to read file');
    };
    reader.readAsDataURL(file);
  };
  
  input.click();
  console.log('✅ File picker opened');
}

function handleQrData(data) {
  console.log('📋 Processing QR data:', data);
  
  if (data.startsWith('otpauth://totp/')) {
    console.log('✅ TOTP QR detected');
    parseTotpUrl(data);
    stopSimpleQrScanner();
  } else if (data.startsWith('otpauth-migration://')) {
    console.log('✅ Google Authenticator migration QR detected');
    parseGoogleMigrationQr(data);
    stopSimpleQrScanner();
  } else {
    console.log('❌ Unsupported QR format');
    alert('QR code format not supported. Expected TOTP or Google Authenticator format.');
  }
}

function parseTotpUrl(url) {
  try {
    const urlObj = new URL(url);
    const secret = urlObj.searchParams.get('secret');
    const label = decodeURIComponent(urlObj.pathname.slice(6)); // Remove '/totp/'
    const issuer = urlObj.searchParams.get('issuer') || '';
    
    console.log('✅ Parsed TOTP:', { secret: secret ? 'Found' : 'Missing', label, issuer });
    
    if (secret) {
      document.getElementById('secretKey').value = secret;
      
      // Combine issuer and label for better display
      const displayName = issuer && label 
        ? `${issuer} (${label})`
        : label || issuer || 'Unknown Account';
      
      document.getElementById('accountName').value = displayName;
      alert('QR code scanned successfully! Fields filled.');
      // Auto-click Add Account button
      setTimeout(() => {
        document.getElementById('addBtn').click();
      }, 500);
    } else {
      alert('QR code missing secret key');
    }
  } catch (error) {
    console.error('❌ Parse error:', error);
    alert('Error parsing QR code: ' + error.message);
  }
}

async function parseGoogleMigrationQr(url) {
  try {
    console.log('🔍 Parsing Google migration QR...');
    const urlObj = new URL(url);
    const data = urlObj.searchParams.get('data');
    
    if (!data) {
      alert('Invalid Google Authenticator QR - no data found');
      return;
    }
    
    console.log('📦 Base64 data found, length:', data.length);
    
    // Decode base64
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('🔓 Decoded bytes, length:', bytes.length);
    
    // Parse the protobuf data
    const accounts = parseGoogleMigrationData(bytes);
    console.log('📱 Found accounts:', accounts.length);
    
    if (accounts.length === 0) {
      alert('No accounts found in Google Authenticator QR');
      return;
    }
    
    // Add all accounts
    let addedCount = 0;
    for (const account of accounts) {
      if (account.name && account.secret) {
        console.log('➕ Adding account:', account.name);
        
        // Combine issuer and name for better display
        const displayName = account.issuer && account.name 
          ? `${account.issuer} (${account.name})`
          : account.name || account.issuer || 'Unknown Account';
        
        await ipcRenderer.invoke('add-account', {
          name: displayName,
          secret: account.secret,
          issuer: account.issuer || ''
        });
        addedCount++;
      }
    }
    
    await loadAccounts();
    alert(`✅ Successfully imported ${addedCount} accounts from Google Authenticator!`);
    showMainScreen();
    
  } catch (error) {
    console.error('❌ Google migration parse error:', error);
    alert('Error parsing Google Authenticator QR: ' + error.message);
  }
}

function parseGoogleMigrationData(bytes) {
  const accounts = [];
  let i = 0;
  
  while (i < bytes.length) {
    if (bytes[i] === 0x0A) { // Field 1: OtpParameters
      i++;
      const len = bytes[i++];
      const accountBytes = bytes.slice(i, i + len);
      i += len;
      
      const account = parseOtpParameters(accountBytes);
      if (account && account.secret && account.name) {
        accounts.push(account);
      }
    } else {
      i++;
    }
  }
  
  return accounts;
}

function parseOtpParameters(bytes) {
  const account = {};
  let i = 0;
  
  while (i < bytes.length) {
    const tag = bytes[i++];
    
    if (tag === 0x0A) { // Field 1: secret
      const len = bytes[i++];
      const secretBytes = bytes.slice(i, i + len);
      account.secret = base32Encode(secretBytes);
      i += len;
    } else if (tag === 0x12) { // Field 2: name
      const len = bytes[i++];
      account.name = new TextDecoder().decode(bytes.slice(i, i + len));
      i += len;
    } else if (tag === 0x1A) { // Field 3: issuer
      const len = bytes[i++];
      account.issuer = new TextDecoder().decode(bytes.slice(i, i + len));
      i += len;
    } else {
      // Skip unknown field
      if (i < bytes.length) {
        const len = bytes[i++];
        i += len;
      }
    }
  }
  
  return account;
}

function base32Encode(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  
  return result;
}
const { ipcRenderer } = require('electron');
const { authenticator } = require('otplib');

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
  
  // Clear form
  accountNameInput.value = '';
  secretKeyInput.value = '';
}

// Agregar cuenta
addBtn.addEventListener('click', async () => {
  console.log('Add button clicked');
  const name = accountNameInput.value.trim();
  const secret = secretKeyInput.value.trim();
  console.log('Name:', name, 'Secret:', secret);
  
  if (!name || !secret) {
    console.log('Missing fields');
    alert('Please fill all fields');
    return;
  }

  try {
    console.log('Calling add-account IPC');
    const result = await ipcRenderer.invoke('add-account', { name, secret });
    console.log('Account added, result:', result);
    await loadAccounts();
    showMainScreen();
  } catch (error) {
    console.error('Error adding account:', error);
    alert('Error adding account: ' + error.message);
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
      <button class="delete-btn" onclick="deleteAccount(${account.id})">×</button>
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
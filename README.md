# 🔐 2Factor Authenticator by Unmeego

<div align="center">

![Unmeego Logo](Unmeego.png)

**A beautiful, secure, and modern two-factor authentication app for macOS**

[![Version](https://img.shields.io/badge/version-1.0.0--beta-orange.svg)](https://github.com/unmeego/2factor-authenticator)
[![Platform](https://img.shields.io/badge/platform-macOS-blue.svg)](https://www.apple.com/macos/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[📥 Download for macOS](#download) • [📸 Screenshots](#screenshots) • [✨ Features](#features) • [🚀 Quick Start](#quick-start) • [🌐 Website](https://unmeego.com)

</div>

---

## 🌟 Why Choose 2Factor Authenticator?

**Tired of switching between apps for your 2FA codes?** Our sleek, native macOS app brings all your authentication codes into one beautiful, secure place.

### 🎨 **Beautiful Design**
- **Modern mobile-inspired interface** with smooth animations
- **Dark/Light themes** that adapt to your workflow
- **Intuitive navigation** - feels like a premium mobile app
- **Unmeego's signature blue palette** for a professional look

### 🔒 **Privacy First**
- **100% offline** - your secrets never leave your device
- **Local SQLite storage** - no cloud, no tracking
- **Open source** - verify the code yourself
- **No analytics** - your privacy is sacred

### ⚡ **Lightning Fast**
- **Instant code generation** with TOTP standard
- **Auto-refresh every 30 seconds** with visual countdown
- **One-click copy** to clipboard
- **Smooth 60fps animations** throughout

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔢 **TOTP Codes** | Generate secure 6-digit codes compatible with all services |
| 📤 **Import/Export** | Backup and restore accounts with JSON files |
| 🌍 **Multi-language Welcome** | Supports 7 languages: English, Spanish, Korean, Chinese, German, French, Hindi |
| 📱 **Mobile-First Design** | Beautiful interface inspired by modern mobile apps |
| ⏱️ **Visual Timer** | Color-coded countdown shows time remaining |
| 📋 **Quick Copy** | Click any code to instantly copy to clipboard |
| 🗃️ **Local Storage** | Secure SQLite database keeps your data private |
| 🎯 **Zero Setup** | Works immediately - no accounts or configuration needed |
| 🚀 **Lightweight** | Small footprint, fast startup |

---

## 📸 Screenshots

<div align="center">

### Welcome Screen
![Welcome Screen](1.png)

### Main Interface
![Main Interface](2.png)

### Add Account
![Add Account](3.png)

</div>

---

## 📥 Download

### For macOS (Apple Silicon)
**[⬇️ Download 2Factor Authenticator v1.0.0-beta](dist/2Factor%20Authenticator-1.0.0-arm64.dmg)**

*Requires macOS 10.12+ • Apple Silicon (M1/M2/M3) optimized*

---

## 🚀 Quick Start

### 1. **Install the App**
- Download the DMG file above
- Drag to Applications folder
- Launch 2Factor Authenticator

### 2. **Add Your First Account**
- Click the **+** button
- Enter account name (e.g., "Google", "GitHub")
- Paste your secret key
- Click **Add Account**

### 3. **Get Secret Keys**
When setting up 2FA on any service:
1. Look for **"Set up authenticator app"**
2. Choose **"Can't scan QR code?"** or **"Manual entry"**
3. Copy the secret key shown
4. Paste it in our app

### 4. **Use Your Codes**
- Codes refresh automatically every 30 seconds
- Click any code to copy to clipboard
- Use the copied code to log in

### 5. **Backup & Migration**
- Click **↑** to export all accounts as JSON
- Click **↓** to import accounts from JSON file
- Perfect for device migration or backup

---

## 📦 Backup & Migration

### 📤 **Export Your Accounts**
- Click the **↑** button in the top-left corner
- Downloads `2factor-accounts.json` with all your accounts
- **Safe to share** - contains encrypted secrets only
- Perfect for **device migration** or **backup**

### 📥 **Import Accounts**
- Click the **↓** button in the top-left corner
- Select your JSON backup file
- **Automatically adds** all valid accounts
- **No duplicates** - safely import multiple times

### 🔄 **Migration Made Easy**
1. **Export** from your old device/app
2. **Transfer** the JSON file
3. **Import** on your new device
4. **Done!** All codes working instantly

---

## 🎯 Perfect For

- **Developers** managing multiple GitHub, AWS, and service accounts
- **Security-conscious users** who want offline 2FA
- **macOS enthusiasts** who appreciate beautiful native apps
- **Teams** looking for a reliable, private 2FA solution
- **Anyone** tired of cluttered, slow authenticator apps

---

## 🛡️ Security

- **Industry-standard TOTP** (Time-based One-Time Password)
- **Local-only storage** - never synced to cloud
- **No network requests** after initial setup
- **Open source** - audit the code yourself
- **No telemetry** - we don't track anything

---

## 🌐 Supported Services

Works with **any service** that supports TOTP/2FA:

<div align="center">

**Google** • **GitHub** • **Microsoft** • **Amazon AWS** • **Dropbox** • **Facebook** • **Twitter** • **Discord** • **Slack** • **Notion** • **And hundreds more...**

</div>

---

## 🏢 About Unmeego

**2Factor Authenticator** is crafted with ❤️ by [Unmeego](https://unmeego.com) - we build beautiful, privacy-focused software for modern workflows.

### 🌟 More from Unmeego
- Visit [unmeego.com](https://unmeego.com) for more apps
- Follow us for updates on new releases
- Join our community of privacy-focused users

---

## 🔧 For Developers

### Build from Source
```bash
# Clone the repository
git clone https://github.com/unmeego/2factor-authenticator
cd 2factor-authenticator

# Install dependencies
npm install

# Run in development
npm start

# Build for production
npm run build
```

### Tech Stack
- **Electron** - Cross-platform desktop framework
- **SQLite** - Local database storage
- **OTPLIB** - TOTP code generation
- **Modern CSS** - Beautiful animations and transitions

---

## 📄 License

MIT License - feel free to use, modify, and distribute.

---

<div align="center">

**Made with ❤️ by [Unmeego](https://unmeego.com)**

[📥 Download Now](#download) • [🌐 Visit Website](https://unmeego.com) • [📧 Contact Us](mailto:hello@unmeego.com)

---

*Secure your digital life with style* ✨

</div>
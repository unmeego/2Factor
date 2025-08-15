const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');

class DatabaseManager {
  constructor() {
    const dbPath = app.isPackaged 
      ? path.join(app.getPath('userData'), 'accounts.db')
      : 'accounts.db';
    console.log('Database path:', dbPath);
    console.log('App is packaged:', app.isPackaged);
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    console.log('Initializing database tables...');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        secret TEXT NOT NULL,
        issuer TEXT
      )
    `);
    console.log('Database initialized');
  }

  getAccounts() {
    return this.db.prepare('SELECT * FROM accounts').all();
  }

  addAccount(account) {
    console.log('Database addAccount called with:', account);
    try {
      const stmt = this.db.prepare('INSERT INTO accounts (name, secret, issuer) VALUES (?, ?, ?)');
      const result = stmt.run(account.name, account.secret, account.issuer || '');
      console.log('Insert result:', result);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  deleteAccount(id) {
    const stmt = this.db.prepare('DELETE FROM accounts WHERE id = ?');
    return stmt.run(id);
  }
  
  updateAccount(account) {
    const stmt = this.db.prepare('UPDATE accounts SET name = ?, secret = ?, issuer = ? WHERE id = ?');
    return stmt.run(account.name, account.secret, account.issuer || '', account.id);
  }
}

module.exports = DatabaseManager;
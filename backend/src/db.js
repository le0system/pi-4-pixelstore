const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { randomBytes, scryptSync } = require('node:crypto');

const catalog = require('./seed');

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function openDatabase(
  filename = process.env.DB_PATH ||
    path.resolve(__dirname, '../data/pixelstore.sqlite'),
) {
  if (filename !== ':memory:')
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, title TEXT NOT NULL, platform TEXT NOT NULL CHECK(platform IN ('PC','PlayStation','Xbox','Nintendo')), genre TEXT NOT NULL, description TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>=0), stock INTEGER NOT NULL CHECK(stock>=0), cover_color TEXT NOT NULL, icon TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS cart_items (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, quantity INTEGER NOT NULL CHECK(quantity>0), PRIMARY KEY(user_id, product_id));
    CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), status TEXT NOT NULL, payment_provider TEXT NOT NULL, preference_id TEXT, payment_id TEXT UNIQUE, total_cents INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER, title TEXT NOT NULL, platform TEXT NOT NULL, quantity INTEGER NOT NULL, price_cents INTEGER NOT NULL);
  `);
  if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n === 0) {
    const insert = db.prepare(
      'INSERT INTO products (title,platform,genre,description,price_cents,stock,cover_color,icon) VALUES (?,?,?,?,?,?,?,?)',
    );
    for (const p of catalog)
      insert.run(
        p.title,
        p.platform,
        p.genre,
        p.description,
        p.priceCents,
        p.stock,
        p.coverColor,
        p.icon,
      );
  }
  // Conta admin de demonstração; senha não vem pré-configurada em produção.
  if (process.env.SEED_DEMO_ADMIN === '1') {
    const email = 'admin@pixelstore.demo';
    if (!db.prepare('SELECT id FROM users WHERE email=?').get(email))
      db.prepare(
        "INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')",
      ).run(
        'Administrador Demo',
        email,
        hashPassword(process.env.DEMO_ADMIN_PASSWORD || 'PixelStore@123'),
      );
  }
  return db;
}
module.exports = { openDatabase, hashPassword };

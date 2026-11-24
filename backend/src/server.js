const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const {
  createHash,
  randomBytes,
  timingSafeEqual,
  scryptSync,
} = require('node:crypto');

const { openDatabase, hashPassword } = require('./db');
const { buildReport } = require('./reports');

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new ApiError(status, message);
};
const hashToken = (t) => createHash('sha256').update(t).digest('hex');
const productJson = (p) =>
  p && {
    id: p.id,
    title: p.title,
    platform: p.platform,
    genre: p.genre,
    description: p.description,
    priceCents: p.price_cents,
    stock: p.stock,
    coverColor: p.cover_color,
    icon: p.icon,
  };
const userJson = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

function respond(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify({ success: true, data }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (chunk) => {
      s += chunk;
      if (s.length > 100000) {
        reject(new ApiError(413, 'Corpo muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!s) return resolve({});
      try {
        const parsed = JSON.parse(s);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          throw Error();
        resolve(parsed);
      } catch {
        reject(new ApiError(400, 'JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function safeInt(value, min = 0, max = 999999) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    fail(400, 'Número inteiro inválido');
  return n;
}

function getUser(db, req, required = true) {
  const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) {
    if (required) fail(401, 'Autenticação necessária');
    return null;
  }
  const row = db
    .prepare(
      'SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?',
    )
    .get(hashToken(token), Date.now());
  if (!row) fail(401, 'Sessão expirada ou inválida');
  return row;
}

function onlyAdmin(user) {
  if (user.role !== 'admin') fail(403, 'Acesso restrito ao administrador');
}

function getCart(db, userId) {
  const items = db
    .prepare(
      `SELECT p.id, p.title, p.platform, p.price_cents, p.stock, p.cover_color, p.icon, c.quantity FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY p.title`,
    )
    .all(userId)
    .map((r) => ({
      ...productJson(r),
      quantity: r.quantity,
      subtotalCents: r.price_cents * r.quantity,
    }));
  return { items, totalCents: items.reduce((n, p) => n + p.subtotalCents, 0) };
}

function validatedProduct(body) {
  const title = String(body.title || '').trim();
  const platform = String(body.platform || '').trim();
  const genre = String(body.genre || '').trim();
  const description = String(body.description || '').trim();
  if (
    title.length < 2 ||
    title.length > 120 ||
    !['PC', 'PlayStation', 'Xbox', 'Nintendo'].includes(platform) ||
    genre.length < 2 ||
    genre.length > 60 ||
    description.length < 3 ||
    description.length > 1500
  )
    fail(400, 'Preencha título, plataforma, gênero e descrição válidos');
  const priceCents = safeInt(body.priceCents, 0, 10000000);
  const stock = safeInt(body.stock, 0, 100000);
  const coverColor = /^#[0-9a-f]{6}$/i.test(body.coverColor || '')
    ? body.coverColor
    : '#5640A4';
  const icon = Array.from(String(body.icon || '🎮'))
    .slice(0, 2)
    .join('');
  return {
    title,
    platform,
    genre,
    description,
    priceCents,
    stock,
    coverColor,
    icon,
  };
}

function createOrder(db, userId, provider, status) {
  const cart = getCart(db, userId);
  if (cart.items.length === 0) fail(400, 'Carrinho vazio');
  for (const item of cart.items) {
    if (item.quantity > item.stock)
      fail(409, `Estoque insuficiente para ${item.title}`);
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    const o = db
      .prepare(
        'INSERT INTO orders (user_id,status,payment_provider,total_cents) VALUES (?,?,?,?)',
      )
      .run(userId, status, provider, cart.totalCents);
    const id = Number(o.lastInsertRowid);
    const stmt = db.prepare(
      'INSERT INTO order_items (order_id,product_id,title,platform,quantity,price_cents) VALUES (?,?,?,?,?,?)',
    );
    for (const item of cart.items)
      stmt.run(
        id,
        item.id,
        item.title,
        item.platform,
        item.quantity,
        item.priceCents,
      );
    db.exec('COMMIT');
    return { id, cart };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function completeDemoOrder(db, userId) {
  const { id, cart } = createOrder(db, userId, 'demo', 'demo_paid');
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const item of cart.items) {
      const r = db
        .prepare(
          'UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock>=?',
        )
        .run(item.quantity, item.id, item.quantity);
      if (!r.changes) throw new ApiError(409, 'Estoque insuficiente');
    }
    db.prepare('DELETE FROM cart_items WHERE user_id=?').run(userId);
    db.exec('COMMIT');
    return {
      orderId: id,
      status: 'demo_paid',
      totalCents: cart.totalCents,
      notice: 'Compra SIMULADA: nenhum pagamento real foi processado.',
    };
  } catch (e) {
    db.exec('ROLLBACK');
    db.prepare('DELETE FROM orders WHERE id=?').run(id);
    throw e;
  }
}

async function verifyMpPayment(db, paymentId, accessToken) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!response.ok) fail(502, 'Falha na consulta do pagamento ao Mercado Pago');
  const payment = await response.json();
  const match = /^pixelstore-(\d+)$/.exec(
    String(payment.external_reference || ''),
  );
  if (!match)
    return { processed: false, reason: 'referência não corresponde à loja' };
  const order = db
    .prepare('SELECT * FROM orders WHERE id=?')
    .get(Number(match[1]));
  if (
    !order ||
    order.payment_provider !== 'mercadopago' ||
    payment.currency_id !== 'BRL' ||
    Math.round(Number(payment.transaction_amount) * 100) !== order.total_cents
  )
    return { processed: false, reason: 'pedido ou valor divergente' };
  if (payment.status !== 'approved')
    return { processed: false, status: payment.status };
  if (order.status === 'paid')
    return { processed: true, orderId: order.id, status: 'paid' };
  if (order.status !== 'pending')
    return { processed: false, status: order.status };
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id=?')
    .all(order.id);
  db.exec('BEGIN IMMEDIATE');
  try {
    const possible = items.every(
      (item) =>
        db.prepare('SELECT stock FROM products WHERE id=?').get(item.product_id)
          ?.stock >= item.quantity,
    );
    if (!possible) {
      db.prepare(
        "UPDATE orders SET status='payment_review',payment_id=? WHERE id=?",
      ).run(String(payment.id), order.id);
      db.exec('COMMIT');
      return {
        processed: true,
        orderId: order.id,
        status: 'payment_review',
        notice:
          'Pagamento recebido, estoque insuficiente: atendimento manual necessário',
      };
    }
    for (const item of items)
      db.prepare(
        'UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
      ).run(item.quantity, item.product_id);
    db.prepare("UPDATE orders SET status='paid',payment_id=? WHERE id=?").run(
      String(payment.id),
      order.id,
    );
    db.prepare('DELETE FROM cart_items WHERE user_id=?').run(order.user_id);
    db.exec('COMMIT');
    return { processed: true, orderId: order.id, status: 'paid' };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function createApiServer({
  db = openDatabase(),
  environment = process.env,
} = {}) {
  const handler = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,OPTIONS',
    );
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;
      const method = req.method;
      if (method === 'GET' && pathname === '/health')
        return respond(res, 200, { status: 'ok', name: 'Pixel Store API' });
      if (method === 'POST' && pathname === '/api/auth/signup') {
        const b = await readBody(req);
        const name = String(b.name || '').trim(),
          email = String(b.email || '')
            .trim()
            .toLowerCase(),
          pass = String(b.password || '');
        if (
          name.length < 3 ||
          name.length > 100 ||
          !/^\S+@\S+\.\S+$/.test(email) ||
          email.length > 150 ||
          pass.length < 8 ||
          pass.length > 128
        )
          fail(
            400,
            'Nome (3+), e-mail válido e senha (8+ caracteres) são obrigatórios',
          );
        if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
          fail(409, 'E-mail já cadastrado');
        const id = Number(
          db
            .prepare(
              'INSERT INTO users (name,email,password_hash) VALUES (?,?,?)',
            )
            .run(name, email, hashPassword(pass)).lastInsertRowid,
        );
        const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
        return respond(res, 201, {
          user: userJson(user),
          token: createSession(db, id),
        });
      }
      if (method === 'POST' && pathname === '/api/auth/login') {
        const b = await readBody(req);
        const user = db.prepare('SELECT * FROM users WHERE email=?').get(
          String(b.email || '')
            .trim()
            .toLowerCase(),
        );
        const pass = String(b.password || '');
        if (!user || pass.length > 128) fail(401, 'Credenciais inválidas');
        const [salt, original] = user.password_hash.split(':');
        const attempt = scryptSync(pass, salt, 64);
        if (!timingSafeEqual(attempt, Buffer.from(original, 'hex')))
          fail(401, 'Credenciais inválidas');
        return respond(res, 200, {
          user: userJson(user),
          token: createSession(db, user.id),
        });
      }
      if (method === 'POST' && pathname === '/api/auth/logout') {
        const user = getUser(db, req);
        const token = req.headers.authorization.replace(/^Bearer /i, '');
        db.prepare('DELETE FROM sessions WHERE token_hash=? AND user_id=?').run(
          hashToken(token),
          user.id,
        );
        return respond(res, 200, { message: 'Sessão encerrada' });
      }
      if (method === 'GET' && pathname === '/api/products') {
        const q = String(url.searchParams.get('q') || '')
            .slice(0, 100)
            .toLowerCase(),
          platform = String(url.searchParams.get('platform') || '');
        const all = db
          .prepare('SELECT * FROM products ORDER BY id')
          .all()
          .filter(
            (x) =>
              (!q || (x.title + ' ' + x.genre).toLowerCase().includes(q)) &&
              (!platform || x.platform === platform),
          );
        return respond(res, 200, {
          products: all.map(productJson),
          count: all.length,
        });
      }
      let id = pathname.match(/^\/api\/products\/(\d+)$/);
      if (id) {
        const productId = safeInt(id[1], 1);
        const existing = db
          .prepare('SELECT * FROM products WHERE id=?')
          .get(productId);
        if (method === 'GET') {
          if (!existing) fail(404, 'Jogo não encontrado');
          return respond(res, 200, productJson(existing));
        }
        const user = getUser(db, req);
        onlyAdmin(user);
        if (!existing) fail(404, 'Jogo não encontrado');
        if (method === 'PUT') {
          const p = validatedProduct(await readBody(req));
          db.prepare(
            'UPDATE products SET title=?,platform=?,genre=?,description=?,price_cents=?,stock=?,cover_color=?,icon=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
          ).run(
            p.title,
            p.platform,
            p.genre,
            p.description,
            p.priceCents,
            p.stock,
            p.coverColor,
            p.icon,
            productId,
          );
          return respond(
            res,
            200,
            productJson(
              db.prepare('SELECT * FROM products WHERE id=?').get(productId),
            ),
          );
        }
        if (method === 'DELETE') {
          try {
            db.prepare('DELETE FROM products WHERE id=?').run(productId);
          } catch {
            fail(409, 'Jogo vinculado a pedidos, não pode ser excluído');
          }
          return respond(res, 200, { deleted: true });
        }
      }
      if (method === 'POST' && pathname === '/api/products') {
        const user = getUser(db, req);
        onlyAdmin(user);
        const p = validatedProduct(await readBody(req));
        const id = Number(
          db
            .prepare(
              'INSERT INTO products (title,platform,genre,description,price_cents,stock,cover_color,icon) VALUES (?,?,?,?,?,?,?,?)',
            )
            .run(
              p.title,
              p.platform,
              p.genre,
              p.description,
              p.priceCents,
              p.stock,
              p.coverColor,
              p.icon,
            ).lastInsertRowid,
        );
        return respond(
          res,
          201,
          productJson(db.prepare('SELECT * FROM products WHERE id=?').get(id)),
        );
      }
      if (pathname === '/api/cart' && method === 'GET') {
        const user = getUser(db, req);
        return respond(res, 200, getCart(db, user.id));
      }
      if (pathname === '/api/cart/items' && method === 'POST') {
        const user = getUser(db, req),
          b = await readBody(req);
        const productId = safeInt(b.productId, 1),
          qty = safeInt(b.quantity ?? 1, 1, 100);
        const p = db
          .prepare('SELECT * FROM products WHERE id=?')
          .get(productId);
        if (!p) fail(404, 'Jogo não encontrado');
        const current =
          db
            .prepare(
              'SELECT quantity FROM cart_items WHERE user_id=? AND product_id=?',
            )
            .get(user.id, productId)?.quantity || 0;
        if (current + qty > p.stock)
          fail(409, 'Quantidade ultrapassa o estoque');
        db.prepare(
          'INSERT INTO cart_items(user_id,product_id,quantity) VALUES (?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity',
        ).run(user.id, productId, current + qty);
        return respond(res, 200, getCart(db, user.id));
      }
      id = pathname.match(/^\/api\/cart\/items\/(\d+)$/);
      if (id) {
        const user = getUser(db, req),
          productId = safeInt(id[1], 1);
        if (method === 'PUT') {
          const b = await readBody(req),
            qty = safeInt(b.quantity, 1, 100);
          const p = db
            .prepare('SELECT stock FROM products WHERE id=?')
            .get(productId);
          if (!p) fail(404, 'Jogo não encontrado');
          if (qty > p.stock) fail(409, 'Estoque insuficiente');
          const r = db
            .prepare(
              'UPDATE cart_items SET quantity=? WHERE user_id=? AND product_id=?',
            )
            .run(qty, user.id, productId);
          if (!r.changes) fail(404, 'Item não encontrado no carrinho');
          return respond(res, 200, getCart(db, user.id));
        }
        if (method === 'DELETE') {
          db.prepare(
            'DELETE FROM cart_items WHERE user_id=? AND product_id=?',
          ).run(user.id, productId);
          return respond(res, 200, getCart(db, user.id));
        }
      }
      if (pathname === '/api/orders' && method === 'GET') {
        const user = getUser(db, req);
        const rows = db
          .prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC')
          .all(user.id)
          .map((o) => ({
            ...o,
            items: db
              .prepare(
                'SELECT title,platform,quantity,price_cents FROM order_items WHERE order_id=?',
              )
              .all(o.id),
          }));
        return respond(res, 200, { orders: rows });
      }
      if (pathname === '/api/checkout/demo' && method === 'POST') {
        const user = getUser(db, req);
        if (environment.ENABLE_DEMO_CHECKOUT !== '1')
          fail(403, 'Pagamento simulado desabilitado neste ambiente');
        return respond(res, 201, completeDemoOrder(db, user.id));
      }
      if (pathname === '/api/checkout/mercadopago' && method === 'POST') {
        const user = getUser(db, req);
        const access = environment.MERCADOPAGO_ACCESS_TOKEN;
        if (!access)
          fail(503, 'Configure MERCADOPAGO_ACCESS_TOKEN no backend para pagar');
        const { id, cart } = createOrder(db, user.id, 'mercadopago', 'pending');
        try {
          const b = {
            items: cart.items.map((p) => ({
              id: String(p.id),
              title: p.title,
              quantity: p.quantity,
              currency_id: 'BRL',
              unit_price: p.priceCents / 100,
            })),
            external_reference: `pixelstore-${id}`,
            payer: { email: user.email },
          };
          const rsp = await fetch(
            'https://api.mercadopago.com/checkout/preferences',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${access}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `pixelstore-pref-${id}`,
              },
              body: JSON.stringify(b),
              signal: AbortSignal.timeout(15000),
            },
          );
          const data = await rsp.json();
          if (!rsp.ok || (!data.init_point && !data.sandbox_init_point))
            throw new Error('Mercado Pago não criou preferência');
          db.prepare('UPDATE orders SET preference_id=? WHERE id=?').run(
            String(data.id),
            id,
          );
          return respond(res, 201, {
            orderId: id,
            mode: 'mercadopago',
            url: data.sandbox_init_point || data.init_point,
            preferenceId: data.id,
            status: 'pending',
          });
        } catch (e) {
          db.prepare("UPDATE orders SET status='payment_error' WHERE id=?").run(
            id,
          );
          fail(502, `Erro ao criar checkout: ${e.message}`);
        }
      }
      if (
        pathname === '/api/payments/mercadopago/notification' &&
        method === 'POST'
      ) {
        if (!environment.MERCADOPAGO_ACCESS_TOKEN)
          fail(503, 'Mercado Pago não configurado');
        const b = await readBody(req),
          paymentId = String(b?.data?.id || b?.id || '');
        if (!/^\d{1,24}$/.test(paymentId))
          fail(400, 'Notificação de pagamento inválida');
        return respond(
          res,
          200,
          await verifyMpPayment(
            db,
            paymentId,
            environment.MERCADOPAGO_ACCESS_TOKEN,
          ),
        );
      }
      if (pathname === '/api/reports/summary' && method === 'GET') {
        const user = getUser(db, req);
        onlyAdmin(user);
        return respond(res, 200, buildReport(db));
      }
      if (pathname === '/api/reports/export' && method === 'POST') {
        const user = getUser(db, req);
        onlyAdmin(user);
        const report = buildReport(db);
        const dir = path.resolve(__dirname, '../data/exports');
        fs.mkdirSync(dir, { recursive: true });
        const filename = `pixelstore_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(
          path.join(dir, filename),
          JSON.stringify(report, null, 2),
        );
        return respond(res, 201, {
          filename,
          report,
          message: 'Arquivo JSON criado em backend/data/exports',
        });
      }
      fail(404, 'Rota não encontrada');
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 500;
      if (status === 500) console.error('[API]', e);
      if (!res.headersSent) {
        res.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(
          JSON.stringify({
            success: false,
            error: {
              message: status === 500 ? 'Erro interno do servidor' : e.message,
            },
          }),
        );
      }
    }
  };
  return http.createServer(handler);
}

function createSession(db, id) {
  const token = randomBytes(32).toString('hex');
  db.prepare(
    'INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)',
  ).run(hashToken(token), id, Date.now() + 7 * 24 * 60 * 60 * 1000);
  return token;
}
if (require.main === module) {
  const server = createApiServer();
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () =>
    console.log(`Pixel Store API: http://localhost:${port}`),
  );
}
module.exports = { createApiServer };

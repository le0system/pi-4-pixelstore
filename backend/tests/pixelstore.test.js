const test = require('node:test');
const assert = require('node:assert/strict');

const { openDatabase, hashPassword } = require('../src/db');
const { buildReport } = require('../src/reports');
const { createApiServer } = require('../src/server');

async function setup(t) {
  const db = openDatabase(':memory:');
  const adminId = Number(
    db
      .prepare(
        "INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,'admin')",
      )
      .run('Admin Teste', 'admin@example.com', hashPassword('adminpass123'))
      .lastInsertRowid,
  );
  const srv = createApiServer({
    db,
    environment: { ENABLE_DEMO_CHECKOUT: '1' },
  });
  await new Promise((resolve) => srv.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((r) => srv.close(r));
    db.close();
  });
  const base = `http://127.0.0.1:${srv.address().port}`;
  async function request(method, url, body, token) {
    const r = await fetch(base + url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, ...(await r.json()) };
  }
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@example.com',
    password: 'adminpass123',
  });
  return { request, admin: adminLogin.data.token, db };
}

test('unitário: hash de senha usa salt e o relatório começa zerado', () => {
  const a = hashPassword('segredo-forte'),
    b = hashPassword('segredo-forte');
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]+:[0-9a-f]+$/);
  const db = openDatabase(':memory:');
  const report = buildReport(db);
  assert.equal(report.indicadores.pedidos, 0);
  assert.equal(report.indicadores.receita_centavos, 0);
  assert.ok(report.indicadores.produtos_ativos >= 10);
  db.close();
});

test('integração: cadastro, login, senha errada e rota autenticada', async (t) => {
  const { request } = await setup(t);
  const signup = await request('POST', '/api/auth/signup', {
    name: 'Cliente Teste',
    email: 'CLIENTE@test.com',
    password: '12345678',
  });
  assert.equal(signup.status, 201);
  assert.equal(signup.data.user.role, 'customer');
  assert.equal(
    (
      await request('POST', '/api/auth/login', {
        email: 'cliente@test.com',
        password: 'errada',
      })
    ).status,
    401,
  );
  assert.equal((await request('GET', '/api/cart')).status, 401);
  assert.equal(
    (await request('GET', '/api/cart', null, signup.data.token)).status,
    200,
  );
  assert.equal(
    (
      await request(
        'POST',
        '/api/products',
        {
          title: 'Invasão',
          platform: 'PC',
          genre: 'RPG',
          description: 'Teste teste',
          priceCents: 10,
          stock: 2,
        },
        signup.data.token,
      )
    ).status,
    403,
  );
});

test('integração CRUD: administrador cria, consulta, altera e exclui jogo no SQLite', async (t) => {
  const { request, admin, db } = await setup(t);
  const b = {
    title: 'Jogo Novo',
    platform: 'PC',
    genre: 'Puzzle',
    description: 'Jogo teste para CRUD',
    priceCents: 3500,
    stock: 4,
    coverColor: '#123ABC',
    icon: '🧩',
  };
  const created = await request('POST', '/api/products', b, admin);
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(
    (await request('GET', `/api/products/${id}`)).data.title,
    'Jogo Novo',
  );
  const updated = await request(
    'PUT',
    `/api/products/${id}`,
    { ...b, title: 'Jogo Atualizado', stock: 2 },
    admin,
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.data.stock, 2);
  assert.equal(
    db.prepare('SELECT title FROM products WHERE id=?').get(id).title,
    'Jogo Atualizado',
  );
  assert.equal(
    (await request('DELETE', `/api/products/${id}`, null, admin)).status,
    200,
  );
  assert.equal((await request('GET', `/api/products/${id}`)).status, 404);
});

test('E2E API: cliente cadastra, busca, adiciona jogo, compra em DEMO e exporta dashboard', async (t) => {
  const { request, admin, db } = await setup(t);
  const registration = await request('POST', '/api/auth/signup', {
    name: 'Comprador E2E',
    email: 'e2e@test.com',
    password: 'senha1234',
  });
  const token = registration.data.token;
  const catalog = await request('GET', '/api/products?platform=PC');
  assert.equal(catalog.status, 200);
  assert.ok(catalog.data.products.length > 0);
  const product = catalog.data.products[0];
  const add = await request(
    'POST',
    '/api/cart/items',
    { productId: product.id, quantity: 2 },
    token,
  );
  assert.equal(add.status, 200);
  assert.equal(add.data.totalCents, 2 * product.priceCents);
  assert.equal(
    (
      await request(
        'PUT',
        `/api/cart/items/${product.id}`,
        { quantity: 1 },
        token,
      )
    ).data.items[0].quantity,
    1,
  );
  const order = await request('POST', '/api/checkout/demo', {}, token);
  assert.equal(order.status, 201);
  assert.equal(order.data.status, 'demo_paid');
  assert.match(order.data.notice, /SIMULADA/);
  assert.equal(
    (await request('GET', '/api/cart', null, token)).data.items.length,
    0,
  );
  assert.equal(
    (await request('GET', '/api/orders', null, token)).data.orders[0].status,
    'demo_paid',
  );
  assert.equal(
    db.prepare('SELECT stock FROM products WHERE id=?').get(product.id).stock,
    product.stock - 1,
  );
  const json = await request('POST', '/api/reports/export', {}, admin);
  assert.equal(json.status, 201);
  assert.equal(json.data.report.indicadores.pedidos, 1);
  assert.equal(
    json.data.report.indicadores.receita_centavos,
    product.priceCents,
  );
  assert.equal(
    (await request('GET', '/api/reports/summary', null, token)).status,
    403,
  );
});

test('integração: bloqueia estoque excedido e exige configuração real do Mercado Pago', async (t) => {
  const { request } = await setup(t);
  const s = await request('POST', '/api/auth/signup', {
    name: 'Outro Cliente',
    email: 'client2@test.com',
    password: 'senha1234',
  });
  const token = s.data.token;
  const products = (await request('GET', '/api/products')).data.products;
  assert.equal(
    (
      await request(
        'POST',
        '/api/cart/items',
        { productId: products[0].id, quantity: 99 },
        token,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request('POST', '/api/checkout/mercadopago', {}, token)).status,
    503,
  );
});

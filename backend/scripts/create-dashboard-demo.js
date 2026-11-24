// Gera dados REAIS de chamadas à API em memória, mas transações são exclusivamente fictícias.
const fs = require('node:fs');
const path = require('node:path');

const { createApiServer } = require('../src/server');
const { openDatabase } = require('../src/db');

(async () => {
  process.env.ENABLE_DEMO_CHECKOUT = '1';
  const db = openDatabase(':memory:');
  const server = createApiServer({
    db,
    environment: { ENABLE_DEMO_CHECKOUT: '1' },
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const root = `http://127.0.0.1:${server.address().port}`;
  async function api(path, method = 'GET', body, token) {
    const r = await fetch(root + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error?.message);
    return d.data;
  }
  const orders = [
    [1, 7],
    [4, 12],
    [5, 2],
    [10, 6],
    [3, 9],
  ];
  for (let i = 0; i < orders.length; i++) {
    const user = await api('/api/auth/signup', 'POST', {
      name: `Cliente Exemplo ${i + 1}`,
      email: `exemplo${i + 1}@example.test`,
      password: 'demo12345',
    });
    for (const id of orders[i])
      await api(
        '/api/cart/items',
        'POST',
        { productId: id, quantity: (i % 2) + 1 },
        user.token,
      );
    await api('/api/checkout/demo', 'POST', {}, user.token);
  }
  const { buildReport } = require('../src/reports');
  const report = buildReport(db);
  report.ambiente = 'dados_ficticios_de_demonstracao';
  report.observacao =
    'Pedidos simulados em memória por backend/scripts/create-dashboard-demo.js, para testes e apresentação acadêmica. Não representam vendas reais.';
  const target = path.resolve(__dirname, '../../dashboard/dados_demo.json');
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
  console.log(
    `Exemplo gerado: ${target}; ${report.indicadores.pedidos} pedidos DEMO`,
  );
  await new Promise((r) => server.close(r));
  db.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

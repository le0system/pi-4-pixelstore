function buildReport(db) {
  const byPlatform = db
    .prepare(
      `SELECT oi.platform AS platform, SUM(oi.quantity) AS unidades, SUM(oi.price_cents * oi.quantity) AS receita_centavos FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status IN ('paid','demo_paid') GROUP BY oi.platform ORDER BY receita_centavos DESC`,
    )
    .all();
  const byMonth = db
    .prepare(
      `SELECT substr(o.created_at,1,7) AS mes, COUNT(DISTINCT o.id) AS pedidos, SUM(oi.price_cents*oi.quantity) AS receita_centavos FROM orders o JOIN order_items oi ON o.id=oi.order_id WHERE o.status IN ('paid','demo_paid') GROUP BY substr(o.created_at,1,7) ORDER BY mes`,
    )
    .all();
  const topProducts = db
    .prepare(
      `SELECT oi.title AS titulo, SUM(oi.quantity) AS unidades, SUM(oi.price_cents*oi.quantity) AS receita_centavos FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status IN ('paid','demo_paid') GROUP BY oi.title ORDER BY unidades DESC, titulo LIMIT 10`,
    )
    .all();
  const totals = db
    .prepare(
      "SELECT COUNT(*) AS pedidos, COALESCE(SUM(total_cents),0) AS receita_centavos FROM orders WHERE status IN ('paid','demo_paid')",
    )
    .get();
  return {
    projeto: 'Pixel Store',
    gerado_em: new Date().toISOString(),
    ambiente:
      process.env.ENABLE_DEMO_CHECKOUT === '1' ? 'demonstracao' : 'configurado',
    indicadores: {
      pedidos: totals.pedidos,
      receita_centavos: totals.receita_centavos,
      produtos_ativos: db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
      clientes: db
        .prepare("SELECT COUNT(*) AS n FROM users WHERE role='customer'")
        .get().n,
    },
    vendas_por_plataforma: byPlatform,
    vendas_por_mes: byMonth,
    produtos_mais_vendidos: topProducts,
    observacao:
      'Totais incluem compras simuladas no modo demonstração, quando habilitado. Nenhum dado pessoal é exportado.',
  };
}
module.exports = { buildReport };

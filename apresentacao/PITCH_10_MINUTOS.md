# Pitch Pixel Store — roteiro até 10 minutos (para GRAVAR)

**Importante:** O roteiro não substitui vídeo MP4 obrigatório. É necessário incluir o rosto de todos os integrantes e demonstrar telas, código e testes ao vivo. Divisão abaixo é sugestão, não registro de participação ocorrida.

| Tempo aproximado | Apresentador sugerido | Conteúdo e demonstração |
|---|---|---|
| 0:00–0:45 | Leonardo | Apresentação: Pixel Store, e-commerce acadêmico de jogos, objetivo, grupo 13 |
| 0:45–2:15 | Vinicius | Tela Login/Cadastro, Home e navegação entre PC, Xbox, Nintendo e PlayStation |
| 2:15–3:45 | Vinicius | Busca de jogos, tela de detalhes, carrinho, alteração de quantidades e remoção |
| 3:45–5:10 | Leonardo | Backend Node/SQLite, mostrar banco e CRUD de produto pelo perfil admin |
| 5:10–6:20 | Leonardo | Checkout: explicar diferença entre simulação e preferência do Mercado Pago, demonstrar pedido DEMO |
| 6:20–7:30 | Vinicius | Exportação JSON pelo app; apresentar painel Python e o arquivo JSON |
| 7:30–8:35 | Leonardo | Rodar `npm test` e comentar os 5 testes e E2E móvel pendente/execução se feita |
| 8:35–9:30 | Ambos | Sprint Review, riscos e lições aprendidas; status real do grupo |
| 9:30–10:00 | Ambos | Conclusão, agradecimentos, contatos |

## Demonstração pronta

1. Inicie o backend com SEED_DEMO_ADMIN=1 e ENABLE_DEMO_CHECKOUT=1.
2. Inicie Expo Go com IP correto; abra o app.
3. Cadastre conta cliente, explore jogos e crie pedido simulado.
4. Saia e entre com a conta admin para criar, alterar e excluir um jogo de teste.
5. Exporte JSON, execute o Python e abra `dashboard/dashboard.png`.
6. Execute `cd backend && npm test`; registre o resultado ao vivo.

**Não diga que o Mercado Pago recebeu um pagamento** quando só houver compra demonstrativa. Se o fluxo real não estiver configurado, mostre a implementação e explique a limitação de credenciais.

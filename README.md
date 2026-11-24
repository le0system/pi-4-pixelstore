# PIXEL STORE • Projeto Integrador IV (Sprint 2)

**Aplicativo acadêmico de e-commerce de jogos** para PlayStation, Xbox, Nintendo e PC.

**Grupo 13:** Leonardo Silva Lima (backend) e Vinicius Oliveira Loiola (frontend/dados), conforme planejamento anterior. Dados de RA e papéis Scrum precisam ser preenchidos pela equipe.

## Entrega incluída

- `app/`: React Native + Expo SDK 54 com 10 telas (Login, Cadastro, Home, Catálogo, Detalhes, Carrinho, Checkout, Perfil, CRUD/Admin, Dados/Exportação).
- `backend/`: API REST Node.js 22.13+ + **SQLite real**, com catálogo persistente, CRUD autorizado, login com senha criptografada e carrinho/pedidos por usuário.
- `dashboard/`: dashboard em Python/Matplotlib, JSON de cinco compras **fictícias geradas por chamadas à API** e imagem PNG.
- `backend/tests`: testes unitários, integração e um fluxo E2E da API, executados com `npm test`.
- `e2e/`: roteiro Maestro para E2E em dispositivo (ainda depende de execução local com Expo/emulador).
- `documentacao/`: texto formatado para finalização PDF, modelo Scrum e requisitos.
- `apresentacao/`: roteiro de pitch de até 10 minutos.

> IMPORTANTE: os jogos são apenas exemplos didáticos. O projeto não entrega licenças, códigos ou chaves reais de jogos.

## 1. Rodar backend

**Requisito:** Node.js **22.13 ou superior** com `node:sqlite`. Esta versão do SQLite nativo ainda é experimental no Node 22 e exibe um aviso; os testes foram executados com Node 22.16.0. Não é necessário `npm install` para o backend.

### Windows PowerShell

```powershell
cd backend
$env:SEED_DEMO_ADMIN="1"
$env:ENABLE_DEMO_CHECKOUT="1"
node src/server.js
```

### Linux / WSL / macOS

```bash
cd backend
SEED_DEMO_ADMIN=1 ENABLE_DEMO_CHECKOUT=1 node src/server.js
```

API: `http://localhost:3000`; teste no navegador: `http://localhost:3000/health`.

**Admin de DEMONSTRAÇÃO:** `admin@pixelstore.demo` / `PixelStore@123`. Essa conta só é criada quando `SEED_DEMO_ADMIN=1` e **não deve ser usada em produção**. Cliente pode cadastrar pelo app.

**Banco:** `backend/data/pixelstore.sqlite`, criado automaticamente. O script `backend/schema.sql` descreve as tabelas. Para testar do zero, interrompa o servidor e remova apenas o arquivo de banco de demonstração.

## 2. Rodar o app Expo

Abra outro terminal:

```bash
cd app
npm install
npx expo start -c
```

- **Android Emulator:** o app usa automaticamente `http://10.0.2.2:3000`.
- **iOS Simulator / Expo Web:** o app usa `http://localhost:3000`.
- **Celular real com Expo Go:** crie `app/.env` contendo `EXPO_PUBLIC_API_URL=http://IP_DO_PC:3000` (substitua pelo IPv4 do computador; celular e PC na mesma rede). Reinicie Expo com `npx expo start -c`.
- Se tiver firewall, libere a porta 3000 na rede local. A porta está configurada para `0.0.0.0` e é apropriada apenas para demonstração em rede confiável.

## 3. CRUD e APIs

| HTTP | Endpoint | Propósito |
|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login` | Cadastro e login |
| POST | `/api/auth/logout` | Sair |
| GET | `/api/products`, `/api/products/:id` | Catálogo e busca |
| POST/PUT/DELETE | `/api/products`, `/api/products/:id` | CRUD de jogos (somente admin) |
| GET | `/api/cart` | Consultar sacola |
| POST | `/api/cart/items` | Adicionar produto |
| PUT/DELETE | `/api/cart/items/:id` | Alterar/remover produto |
| GET | `/api/orders` | Histórico de compras |
| POST | `/api/checkout/demo` | Compra *simulada* (somente ENABLE_DEMO_CHECKOUT=1) |
| POST | `/api/checkout/mercadopago` | Criar preferência real do Mercado Pago |
| POST | `/api/payments/mercadopago/notification` | Consulta servidor-servidor do pagamento informado |
| GET | `/api/reports/summary` | Estatísticas do SQLite (admin) |
| POST | `/api/reports/export` | Grava arquivo JSON no servidor e retorna relatório (admin) |

Todos os endpoints autenticados exigem `Authorization: Bearer <token>`; a API retorna `{success, data}` ou `{success:false,error:{message}}`.

## 4. Mercado Pago

O backend implementa **Checkout Pro via API REST de preferências**, sem expor o access token ao celular. Para habilitar pagamentos em ambiente de teste, configure a variável `MERCADOPAGO_ACCESS_TOKEN=TEST-...` apenas no processo do backend.

Na criação do pedido, o backend calcula valores novamente usando os dados do SQLite; envia `POST https://api.mercadopago.com/checkout/preferences` e devolve a URL do Checkout Pro ao app, que abre o navegador. **Criar a preferência não aprova o pagamento.** O pedido fica `pending` até confirmação consultada na API do provedor. Para implantação real, configure o webhook público do Mercado Pago apontando para `/api/payments/mercadopago/notification` e teste os eventos de ponta a ponta. Caso o estoque se esgote após a compra, o status `payment_review` requer intervenção humana.

**Sem token:** checkout real informa erro explícito. **Modo demo:** registra transação fictícia e reduz estoque, mas não processa pagamento nem usa URL falsa de pagamento.

Não utilize o modo de demonstração para vendas reais. Validação de webhook, autenticação HTTPS, estoque e segurança exigem configuração e testes adicionais antes de produção.

## 5. JSON e dashboard Python

No app: entrar como admin > Perfil > **Exportar JSON / Dashboard** > **Gerar e compartilhar JSON**. O backend salva o arquivo em `backend/data/exports/`. Ele contém somente agregados, sem e-mails ou senhas.

Para gerar/recriar dados fictícios e o gráfico:

```bash
node backend/scripts/create-dashboard-demo.js
python -m pip install matplotlib
cd dashboard
python dashboard.py dados_demo.json --output dashboard.png
```

Para usar dados produzidos pelo app, passe o caminho real do arquivo exportado:

```bash
python dashboard/dashboard.py backend/data/exports/pixelstore_YYYY-MM-DD.json --output dashboard/dashboard_real.png
```

## 6. Testes

```bash
cd backend
npm test
```

5 testes automatizados: 1 unitário, 3 de integração e 1 E2E de API. O `e2e/maestro-login-carrinho.yaml` define um fluxo de interface móvel, mas requer Maestro e emulador/telefone — **não foi executado no ambiente de geração**.

## 7. Pendências antes do Blackboard

1. **Incluir o PDF original da Sprint 1** e wireframes/prints reais (não foram enviados nesta conversa).
2. Executar o app no Expo Go e **capturar telas reais** da navegação, CRUD, carrinho, checkout e exportação; inserir no documento final.
3. Configurar e testar credenciais **sandbox** do Mercado Pago; jamais colocar chaves no repositório ou no PDF.
4. Rodar E2E móvel com Maestro, guardar log e documentar resultado.
5. Confirmar atribuição dos papéis Scrum, RAs, datas, horas/estimativas e métricas reais da equipe (não foram informados).
6. **Gravar vídeo de pitch com rosto dos participantes**, duração máxima 10 minutos. Não é substituído pelo roteiro escrito.
7. Verificar com o professor a divergência: roteiro exige 5–7 participantes e empresa de serviços, enquanto o projeto tem 2 membros e é e-commerce de games.
8. Confirmar data da última aula e subir o arquivo único compactado via Blackboard.

## 8. Fontes

- Aulas 06–10 do professor Wilson Lourenço (arquivos enviados).
- Roteiro da Sprint 2 e template de Encerramento SCRUM (arquivos enviados).
- [Mercado Pago Developers — Criar preferência](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post).

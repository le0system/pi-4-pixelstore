# E2E móvel - Maestro

O fluxo `maestro-login-carrinho.yaml` é uma especificação E2E para Android. Ele **não foi executado** no ambiente de geração.

1. Inicie backend com `ENABLE_DEMO_CHECKOUT=1`.
2. Cadastre pelo app `e2e@example.com` / `senha1234` (teste, não produção).
3. Inicie o Expo em emulador Android e instale o aplicativo com o ID `br.com.pixelstore.pi`; dependendo da instalação por Expo Go, o `appId` pode ser o ID do Expo Go e exigir ajuste.
4. Instale Maestro pelo site oficial e rode `maestro test e2e/maestro-login-carrinho.yaml`.
5. Inclua captura e logs no PDF final, marcando sucesso/erro e data.

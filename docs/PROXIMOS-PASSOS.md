# Próximos passos (consolidado)

> Atualizado em 2026-07-22, depois de fechar os KPIs, as mensagens de erro e a
> Estrutura em abas (branch `tarifas`).
> Legenda de prioridade: 🔴 bloqueia produção · 🟡 importante pro produto ·
> 🟢 melhoria / nice-to-have.

## Onde o sistema está hoje (o que já é sólido)

Pra não reabrir o que já foi fechado:

- ✅ **Frontend React** completo (SPA Vite): dashboard, inquilinos, estrutura,
  superadmin, config — paridade validada com o app antigo.
- ✅ **PWA** gerado no build (service worker + manifest via vite-plugin-pwa).
- ✅ **Monorepo separado** em `backend/` + `frontend/` + `firmware/`.
- ✅ **UI de tarifas** existe (painel na Estrutura) — dá pra cadastrar tarifa pela
  tela, sem Postman.
- ✅ **Todo dado passa pelo backend** — o frontend usa o Firebase só pra login
  (não lê mais o RTDB direto de lugar nenhum).
- ✅ Bugs de segurança de `innerHTML`/XSS corrigidos; `package.json` limpo.
- ✅ **Os dois KPIs do dashboard** mostram dado real (potência instantânea e
  valor da conta). O anel de progresso foi removido de propósito — ver
  `docs/DESIGN-SYSTEM.md`.
- ✅ **Mensagens de erro** em linguagem de síndico
  (`frontend/src/utils/mensagensErro.js`).
- ✅ **Estrutura em abas**, com busca, agrupamento por prédio e seletor de
  apartamento em cascata — aguenta ~1000 apartamentos.

---

## 🔴 Gate de produção (nada de dado real entra antes disto)

### Rotação de chaves

O `.env` com credenciais ficou no histórico público do git (sem rewrite, por
escolha). As chaves atuais são de teste — por isso pode esperar, mas **é o
primeiro checklist a fechar antes de qualquer cliente real**:

- [ ] Google Cloud Console → IAM → Contas de serviço do projeto
      `controle-energia-d3121` → conta `firebase-adminsdk-...` → aba
      **Chaves** → apagar a chave atual
- [ ] Firebase Console → Configurações do projeto → Contas de serviço →
      **Gerar nova chave privada**
- [ ] Copiar os valores do JSON baixado pro `.env` local (nomes no `.env.example`)
- [ ] Trocar `ESP_KEY` por valor forte (`openssl rand -hex 32`) e colocar o
      MESMO valor no firmware `firmware/esp.cpp` (hoje hardcoded `"123456"`)

### Comunicação segura

- [ ] Migrar a comunicação da ESP32 de `http://` pra **HTTPS** (hoje a chave e as
      leituras trafegam sem criptografia — inaceitável fora da rede de teste).
      O firmware já fala HTTPS, mas com `setInsecure()` (não valida o cert). O
      plano executável de **TLS validado + OTA + watchdog** está em
      `docs/FIRMWARE-GATE-PROD.md` — chamar antes de ir pra prod.
- [ ] Revisar/versionar as **regras de segurança do Firebase** — agora que o
      frontend não lê o RTDB direto, dá pra fechar as regras de leitura (só o
      Admin SDK do backend acessa)

### Volume de dados no Firebase

- [ ] **Agregar as leituras por hora** antes de qualquer ESP real gravar 24/7.
      Hoje `espsync.js` dá um `push()` por amostra de 10s = 8.640 registros/dia
      por apartamento: 200 inquilinos estouram o free tier (1 GB) em **~3 dias**,
      e 5 aptos em ~4 meses. Agregado por hora são ~26 MB/mês pros mesmos 200.
      Plano executável (modelo de dados, arquivos a mexer, tradeoffs) em
      `docs/AGREGACAO-LEITURAS.md`. **Migração é irreversível** — fechar antes
      do primeiro cliente pagante, porque depois o dado cru não volta.
- [ ] **Alerta de orçamento** no Google Cloud, junto com a migração acima. No
      plano Spark estourar a cota não cobra: o banco **para de responder**.

---

## 🟡 Funcionalidades que faltam pro produto ficar "completo"

### Financeiro / faturamento

- [ ] Decidir se cadastro de tarifa continua **exclusivo do superadmin** ou passa
      a ser por `admin` de cada condomínio
- [ ] **Potência contratada por apartamento**: sem esse campo o card de potência
      mostra só o número absoluto. Com ele dá pra voltar o anel de progresso (o
      CSS `.gauge` está reservado) e alertar quem está perto do limite do
      disjuntor.
---

## 🟡 Qualidade e confiança

- [ ] **Validar visualmente num navegador/celular de verdade** — todo o design foi
      validado estruturalmente, nunca renderizado num ambiente gráfico real.
      Inclui: instalar o PWA no celular, testar **offline**, e confirmar que quem
      tinha o app antigo instalado recebe o service worker novo
      (limitação conhecida: o headless de automação não valida CacheStorage).
- [ ] **Testes de integração das rotas** — as funções puras estão cobertas
      (escopo por papel, cálculo da conta, mensagens de erro: 79 testes
      entre backend e frontend, todos sem rede). Falta o nível de cima: subir o
      Express com um Firebase de mentira e exercitar as rotas de ponta a ponta,
      incluindo o middleware de token.
- [ ] **CI** — rodar `npm test` (backend + frontend) automaticamente a cada push
      no GitHub, pra não quebrar sem perceber.

---

## 🟢 Dívida técnica / dados

- [ ] **Consistência de IDs de apartamento**: o modelo novo é composto
      (`condominio-predio-numero`, ex. `sol-blocoA-101`). Verificar se não sobrou
      registro legado fora do padrão no banco (aptos que não batem com nenhuma
      leitura passam despercebidos).
- [ ] **Firmware da ESP32** — tem lista própria em `docs/FIRMWARE.md`:
      intervalo de envio (1 min vs 5 min), buffer que descarta amostra em
      silêncio, timestamp de 1970 entrando no banco, integração de energia
      que assume loop perfeito, e a troca da simulação por Modbus real.
      Tratado como frente separada.
- [ ] **Separação em dois repositórios**: `backend/` e `frontend/` estão prontos
      pra virar repos separados. Quando fizer, o backend deixa de servir o
      `frontend/dist` e entra **CORS** no lugar (a única ligação vira HTTP).
- [ ] **Escala além de 1 condomínio grande**: `GET /estrutura/apartamentos` lê o
      nó `apartamentos` INTEIRO e filtra em JS. Com 1000 aptos num condomínio dá
      ~100 KB e passa; com 50 condomínios de 1000 vira problema. A correção é
      `.indexOn: ["condominioID"]` nas regras do Firebase (item do gate de
      produção) + `orderByChild("condominioID").equalTo(...)` no lugar do scan.
- [ ] **Retenção de leituras**: o RTDB não tem TTL. Depois da agregação
      (`docs/AGREGACAO-LEITURAS.md`) fica faltando o job que apaga a janela de
      dado cru de 7 dias — sem ele o problema volta pela porta dos fundos.

---

## 🟢 Documentação e entrega

- [ ] **Manual do cliente** (PT-BR, linguagem de síndico, não de dev) — como
      logar, ler o dashboard, cadastrar inquilino/tarifa. K definiu que é a
      última coisa, depois das funcionalidades fecharem.
- [ ] **Deploy real**: escolher hospedagem (backend + banco), domínio, HTTPS.
      Depende do gate de produção acima estar fechado.
- [x] Vault do Obsidian mapeando o sistema (`vault/`) — feito.

---

## Ordem sugerida (se for tocar em sequência)

1. **Validar no navegador de verdade** o que foi construído — é a única coisa
   que nunca foi feita e vale mais que qualquer item novo. Inclui rodar o tour
   inteiro como admin (com abas na Estrutura, ele tem que continuar completo).
2. **Testes de integração das rotas + CI** — antes de crescer mais a base.
3. **Gate de produção** (chaves + HTTPS + regras Firebase) — logo antes do
   primeiro cliente real.
4. **Firmware** (`docs/FIRMWARE.md`) — casado com o gate, porque o HTTPS da ESP
   é item dos dois.
4b. **Agregação das leituras** (`docs/AGREGACAO-LEITURAS.md`) — junto com o
   firmware, e obrigatoriamente **antes** de deixar ESP real gravando 24/7. Não
   depende dos itens acima; o que trava é o inverso (deixar dado cru acumular
   torna a migração mais cara e o free tier some em dias).
5. **Manual do cliente** + **deploy**.

### Massa de teste

`npm run seed -- --confirmo` recria 6 apartamentos com 7 dias de leitura.
Pra exercitar escala (lista da Estrutura, seletor em cascata):

```
npm run seed -- --confirmo --aptos=1000
```

Gera 1000 aptos em 3 prédios, com ~15% deliberadamente **sem leitura** — pra
ver a lista lidando com medidor mudo.

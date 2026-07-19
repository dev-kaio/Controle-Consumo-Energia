# Próximos passos (consolidado)

> Atualizado em 2026-07-18, depois da migração completa do frontend pra React
> (branch `tarifas`). Legenda de prioridade: 🔴 bloqueia produção · 🟡 importante
> pro produto · 🟢 melhoria / nice-to-have.

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
      leituras trafegam sem criptografia — inaceitável fora da rede de teste)
- [ ] Revisar/versionar as **regras de segurança do Firebase** — agora que o
      frontend não lê o RTDB direto, dá pra fechar as regras de leitura (só o
      Admin SDK do backend acessa)

---

## 🟡 Funcionalidades que faltam pro produto ficar "completo"

### Dashboard — os dois KPIs ainda são placeholders

- [ ] **Card "Valor da Conta"**: `GET /financeiro?apartamentoId=&competencia=` já
      calcula tudo no backend, mas **o frontend não chama essa rota** (confirmado:
      não há fetch pra `/financeiro` em `frontend/src/`). Falta:
      criar `api/financeiro.js` + o prefixo `/financeiro` no proxy do
      `vite.config.js` + preencher o card em `KpiPlaceholders.jsx`.
- [ ] **Card "Potência Atual"** (gauge): pegar a leitura **mais recente** de
      `potencia` do apto. Precisa de um endpoint "última leitura" (hoje só existe
      série histórica) e o cálculo do arco SVG
      (`strokeDashoffset = circunferência × (1 - percentual)`).

### Financeiro / faturamento

- [ ] Gerar/exportar a **fatura** de um apto num mês (PDF ou tela imprimível) —
      é o entregável que o síndico realmente usa
- [ ] Decidir se cadastro de tarifa continua **exclusivo do superadmin** ou passa
      a ser por `admin` de cada condomínio
- [ ] Fechamento de competência: um lugar que lista "conta de todos os aptos do
      condomínio no mês X" (hoje o cálculo é 1 a 1)

---

## 🟡 Qualidade e confiança

- [ ] **Validar visualmente num navegador/celular de verdade** — todo o design foi
      validado estruturalmente, nunca renderizado num ambiente gráfico real.
      Inclui: instalar o PWA no celular, testar **offline**, e confirmar que quem
      tinha o app antigo instalado recebe o service worker novo
      (limitação conhecida: o headless de automação não valida CacheStorage).
- [ ] **Ampliar os testes** — hoje só as funções puras de `utils/` têm teste
      (`node --test`). Falta cobrir as rotas do backend (auth, escopo por papel,
      cálculo de tarifa) com testes de integração.
- [ ] **CI** — rodar `npm test` (backend + frontend) automaticamente a cada push
      no GitHub, pra não quebrar sem perceber.

---

## 🟢 Dívida técnica / dados

- [ ] **Consistência de IDs de apartamento**: o modelo novo é composto
      (`condominio-predio-numero`, ex. `sol-blocoA-101`). Verificar se não sobrou
      registro legado fora do padrão no banco (aptos que não batem com nenhuma
      leitura passam despercebidos).
- [ ] **Confirmar o intervalo de envio da ESP**: o código atual manda a cada
      1 min; anotações antigas falam em 5 min. Definir qual é o certo.
- [ ] **Separação em dois repositórios**: `backend/` e `frontend/` estão prontos
      pra virar repos separados. Quando fizer, o backend deixa de servir o
      `frontend/dist` e entra **CORS** no lugar (a única ligação vira HTTP).

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

1. Fechar os **dois KPIs do dashboard** (Valor da Conta + Potência) — dá a
   sensação de "produto completo" e usa backend que já existe.
2. **Fatura exportável** — o entregável de verdade pro cliente.
3. **Testes de backend + CI** — antes de crescer a base de código.
4. **Gate de produção** (chaves + HTTPS + regras Firebase) — logo antes do
   primeiro cliente real.
5. **Manual do cliente** + **deploy**.

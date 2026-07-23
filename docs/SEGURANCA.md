# Segurança — auditoria e status

Auditoria feita lendo o código-fonte real do repositório (não só inspeção
superficial). Cada item abaixo tem status atual.

## ✅ Corrigido: auto-promoção a superadmin via `/auth/role`

**Era:** `POST /auth/role` aceitava `tipo` direto do `req.body`, sem checar
se quem chamava tinha permissão pra virar `admin`/`superadmin`. Qualquer
usuário autenticado (mesmo inquilino comum) podia se auto-promover mandando
`{"tipo": "superadmin"}`.

**Correção aplicada:** a rota agora ignora `req.body.tipo` e usa sempre o
que já está salvo em `usuarios/{uid}/tipo` no banco. Validado com teste
isolado simulando `req.user` antes/depois.

**Atenção:** o campo salvo em `usuarios/{uid}` precisa se chamar exatamente
`tipo` (é o que `backend/routes/usuarios.js` grava). Se um fluxo futuro de cadastro
usar outro nome de campo, essa rota quebra silenciosamente (retorna 400
"sem tipo válido").

## ✅ Corrigido: vazamento de dados entre inquilinos (`apartamentoID` vs `apartamentoId`)

**Era:** `backend/routes/requires.js` salvava o claim como `apartamentoID`
(maiúsculo), `backend/routes/firebase.js` lia como `apartamentoId` (minúsculo).
JS é case-sensitive → o valor sempre vinha `undefined` → inquilino sem
passar `apartamentoId` explícito na query recebia dados de **todos** os
apartamentos.

**Correção aplicada:** padronizado para `apartamentoId` (minúsculo) nos
dois lugares. Validado com teste isolado reproduzindo o cenário antes/depois.

## ✅ Corrigido: senha em texto puro em log

**Era:** `backend/routes/usuarios.js` (backend) e `frontend/js/superadmin.js`
(frontend) logavam `req.body`/`body` inteiro no console, incluindo senha
em texto puro, tanto no servidor quanto no navegador de quem estava logado.

**Correção aplicada:** removidos os blocos de `console.log` de debug.

## ✅ Corrigido: superadmin.js (frontend) não usava as rotas do backend

**Era:** a tela de superadmin lia `usuarios`/`condominios` direto do
Firebase client SDK, ignorando as rotas `/superadmin/usuarios` e
`/superadmin/condominios` que já existiam e já filtravam dados sensíveis.
Isso deixava a autorização daquela tela dependendo só das regras de
segurança do Firebase (que não estão versionadas nesse repo).

**Correção aplicada:** `carregarDados()` agora busca via `fetch()` nas
rotas do backend com Bearer token, com mensagem de erro visível na tela se
a busca falhar. Validado batendo o formato de resposta contra o que o
frontend espera consumir.

## ⏳ Pendente: `.env` com credenciais reais commitado no histórico do git

`.env` (Firebase Admin SDK completo + `ESP_KEY`) está commitado desde o
primeiro commit do repositório. K confirmou que os dados nesse Firebase são
todos fake/de teste no momento, então a prioridade foi rebaixada — **mas
antes de qualquer dado real entrar nesse banco, ou antes de abrir o repo
pra mais gente, isso precisa ser resolvido**: gerar nova chave de serviço
e revogar a antiga pelo ID dela (Google Cloud Console → IAM & Admin →
Contas de serviço → Chaves — só gerar uma nova sem apagar a vazada não
resolve), trocar o `ESP_KEY`, tirar `.env` do git (`git rm --cached .env`,
confirmar `.gitignore`).

## ⏳ Pendente: ESP com API key fraca hardcoded + HTTP sem TLS

`firmware/esp.cpp` manda `x-api-key: "123456"` hardcoded no firmware, e usa `http://`
puro (sem criptografia). Aceitável em rede doméstica de teste. Antes de
qualquer deploy real (ex: AWS), precisa: (1) parar de hardcodar a key no
firmware (usar um header separado não versionado, ou pelo menos trocar por
algo não-trivial), (2) migrar pra HTTPS.

## ⏳ Pendente: XSS potencial via `innerHTML` sem escapar dados do usuário

Tanto `grafico.js` (`criarCardInquilino`) quanto outros pontos do frontend
montam HTML via `innerHTML` interpolando `nome`/`email` direto, sem
escapar. Se algum desses campos contiver HTML/script (ex: um admin
comprometido cadastrando um nome malicioso), isso executa no navegador de
quem visualizar. Risco baixo hoje (exige um admin malicioso, já que
cadastro de usuário é restrito), mas vale corrigir antes de abrir cadastro
mais amplamente. Correção: usar `textContent` em vez de `innerHTML` onde
possível, ou uma função de escape simples.

## ⏳ Pendente: regras de segurança do Firebase nunca revisadas

Não existe nenhum arquivo `.rules.json`/`firebase.json` com regras de
segurança versionado nesse repo — ou as regras estão só no console do
Firebase (não versionadas, risco de divergência), ou estão no padrão
permissivo. Como o backend já usa o Admin SDK (que ignora regras de
segurança) para praticamente tudo, o impacto prático depende de quanto o
frontend ainda lê o Firebase direto — isso deveria estar zerado (ver item
"grafico.js ainda lê usuários direto do Firebase" no PROXIMOS-PASSOS.md).

## ⏳ Pendente (baixa prioridade): higiene do `package.json`

`node` e `path` estão listados como dependências (não deveriam estar —
`node` é engano de instalação, `path` é módulo nativo do Node), e `router`
está instalado mas não é usado em lugar nenhum do código. Limpeza trivial,
sem risco.

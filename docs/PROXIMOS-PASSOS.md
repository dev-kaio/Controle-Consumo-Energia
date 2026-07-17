# Próximos passos (consolidado)

## Segurança (ver `docs/SEGURANCA.md` pros detalhes de cada um)

### GATE DE PRODUÇÃO — rotação de chaves (decisão do K: fazer só ao validar pra prod)

O `.env` com credenciais ficou no histórico público do git (sem rewrite, por
escolha). As chaves atuais são de teste, então pode esperar — mas **nada de
dado real entra no banco antes deste checklist**:

- [ ] Google Cloud Console → IAM → Contas de serviço do projeto
      `controle-energia-d3121` → conta `firebase-adminsdk-...` → aba
      **Chaves** → apagar a chave atual
- [ ] Firebase Console → Configurações do projeto → Contas de serviço →
      **Gerar nova chave privada**
- [ ] Copiar os valores do JSON baixado pro `.env` local (nomes documentados
      no `.env.example`)
- [ ] Trocar `ESP_KEY` por valor forte (`openssl rand -hex 32`) e colocar o
      MESMO valor no firmware `firmware/esp.cpp` (hoje hardcoded `"123456"`)
- [ ] Migrar a comunicação da ESP pra HTTPS

### Demais itens

- [x] ~~Escapar `nome`/`email` em pontos que usam `innerHTML`~~ (feito —
      renderização via `textContent` em grafico.js/inquilinos.js/superadmin.js)
- [x] ~~Limpar `package.json`~~ (feito — deps falsas removidas, testes reais)
- [ ] Revisar/versionar as regras de segurança do Firebase (agora que o
      frontend não lê mais o RTDB direto, dá pra fechar as regras de leitura)

## Arquitetura / dívida técnica

- [ ] Padronizar IDs de apartamento (existem registros `"303"` fora do
      padrão `apto_XXX`, que silenciosamente não batem com nenhuma leitura)
- [ ] Confirmar o intervalo real de envio da ESP (código atual manda a
      cada 1 min, não os 5 min de anotações mais antigas)
- [ ] `grafico.js` ainda lê `usuarios` direto do Firebase client SDK
      (`buscarInquilinos()`) em vez de passar pelo backend — mesma classe de
      problema que já foi corrigida no `superadmin.js`

## Financeiro

- [ ] Construir a UI de gerenciamento de tarifas no superadmin (painel
      lateral deslizante "tipo cortina", já desenhado o conceito, ainda não
      implementado) — é o que falta pra alguém conseguir cadastrar tarifa
      sem usar Postman/curl direto na API
- [ ] Plugar `GET /financeiro` no dashboard (card "Valor da Conta" já tem
      a estrutura visual pronta, só falta o fetch)
- [ ] Decidir se cadastro de tarifa continua exclusivo do superadmin ou
      passa a ser por `admin` de cada condomínio

## Design / frontend

- [ ] Aplicar o mesmo tratamento visual em `frontend/pages/admin.html`
      (gestão de inquilinos) — ficou de fora do primeiro passe
- [ ] Plugar dado real no card "Potência Atual" (pegar a leitura mais
      recente de `potencia` por apartamento)
- [ ] Validar visualmente num navegador de verdade — todo o trabalho de
      design foi validado estruturalmente (tags balanceadas, IDs presentes,
      classes CSS batendo), nunca visualmente renderizado
- [ ] Extrair as variáveis CSS de `menu.css` pra um arquivo compartilhado
      se quiserem a página de login (`style.css`, `index.html`) com a mesma
      consistência visual

## Migração para React (mencionada como possibilidade futura)

Projeto hoje é ES modules puro + CDN, sem bundler. Migrar pra React é
reescrita, não ajuste incremental. Faz mais sentido depois que o modelo de
dados (IDs de apartamento) e a separação backend/frontend estiverem
estáveis. Os padrões atuais (toggle de classe `.active`/`.dark`) mapeiam
bem pra state do React quando chegar a hora.

# Próximos passos (consolidado)

## Segurança (ver `docs/SEGURANCA.md` pros detalhes de cada um)

- [ ] Rotacionar credenciais do `.env` antes de qualquer dado real entrar
      no banco (baixa urgência agora — dados de teste confirmados pelo K)
- [ ] Trocar API key fraca hardcoded no firmware da ESP + migrar pra HTTPS
      antes de deploy real
- [ ] Escapar `nome`/`email` em pontos que usam `innerHTML` (XSS potencial
      de baixo risco hoje)
- [ ] Revisar/versionar as regras de segurança do Firebase
- [ ] Limpar `package.json` (`node`, `path`, `router` não deveriam estar lá)

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

- [ ] Aplicar o mesmo tratamento visual em `public/pages/admin.html`
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

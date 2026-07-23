// Traduz qualquer erro que chegue na tela pra uma frase que um síndico
// entenda. Nada de "Firebase: Error (auth/invalid-credential)." ou
// "condominioID, predioID e numero devem ter só letras e números".
//
// Resolve em camadas, a primeira que casar ganha:
//   1. código do Firebase Auth (err.code)
//   2. falha de rede (err.semRede, marcado pelo api/http.js)
//   3. mensagem exata do backend (dicionário abaixo)
//   4. status HTTP (err.status, anexado pelo api/http.js)
//   5. frase genérica
//
// SOBRE A CAMADA 3: ela casa por texto EXATO. Se alguém reescrever a
// mensagem no backend sem mexer aqui, o erro cai na camada 4 e o usuário vê
// o genérico daquele status — pior, mas nunca quebrado nem cru. Foi
// escolhido assim pra não precisar de código de erro estável no backend
// (que seria a solução "certa", e muito mais encanamento).

const PERMISSAO = "Você não tem permissão para isso.";
const SESSAO = "Sua sessão expirou. Entre de novo.";
const SEM_APTO = "Sua conta ainda não está ligada a um apartamento. Fale com o síndico.";
const GENERICA = "Não foi possível concluir. Tente de novo.";

// --- Camada 1: Firebase Auth -------------------------------------------
// Credencial errada devolve a MESMA frase pros três códigos de propósito:
// dizer "esse e-mail não existe" entrega pra quem está tentando adivinhar
// quais e-mails são válidos no sistema.
const CREDENCIAL = "E-mail ou senha incorretos.";

const FIREBASE = {
  "auth/invalid-credential": CREDENCIAL,
  "auth/wrong-password": CREDENCIAL,
  "auth/user-not-found": CREDENCIAL,
  "auth/invalid-login-credentials": CREDENCIAL,
  "auth/user-disabled": "Conta desativada. Fale com o administrador.",
  "auth/too-many-requests":
    "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed":
    "Sem conexão com a internet. Verifique e tente de novo.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/missing-password": "Digite a senha.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
  "auth/requires-recent-login":
    "Por segurança, entre de novo antes de alterar a senha.",
  "auth/internal-error": GENERICA,
};

// --- Camada 3: mensagens do backend ------------------------------------
// Só entram aqui as que soam de programador. As que já estão em português
// de gente ("Apartamento não encontrado", "Condomínio não encontrado",
// "A senha deve ter pelo menos 6 caracteres") passam direto de propósito.
// Os "Erro ao ..." também ficam de fora: todos são 500, a camada 4 pega.
const BACKEND = {
  "Acesso negado": PERMISSAO,
  "Token inválido": SESSAO,
  "Token não fornecido": SESSAO,

  // conta mal formada / não cadastrada
  "Usuário não encontrado no banco":
    "Sua conta ainda não foi cadastrada no sistema. Fale com o síndico.",
  "Usuário sem tipo válido cadastrado":
    "Sua conta está sem perfil definido. Fale com o síndico.",
  "Usuário sem apartamento vinculado": SEM_APTO,
  "Inquilino sem apartamento": SEM_APTO,
  "Admin sem condomínio configurado":
    "Sua conta de administrador ainda não está ligada a um condomínio. Fale com o suporte.",
  "Admin sem condominio":
    "Sua conta de administrador ainda não está ligada a um condomínio. Fale com o suporte.",

  // identificadores — o hífen é separador do ID composto, por isso a regra
  "id deve ter só letras e números (ex: 'sol'), sem hífen":
    "O identificador do condomínio só pode ter letras e números, sem espaço nem hífen. Ex: sol",
  "id deve ter só letras e números (ex: 'blocoA'), sem hífen":
    "O identificador do prédio só pode ter letras e números, sem espaço nem hífen. Ex: blocoA",
  "espId deve ter só letras e números (ex: 'esp001')":
    "O identificador do medidor só pode ter letras e números, sem espaço nem hífen. Ex: esp001",
  "condominioID, predioID e numero devem ter só letras e números":
    "O número do apartamento só pode ter letras e números, sem espaço nem hífen. Ex: 101",
  "condominioID inválido": "Condomínio inválido.",
  "apartamentoId inválido": "Apartamento inválido.",
  "aptoID inválido": "Apartamento inválido.",

  // duplicidade
  "Já existe condomínio com esse id":
    "Já existe um condomínio com esse identificador.",
  "Já existe dispositivo com esse id":
    "Já existe um medidor com esse identificador.",

  // estrutura incompleta
  "Prédio não encontrado nesse condomínio":
    "Esse prédio não existe neste condomínio.",
  "Apartamento não cadastrado":
    "Esse apartamento ainda não está cadastrado. Cadastre em Estrutura › Apartamentos.",
  "Apartamento não cadastrado — cadastre a estrutura primeiro":
    "Esse apartamento ainda não está cadastrado. Cadastre em Estrutura › Apartamentos.",
  "Apartamento não pertence a esse condomínio":
    "Esse apartamento é de outro condomínio.",
  "Apartamento não pertence ao condomínio do usuário":
    "Esse apartamento é de outro condomínio.",

  // campos obrigatórios
  "Apartamento é obrigatório": "Escolha um apartamento.",
  "nome é obrigatório": "Informe o nome.",
  "Condomínio ID é obrigatório para superadmin": "Escolha o condomínio.",
  "apartamentoId e competencia são obrigatórios": "Escolha o apartamento e o mês.",
  "condominioID e competencia são obrigatórios": "Escolha o condomínio e o mês.",
  "uid e dados são obrigatórios":
    "Não foi possível identificar o usuário. Recarregue a página.",
  "uid e novaSenha são obrigatórios":
    "Não foi possível identificar o usuário. Recarregue a página.",
  "Nenhum campo editável informado": "Nada foi alterado.",

  // filtros e período
  "competencia deve estar no formato AAAA-MM (ex: 2026-01)":
    "Escolha um mês válido.",
  "Filtro inválido": "Período inválido.",
  "Parâmetros inválidos": "Escolha um período.",
  "Dados inválidos": "Confira os dados preenchidos.",

  // tarifa
  "Nenhuma tarifa cadastrada para o condomínio deste apartamento":
    "Ainda não há tarifa cadastrada para este mês. Cadastre em Estrutura › Tarifas.",
  "tusd, te e ipCipPercentual devem ser números":
    "TUSD, TE e IP-CIP precisam ser números.",

  // permissões de cadastro
  "Sem permissão para criar admin":
    "Você não tem permissão para criar administradores.",
  "Não pode alterar para superadmin":
    "Não é possível transformar alguém em superadmin por aqui.",
  "Tipo de usuário inválido":
    "Tipo de usuário inválido. Escolha inquilino ou administrador.",
};

// --- Camada 4: status HTTP ---------------------------------------------
const POR_STATUS = {
  400: "Confira os dados preenchidos.",
  401: SESSAO,
  403: PERMISSAO,
  404: "Não encontramos esse registro.",
  409: "Já existe um cadastro com esses dados.",
  429: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
};

/**
 * @param {unknown} err - Error do api/http.js, do Firebase Auth, ou qualquer coisa
 * @returns {string} frase pronta pra mostrar ao usuário
 */
export function mensagemAmigavel(err) {
  if (!err) return GENERICA;

  if (err.code && FIREBASE[err.code]) return FIREBASE[err.code];

  if (err.semRede) {
    return "Sem conexão com a internet. Verifique e tente de novo.";
  }

  if (err.message && BACKEND[err.message]) return BACKEND[err.message];

  if (err.status) {
    if (POR_STATUS[err.status]) return POR_STATUS[err.status];
    if (err.status >= 500) {
      return "O sistema não conseguiu concluir. Tente de novo em instantes.";
    }
  }

  // Mensagem do backend fora do dicionário e sem status conhecido: é melhor
  // mostrar o genérico do que arriscar vazar texto técnico na cara do
  // síndico. O erro cru continua no console pra quem for depurar.
  return GENERICA;
}

// As ÚNICAS chaves que o app guarda no localStorage.
//
// Todas são preferência deste aparelho — nada de sessão, papel ou perfil
// mora aqui (isso vem sempre do backend via /auth/role). Por isso elas
// sobrevivem ao logout: trocar de usuário não deveria apagar o tema nem
// fazer o tutorial recomeçar do zero.
//
// Chave nova de preferência? Adiciona na lista abaixo — senão o logout
// apaga ela e ninguém percebe.
export const CHAVE_TEMA = "tema";
export const CHAVE_TOUR = "tour_visto_v1";

const CHAVES_PREFERENCIA = [CHAVE_TEMA, CHAVE_TOUR];

// Limpeza defensiva do logout: zera tudo e devolve só as preferências.
// É nessa ordem (e não removendo chave por chave) de propósito — assim
// qualquer coisa que algum dia escreva no localStorage sem passar por aqui
// morre no logout por padrão, em vez de sobreviver por esquecimento.
export function limparSessaoPreservandoPreferencias() {
  try {
    const guardadas = CHAVES_PREFERENCIA.map((chave) => [
      chave,
      localStorage.getItem(chave),
    ]);
    localStorage.clear();
    for (const [chave, valor] of guardadas) {
      if (valor !== null) localStorage.setItem(chave, valor);
    }
  } catch {
    // navegador com storage bloqueado: não há nada pra limpar
  }
}

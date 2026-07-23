// Roteiro do tour guiado — só DADOS, sem React.
//
// Cada passo aponta pra um elemento real da tela por `data-tour="<alvo>"`
// (nunca por classe CSS: classe é estilo, muda; o data-tour é contrato).
// Passo sem `alvo` = balão centralizado. Passo cujo alvo não existe na
// tela é PULADO pelo Tour.jsx — o tour encurta, nunca trava.
//
// `aba` é OBRIGATÓRIO em passo de tela com abas (hoje só /estrutura): como
// só a aba ativa é renderizada, sem isso o alvo não existe no DOM e o passo
// some sem avisar ninguém.
//
// Linguagem: síndico, não dev. Uma ideia por passo.

const TODOS = ["inquilino", "admin", "superadmin"];
const GESTORES = ["admin", "superadmin"];
const DONO = ["superadmin"];

const PASSOS = [
  {
    id: "boas-vindas",
    rota: "/dashboard",
    papeis: TODOS,
    titulo: "Bem-vindo ao Palm Energy",
    texto:
      "Em um minuto a gente passa pelas telas do sistema e mostra o que cada " +
      "parte faz. Dá pra sair quando quiser em “Pular”.",
  },
  {
    id: "menu",
    rota: "/dashboard",
    alvo: "menu",
    papeis: TODOS,
    titulo: "O menu",
    texto: "Por aqui você abre as telas do sistema e sai da sua conta.",
  },
  {
    id: "tema",
    rota: "/dashboard",
    alvo: "tema",
    papeis: TODOS,
    titulo: "Tema claro ou escuro",
    texto:
      "Escolha o que for melhor pros seus olhos. A preferência fica salva " +
      "neste aparelho.",
  },
  {
    id: "filtro",
    rota: "/dashboard",
    alvo: "filtro",
    papeis: TODOS,
    titulo: "O período que você quer ver",
    texto:
      "Escolha hoje, a semana, o mês — ou marque um intervalo de datas. " +
      "Também dá pra escolher o que aparece no gráfico.",
  },
  {
    id: "kpis",
    rota: "/dashboard",
    alvo: "kpis",
    papeis: TODOS,
    titulo: "Os números do momento",
    texto:
      "A potência é o quanto está sendo consumido agora, atualizada de minuto " +
      "em minuto pelo medidor. Ao lado, quanto a conta do mês já somou até " +
      "aqui.",
  },
  {
    id: "medias",
    rota: "/dashboard",
    alvo: "medias",
    papeis: TODOS,
    titulo: "As médias do período",
    texto:
      "O consumo médio dentro do período que você escolheu no filtro. " +
      "Mudou o filtro, estes números mudam junto.",
  },
  {
    id: "grafico",
    rota: "/dashboard",
    alvo: "grafico",
    papeis: TODOS,
    titulo: "Consumo, geração e autoconsumo",
    texto:
      "Consumo é a energia que você usou. Geração é o que os painéis solares " +
      "produziram. Autoconsumo é a parte dessa geração que você usou na hora, " +
      "sem precisar comprar da distribuidora.",
  },

  // ——— admin e superadmin ———
  {
    id: "inquilinos-lista",
    rota: "/inquilinos",
    alvo: "inquilinos-lista",
    papeis: GESTORES,
    titulo: "Os moradores",
    texto:
      "Aqui ficam os moradores com acesso ao sistema. Ao tirar o acesso de " +
      "alguém, use “Desativar”: o histórico de consumo do apartamento " +
      "continua guardado.",
  },
  {
    id: "estrutura-predios",
    rota: "/estrutura",
    aba: "predios",
    alvo: "estrutura-predios",
    papeis: GESTORES,
    titulo: "Como o condomínio é montado",
    texto:
      "O sistema é organizado em três níveis: condomínio, prédio e " +
      "apartamento. Cadastre nessa ordem.",
  },
  {
    id: "estrutura-apartamentos",
    rota: "/estrutura",
    aba: "apartamentos",
    alvo: "estrutura-apartamentos",
    papeis: GESTORES,
    titulo: "Os apartamentos",
    texto:
      "Cada apartamento pertence a um prédio e é onde o consumo é medido. " +
      "É ele que você vincula ao morador.",
  },
  {
    id: "estrutura-medidores",
    rota: "/estrutura",
    aba: "medidores",
    alvo: "estrutura-medidores",
    papeis: GESTORES,
    titulo: "Os medidores",
    texto:
      "Cada apartamento tem um medidor instalado que envia a leitura sozinho, " +
      "de minuto em minuto. Aqui você diz qual medidor é de qual apartamento.",
  },
  {
    id: "estrutura-tarifas",
    rota: "/estrutura",
    aba: "tarifas",
    alvo: "estrutura-tarifas",
    papeis: DONO,
    titulo: "As tarifas",
    texto:
      "O preço do kWh que a distribuidora cobra, usado pra calcular a conta. " +
      "Informe o valor JÁ COM os impostos, igual aparece na fatura da " +
      "distribuidora — o sistema não soma imposto por cima.",
  },

  // ——— só superadmin ———
  {
    id: "superadmin-usuarios",
    rota: "/superadmin",
    alvo: "superadmin-usuarios",
    papeis: DONO,
    titulo: "Contas e condomínios",
    texto:
      "A visão geral do sistema: criar administradores, ver os usuários de " +
      "todos os condomínios e gerenciar os acessos.",
  },

  {
    id: "fim",
    rota: "/dashboard",
    papeis: TODOS,
    titulo: "É isso!",
    texto:
      "Pra rever este tutorial depois, é só clicar em “Tutorial” no menu, ou " +
      "abrir Configurações.",
  },
];

// O roteiro é filtrado ANTES de o tour montar — assim o contador
// ("3 de 8") já mostra o total certo pro papel de quem está logado.
export function roteiroDoPapel(papel) {
  return PASSOS.filter((passo) => passo.papeis.includes(papel));
}

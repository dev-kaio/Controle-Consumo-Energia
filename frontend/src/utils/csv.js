// CSV do fechamento — é o formato que o síndico realmente usa: abre no Excel,
// filtra, soma, manda pra contabilidade.
//
// Duas decisões que parecem detalhe e são a diferença entre "abre" e "não
// abre" no Excel em português:
//   - separador PONTO E VÍRGULA (o Excel pt-BR assume vírgula como decimal,
//     então vírgula separando colunas embaralha tudo);
//   - BOM no início do arquivo, senão "Antônio" abre como "AntÃ´nio".

const BOM = "﻿";
const SEPARADOR = ";";

// Aspas dobradas e campo entre aspas quando contém separador, aspas ou quebra
// de linha — sem isso um morador "Silva, João" quebraria a coluna.
function celula(valor) {
  const texto = valor == null ? "" : String(valor);
  return new RegExp(`["${SEPARADOR}\n\r]`).test(texto)
    ? `"${texto.replace(/"/g, '""')}"`
    : texto;
}

// Número brasileiro: vírgula decimal, sem separador de milhar (milhar
// atrapalharia, porque o separador de coluna já é ponto e vírgula).
function numeroBR(valor, casas = 2) {
  return Number(valor || 0)
    .toFixed(casas)
    .replace(".", ",");
}

function linha(campos) {
  return campos.map(celula).join(SEPARADOR);
}

export function fechamentoParaCSV(fechamento) {
  const cabecalho = [
    "Apartamento",
    "Predio",
    "Numero",
    "Morador",
    "Consumo (kWh)",
    "Valor (R$)",
    "Situacao",
  ];

  const corpo = (fechamento.aptos || []).map((a) =>
    linha([
      a.aptoID,
      a.predioNome,
      a.numero,
      a.morador || "",
      numeroBR(a.kwhFaturado),
      numeroBR(a.total),
      // Coluna explícita em vez de linha faltando: o síndico precisa VER
      // quem não mediu pra ir atrás do medidor.
      a.temLeitura ? "OK" : "SEM LEITURA",
    ]),
  );

  const rodape = linha([
    "TOTAL",
    "",
    "",
    "",
    numeroBR(fechamento.totais?.kwhFaturado),
    numeroBR(fechamento.totais?.total),
    `${fechamento.totais?.apartamentos || 0} apartamentos`,
  ]);

  return BOM + [linha(cabecalho), ...corpo, rodape].join("\r\n");
}

export function baixarCSV(fechamento) {
  const blob = new Blob([fechamentoParaCSV(fechamento)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `fechamento-${fechamento.condominioID}-${fechamento.competencia}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

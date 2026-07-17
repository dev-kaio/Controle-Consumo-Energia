/**
 * IDs compostos de apartamento: "condominio-predio-numero" (ex: "sol-blocoA-101").
 *
 * Por que composto: o ID sozinho já é único no sistema inteiro (dois
 * condomínios podem ter apto 101 sem colidir) e já diz a quem pertence.
 * A ESP é configurada com esse ID e as leituras ficam em leituras/{aptoID}.
 *
 * Regra importante: cada segmento (condomínio, prédio, número) só aceita
 * letras e números, SEM hífen — o hífen é o separador do ID composto.
 */

// Um segmento: só letras/números, 1 a 30 caracteres
const REGEX_SEGMENTO = /^[A-Za-z0-9]{1,30}$/;

// Um ID de apartamento completo: exatamente 3 segmentos
const REGEX_APTO_ID = /^[A-Za-z0-9]{1,30}-[A-Za-z0-9]{1,30}-[A-Za-z0-9]{1,30}$/;

function validarSegmento(s) {
  return typeof s === "string" && REGEX_SEGMENTO.test(s);
}

// Valida um aptoID antes de usá-lo em caminho do banco — além de garantir
// o formato, impede injeção de caminho (ex: "../usuarios").
function validarAptoId(id) {
  return typeof id === "string" && REGEX_APTO_ID.test(id);
}

function montarAptoId(condominioID, predioID, numero) {
  if (
    !validarSegmento(condominioID) ||
    !validarSegmento(predioID) ||
    !validarSegmento(numero)
  ) {
    return null;
  }
  return `${condominioID}-${predioID}-${numero}`;
}

module.exports = { validarSegmento, validarAptoId, montarAptoId };

import { verificarToken, obterToken } from "../auth/firebaseConfig.js";

// Página de gestão da estrutura: condomínio (superadmin), prédios,
// apartamentos, medidores ESP e tarifas (superadmin).
// Toda leitura/escrita passa pelo backend — nada de Firebase client SDK.
// (logout é responsabilidade do sidebar.js, comum a todas as páginas)
document.addEventListener("DOMContentLoaded", async () => {
  // A role vem das claims do token (fonte confiável) — não do localStorage,
  // que o usuário controla e que some se outra aba der logout.
  const role = await verificarToken(["admin", "superadmin"]);
  if (!role) return; // verificarToken já redirecionou

  const souSuperadmin = role === "superadmin";

  async function api(caminho, opcoes = {}) {
    const token = await obterToken();
    const resp = await fetch(caminho, {
      ...opcoes,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opcoes.headers || {}),
      },
    });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(corpo.erro || `Erro ${resp.status}`);
    return corpo;
  }

  function feedback(id, texto, ok) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = `msg-feedback ${ok ? "ok" : "erro"}`;
  }

  // Linha de tabela montada só com textContent (dados nunca viram HTML)
  function linha(celulas) {
    const tr = document.createElement("tr");
    for (const valor of celulas) {
      const td = document.createElement("td");
      if (valor instanceof HTMLElement) td.appendChild(valor);
      else td.textContent = valor;
      tr.appendChild(td);
    }
    return tr;
  }

  // ---------- estado ----------
  let condominios = {};
  let apartamentos = {};

  // ---------- carregamento ----------
  // Cada submit recarrega só o que aquele form mexeu — criar um medidor não
  // precisa rebuscar condomínios/aptos, e vice-versa.
  async function carregarEstrutura() {
    const [rCondos, rAptos] = await Promise.all([
      api("/estrutura/condominios"),
      api("/estrutura/apartamentos"),
    ]);
    condominios = rCondos.condominios || {};
    apartamentos = rAptos.apartamentos || {};

    renderizarPredios();
    renderizarAptos();
    preencherSelects();

    if (souSuperadmin) preencherSelectTarifas();
  }

  async function carregarDispositivos() {
    const rDisps = await api("/estrutura/dispositivos");
    renderizarDispositivos(rDisps.dispositivos || {});
  }

  async function carregarTudo() {
    if (souSuperadmin) {
      document.getElementById("painelCondominio").style.display = "";
      document.getElementById("painelTarifas").style.display = "";
      document.querySelector("[data-so-superadmin]").style.display = "";
    }

    await Promise.all([carregarEstrutura(), carregarDispositivos()]);
    if (souSuperadmin) await carregarTarifas();
  }

  function renderizarPredios() {
    const tbody = document.getElementById("listaPredios");
    tbody.innerHTML = "";
    for (const [condoId, condo] of Object.entries(condominios)) {
      for (const [predioId, predio] of Object.entries(condo.predios || {})) {
        tbody.appendChild(
          linha([condo.nome || condoId, predioId, predio.nome || "-"]),
        );
      }
    }
  }

  function renderizarAptos() {
    const tbody = document.getElementById("listaAptos");
    tbody.innerHTML = "";
    for (const [aptoID, apto] of Object.entries(apartamentos)) {
      tbody.appendChild(linha([aptoID, apto.predioID, apto.numero]));
    }
  }

  function renderizarDispositivos(dispositivos) {
    const tbody = document.getElementById("listaDispositivos");
    tbody.innerHTML = "";
    for (const [espId, disp] of Object.entries(dispositivos)) {
      const badge = document.createElement("span");
      badge.className = disp.ativo ? "badge" : "badge badge--off";
      badge.textContent = disp.ativo ? "Ativo" : "Revogado";
      tbody.appendChild(linha([espId, disp.aptoID, badge]));
    }
  }

  // Selects de prédio (form de apto) e de apto (form de dispositivo).
  // Superadmin enxerga todos os condomínios; o value carrega o par
  // condominio|predio pra rota receber os dois.
  function preencherSelects() {
    const selPredioForm = document.getElementById("predioCondominio");
    const selPredio = document.getElementById("aptoPredio");
    const selApto = document.getElementById("dispApto");
    selPredioForm.innerHTML = "";
    selPredio.innerHTML = "";
    selApto.innerHTML = "";

    for (const [condoId, condo] of Object.entries(condominios)) {
      const opCondo = document.createElement("option");
      opCondo.value = condoId;
      opCondo.textContent = condo.nome || condoId;
      selPredioForm.appendChild(opCondo);

      for (const predioId of Object.keys(condo.predios || {})) {
        const op = document.createElement("option");
        op.value = `${condoId}|${predioId}`;
        op.textContent = souSuperadmin
          ? `${condoId} / ${predioId}`
          : predioId;
        selPredio.appendChild(op);
      }
    }

    for (const aptoID of Object.keys(apartamentos)) {
      const op = document.createElement("option");
      op.value = aptoID;
      op.textContent = aptoID;
      selApto.appendChild(op);
    }
  }

  /* ---------- CONDOMÍNIO (superadmin) ---------- */
  document
    .getElementById("formCondominio")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/estrutura/condominios", {
          method: "POST",
          body: JSON.stringify({
            id: document.getElementById("condoId").value.trim(),
            nome: document.getElementById("condoNome").value.trim(),
            localizacao: document.getElementById("condoLocal").value.trim(),
          }),
        });
        feedback("msgCondominio", "Condomínio criado!", true);
        e.target.reset();
        await carregarEstrutura();
      } catch (err) {
        feedback("msgCondominio", err.message, false);
      }
    });

  /* ---------- PRÉDIO ---------- */
  document.getElementById("formPredio").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const body = {
        id: document.getElementById("predioId").value.trim(),
        nome: document.getElementById("predioNome").value.trim(),
      };
      if (souSuperadmin) {
        body.condominioID = document.getElementById("predioCondominio").value;
      }
      await api("/estrutura/predios", {
        method: "POST",
        body: JSON.stringify(body),
      });
      feedback("msgPredio", "Prédio criado!", true);
      e.target.reset();
      await carregarEstrutura();
    } catch (err) {
      feedback("msgPredio", err.message, false);
    }
  });

  /* ---------- APARTAMENTO ---------- */
  document.getElementById("formApto").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const valorPredio = document.getElementById("aptoPredio").value;
      if (!valorPredio) {
        feedback("msgApto", "Cadastre um prédio primeiro", false);
        return;
      }
      const [condominioID, predioID] = valorPredio.split("|");
      const body = {
        predioID,
        numero: document.getElementById("aptoNumero").value.trim(),
      };
      if (souSuperadmin) body.condominioID = condominioID;

      const r = await api("/estrutura/apartamentos", {
        method: "POST",
        body: JSON.stringify(body),
      });
      feedback("msgApto", `Apartamento ${r.aptoID} criado!`, true);
      e.target.reset();
      await carregarEstrutura();
    } catch (err) {
      feedback("msgApto", err.message, false);
    }
  });

  /* ---------- DISPOSITIVO ---------- */
  document
    .getElementById("formDispositivo")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const r = await api("/estrutura/dispositivos", {
          method: "POST",
          body: JSON.stringify({
            espId: document.getElementById("dispId").value.trim(),
            aptoID: document.getElementById("dispApto").value,
          }),
        });
        feedback("msgDispositivo", `Medidor ${r.espId} cadastrado!`, true);

        // A chave só existe nesta resposta — mostrar com destaque
        document.getElementById("chaveGerada").textContent = r.chave;
        document.getElementById("chaveBox").style.display = "";

        e.target.reset();
        await carregarDispositivos();
      } catch (err) {
        feedback("msgDispositivo", err.message, false);
      }
    });

  /* ---------- TARIFAS (superadmin) ---------- */
  function preencherSelectTarifas() {
    const sel = document.getElementById("tarifaCondominio");
    sel.innerHTML = "";
    for (const [condoId, condo] of Object.entries(condominios)) {
      const op = document.createElement("option");
      op.value = condoId;
      op.textContent = condo.nome || condoId;
      sel.appendChild(op);
    }
  }

  async function carregarTarifas() {
    const condoId = document.getElementById("tarifaCondominio").value;
    const tbody = document.getElementById("listaTarifas");
    tbody.innerHTML = "";
    if (!condoId) return;

    try {
      const r = await api(`/tarifas/${condoId}`);
      const ordenadas = Object.entries(r.tarifas || {}).sort((a, b) =>
        a[0] < b[0] ? 1 : -1,
      );
      for (const [competencia, t] of ordenadas) {
        tbody.appendChild(
          linha([
            competencia,
            `R$ ${Number(t.tusd).toFixed(4)}`,
            `R$ ${Number(t.te).toFixed(4)}`,
            `${((t.ipCip?.percentual || 0) * 100).toFixed(2)}%`,
          ]),
        );
      }
    } catch (err) {
      feedback("msgTarifa", err.message, false);
    }
  }

  document
    .getElementById("tarifaCondominio")
    .addEventListener("change", carregarTarifas);

  document.getElementById("formTarifa").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/tarifas", {
        method: "POST",
        body: JSON.stringify({
          condominioID: document.getElementById("tarifaCondominio").value,
          competencia: document.getElementById("tarifaCompetencia").value,
          tusd: Number(document.getElementById("tarifaTusd").value),
          te: Number(document.getElementById("tarifaTe").value),
          // Na tela o IP-CIP é % (ex: 4); no banco é fração (0.04)
          ipCipPercentual:
            Number(document.getElementById("tarifaIpCip").value) / 100,
        }),
      });
      feedback("msgTarifa", "Tarifa salva!", true);
      await carregarTarifas();
    } catch (err) {
      feedback("msgTarifa", err.message, false);
    }
  });

  carregarTudo().catch((err) => {
    console.error("Erro ao carregar estrutura:", err);
    feedback("msgPredio", "Não foi possível carregar os dados.", false);
  });
});

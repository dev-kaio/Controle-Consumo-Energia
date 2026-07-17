import { auth, signOut, verificarToken } from "../auth/firebaseConfig.js";

// Painel do superadmin: cadastro de usuários (admin/inquilino) e visão de
// todos os usuários agrupados por condomínio. Tudo via backend.
document.addEventListener("DOMContentLoaded", async () => {
  await verificarToken(["superadmin"]);

  const container = document.getElementById("listaCondominios");
  const filtroNome = document.getElementById("filtroNome");
  const filtroCondominio = document.getElementById("filtroCondominio");

  let todosUsuarios = {};
  let todosCondominios = {};

  // Formulário unificado
  const formUsuario = document.getElementById("formUsuario");
  const tipoSelect = document.getElementById("tipoUsuario");
  const condominioSelect = document.getElementById("condominioID");
  const apartamentoSelect = document.getElementById("apartamento");
  const campoApartamento = document.getElementById("campoApartamento");
  const msgUsuario = document.getElementById("msgUsuario");

  document.getElementById("logout").addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut();
    localStorage.clear();
  });

  function feedback(texto, ok) {
    msgUsuario.textContent = texto;
    msgUsuario.className = `msg-feedback ${ok ? "ok" : "erro"}`;
  }

  async function obterToken() {
    if (auth.currentUser) return auth.currentUser.getIdToken();
    return new Promise((resolve) => {
      const parar = auth.onAuthStateChanged((user) => {
        parar();
        resolve(user ? user.getIdToken() : null);
      });
    });
  }

  // Campo apartamento só aparece pra inquilino
  tipoSelect.addEventListener("change", () => {
    campoApartamento.style.display =
      tipoSelect.value === "inquilino" ? "" : "none";
  });

  // Apartamentos disponíveis dependem do condomínio escolhido
  condominioSelect.addEventListener("change", carregarApartamentosDoCondominio);

  async function carregarApartamentosDoCondominio() {
    const condoId = condominioSelect.value;
    apartamentoSelect.innerHTML = "";
    if (!condoId) return;

    try {
      const token = await obterToken();
      const resp = await fetch(
        `/estrutura/apartamentos?condominioID=${encodeURIComponent(condoId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!resp.ok) return;

      const { apartamentos } = await resp.json();
      for (const aptoID of Object.keys(apartamentos || {})) {
        const op = document.createElement("option");
        op.value = aptoID;
        op.textContent = aptoID;
        apartamentoSelect.appendChild(op);
      }
    } catch (err) {
      console.error("Erro ao carregar apartamentos:", err);
    }
  }

  // Buscar dados (sempre via backend, nunca Firebase client SDK)
  async function carregarDados() {
    try {
      const token = await obterToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [respUsuarios, respCondominios] = await Promise.all([
        fetch("/superadmin/usuarios", { headers }),
        fetch("/superadmin/condominios", { headers }),
      ]);

      if (!respUsuarios.ok || !respCondominios.ok) {
        throw new Error("Falha ao buscar dados do superadmin");
      }

      todosUsuarios = (await respUsuarios.json()).usuarios || {};
      todosCondominios = (await respCondominios.json()).condominios || {};

      popularSelectsCondominio();
      await carregarApartamentosDoCondominio();
      renderizar();
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      container.textContent =
        "Não foi possível carregar os dados. Tente recarregar a página.";
    }
  }

  function popularSelectsCondominio() {
    filtroCondominio.innerHTML =
      '<option value="">Todos os Condomínios</option>';
    condominioSelect.innerHTML = "";

    for (const condoId in todosCondominios) {
      const condo = todosCondominios[condoId];

      const opFiltro = document.createElement("option");
      opFiltro.value = condoId;
      opFiltro.textContent = `${condo.nome} (${condoId})`;
      filtroCondominio.appendChild(opFiltro);

      const opForm = opFiltro.cloneNode(true);
      condominioSelect.appendChild(opForm);
    }
  }

  function renderizar() {
    container.innerHTML = "";

    const nomeFiltro = filtroNome.value.toLowerCase();
    const condoFiltro = filtroCondominio.value;

    const usuariosPorCondominio = {};

    for (const uid in todosUsuarios) {
      const u = todosUsuarios[uid];

      if (nomeFiltro && !u.nome?.toLowerCase().includes(nomeFiltro)) continue;
      if (condoFiltro && u.condominioID !== condoFiltro) continue;

      const condoId = u.condominioID || "sem_condominio";
      if (!usuariosPorCondominio[condoId]) {
        usuariosPorCondominio[condoId] = [];
      }
      usuariosPorCondominio[condoId].push({ uid, ...u });
    }

    for (const condoId in usuariosPorCondominio) {
      const usuarios = usuariosPorCondominio[condoId];
      const condo = todosCondominios[condoId];

      usuarios.sort((a, b) => {
        if (a.tipo === "admin") return -1;
        if (b.tipo === "admin") return 1;
        return 0;
      });

      container.appendChild(criarAccordion(condoId, condo, usuarios));
    }
  }

  // Visual inteiro via classes CSS (menu.css) — o tema claro/escuro é
  // resolvido pelas variáveis, sem re-renderizar nada ao trocar de tema.
  function criarAccordion(condoId, condo, usuarios) {
    const div = document.createElement("div");
    div.className = "accordion-item";

    const header = document.createElement("div");
    header.className = "accordion-header";
    // Dados dinâmicos via textContent — nome/localização de condomínio
    // não podem entrar como HTML (XSS).
    header.innerHTML = `
      <span><span class="condo-nome"></span> <span class="condo-info"></span></span>
      <span class="arrow">▼</span>
    `;
    header.querySelector(".condo-nome").textContent =
      condo?.nome || "Sem Condomínio";
    header.querySelector(".condo-info").textContent =
      `(${condoId})${condo?.localizacao ? " — " + condo.localizacao : ""}`;

    const conteudo = document.createElement("div");
    conteudo.className = "accordion-content";

    const tabela = document.createElement("table");
    tabela.className = "data-table";
    tabela.innerHTML = `
      <thead>
        <tr>
          <th>Nome</th>
          <th>Perfil</th>
          <th>Apartamento</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = tabela.querySelector("tbody");

    for (const u of usuarios) {
      const tr = document.createElement("tr");
      if (u.tipo === "admin") tr.className = "linha-admin";

      // Células com textContent — dados do banco nunca viram HTML (XSS)
      const celulas = [
        u.nome || "-",
        u.tipo === "admin" ? "Admin" : u.tipo,
        u.aptoID || "-",
        u.ativo ? "Ativo" : "Inativo",
      ];
      for (const valor of celulas) {
        const td = document.createElement("td");
        td.textContent = valor;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    conteudo.appendChild(tabela);

    header.addEventListener("click", () => {
      const aberto = conteudo.style.display === "block";
      conteudo.style.display = aberto ? "none" : "block";
      header.querySelector(".arrow").textContent = aberto ? "▼" : "▲";
    });

    div.appendChild(header);
    div.appendChild(conteudo);

    return div;
  }

  // Cadastrar usuário (unificado)
  formUsuario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipo = tipoSelect.value;
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const condominioID = condominioSelect.value;
    const apartamento = apartamentoSelect.value;

    if (!nome || !email || !senha || !condominioID) {
      feedback("Preencha todos os campos!", false);
      return;
    }

    if (tipo === "inquilino" && !apartamento) {
      feedback("Inquilino precisa de apartamento (cadastre na Estrutura)", false);
      return;
    }

    try {
      const token = await obterToken();

      const body = { nome, email, senha, condominioID, tipo };
      if (tipo === "inquilino") {
        body.aptoID = apartamento;
      }

      const response = await fetch("/usuarios/criar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        feedback(`${tipo === "admin" ? "Admin" : "Inquilino"} criado!`, true);
        formUsuario.reset();
        campoApartamento.style.display = "";
        carregarDados();
      } else {
        const err = await response.json();
        feedback("Erro: " + (err.erro || response.status), false);
      }
    } catch (err) {
      console.error(err);
      feedback("Erro ao criar usuário.", false);
    }
  });

  // Filtros
  filtroNome.addEventListener("input", renderizar);
  filtroCondominio.addEventListener("change", renderizar);

  // Expandir/Colapsar
  document.getElementById("expandirTodos").addEventListener("click", () => {
    container.querySelectorAll(".accordion-content").forEach((c) => {
      c.style.display = "block";
    });
    container.querySelectorAll(".arrow").forEach((a) => {
      a.textContent = "▲";
    });
  });

  document.getElementById("colapsarTodos").addEventListener("click", () => {
    container.querySelectorAll(".accordion-content").forEach((c) => {
      c.style.display = "none";
    });
    container.querySelectorAll(".arrow").forEach((a) => {
      a.textContent = "▼";
    });
  });

  carregarDados();
});

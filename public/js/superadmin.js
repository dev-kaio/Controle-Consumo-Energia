import {
  auth,
  verificarToken,
  getUsuarioLogado,
} from "../auth/firebaseConfig.js";

document.addEventListener("DOMContentLoaded", async () => {
  await verificarToken(["superadmin"]);

  const container = document.getElementById("listaCondominios");
  const filtroNome = document.getElementById("filtroNome");
  const filtroCondominio = document.getElementById("filtroCondominio");

  let todosUsuarios = [];
  let todosCondominios = {};

  // Formulário unificado
  const formUsuario = document.getElementById("formUsuario");
  const tipoSelect = document.getElementById("tipoUsuario");
  const apartamentoInput = document.getElementById("apartamento");

  // Mostrar/ocultar campo apartamento conforme tipo
  tipoSelect.addEventListener("change", () => {
    apartamentoInput.style.display =
      tipoSelect.value === "inquilino" ? "block" : "none";
  });

  // Identificar se está em dark mode
  function isDarkMode() {
    return document.body.classList.contains("dark");
  }

  // Buscar dados (agora via backend, não mais leitura direta do Firebase)
  async function carregarDados() {
    try {
      const token = await auth.currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [respUsuarios, respCondominios] = await Promise.all([
        fetch("/superadmin/usuarios", { headers }),
        fetch("/superadmin/condominios", { headers }),
      ]);

      if (!respUsuarios.ok || !respCondominios.ok) {
        throw new Error("Falha ao buscar dados do superadmin");
      }

      const dadosUsuarios = await respUsuarios.json();
      const dadosCondominios = await respCondominios.json();

      todosUsuarios = dadosUsuarios.usuarios || {};
      todosCondominios = dadosCondominios.condominios || {};

      popularFiltroCondominios();
      renderizar();
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      container.innerHTML =
        '<p style="padding:20px;color:#b91c1c">Não foi possível carregar os dados. Tente recarregar a página.</p>';
    }
  }

  function popularFiltroCondominios() {
    filtroCondominio.innerHTML =
      '<option value="">Todos os Condomínios</option>';
    for (const condoId in todosCondominios) {
      const condo = todosCondominios[condoId];
      const option = document.createElement("option");
      option.value = condoId;
      option.textContent = `${condo.nome} (${condoId})`;
      filtroCondominio.appendChild(option);
    }
  }

  function getTableStyle() {
    const dark = isDarkMode();
    return {
      tableBg: dark ? "#1f2937" : "#ffffff4e",
      headerBg: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
      rowBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      rowHover: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      text: dark ? "#e5e7eb" : "#1f2933",
      headerBgAccordion: dark ? "#374151" : "#f0f0f0",
      adminBg: dark ? "#6366f1" : "#6366f1",
    };
  }

  function renderizar() {
    container.innerHTML = "";

    const nomeFiltro = filtroNome.value.toLowerCase();
    const condoFiltro = filtroCondominio.value;
    const style = getTableStyle();

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

      const accordion = criarAccordion(condoId, condo, usuarios, style);
      container.appendChild(accordion);
    }
  }

  function criarAccordion(condoId, condo, usuarios, style) {
    const div = document.createElement("div");
    div.className = "accordion-item";
    div.style.marginBottom = "20px";
    div.style.border = "1px solid " + style.rowBorder;
    div.style.borderRadius = "5px";

    const nomeCondo = condo?.nome || "Sem Condomínio";
    const local = condo?.localizacao || "";

    const header = document.createElement("div");
    header.className = "accordion-header";
    header.style.padding = "15px";
    header.style.background = style.headerBgAccordion;
    header.style.cursor = "pointer";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.color = style.text;
    // Dados dinâmicos via textContent — nome/localização de condomínio
    // não podem entrar como HTML (XSS).
    header.innerHTML = `
      <span><strong class="condo-nome"></strong> <span class="condo-info"></span></span>
      <span class="arrow">▼</span>
    `;
    header.querySelector(".condo-nome").textContent = nomeCondo;
    header.querySelector(".condo-info").textContent = `(ID: ${condoId}) - ${local}`;

    const conteudo = document.createElement("div");
    conteudo.className = "accordion-content";
    conteudo.style.display = "none";
    conteudo.style.padding = "10px";

    const tabela = document.createElement("table");
    tabela.className = "tabela-superadmin";
    tabela.style.width = "100%";
    tabela.style.borderCollapse = "collapse";
    tabela.style.background = style.tableBg;
    tabela.style.borderRadius = "16px";
    tabela.style.overflow = "hidden";

    tabela.innerHTML = `
      <thead style="background: ${style.headerBg}">
        <tr>
          <th style="padding:14px 16px;text-align:left;color:${style.text}">Nome</th>
          <th style="padding:14px 16px;text-align:left;color:${style.text}">Tipo</th>
          <th style="padding:14px 16px;text-align:left;color:${style.text}">Condomínio ID</th>
          <th style="padding:14px 16px;text-align:left;color:${style.text}">Apartamento</th>
          <th style="padding:14px 16px;text-align:left;color:${style.text}">Status</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = tabela.querySelector("tbody");

    for (const u of usuarios) {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid " + style.rowBorder;

      const isAdmin = u.tipo === "admin";
      if (isAdmin) {
        tr.style.background = style.adminBg;
      }

      const textColor = isAdmin ? "#ffffff" : style.text;

      tr.addEventListener("mouseenter", () => {
        tr.style.background = isAdmin ? "#4f46e5" : style.rowHover;
      });
      tr.addEventListener("mouseleave", () => {
        tr.style.background = isAdmin ? style.adminBg : "transparent";
      });

      // Células criadas com textContent — nome/tipo/IDs vindos do banco
      // nunca são interpretados como HTML (XSS).
      const celulas = [
        u.nome || "-",
        isAdmin ? "Admin" : u.tipo,
        u.condominioID || "-",
        u.aptoID || "-",
        u.ativo ? "Ativo" : "Inativo",
      ];
      for (const valor of celulas) {
        const td = document.createElement("td");
        td.style.cssText = `padding:14px 16px;color:${textColor}`;
        td.textContent = valor;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    conteudo.appendChild(tabela);

    header.addEventListener("click", () => {
      const isOpen = conteudo.style.display === "block";
      conteudo.style.display = isOpen ? "none" : "block";
      header.querySelector(".arrow").textContent = isOpen ? "▼" : "▲";
    });

    div.appendChild(header);
    div.appendChild(conteudo);

    return div;
  }

  // Cadastrar Usuário (unificado)
  formUsuario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipo = document.getElementById("tipoUsuario").value;
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const condominioID = document.getElementById("condominioID").value.trim();
    const apartamento = document.getElementById("apartamento").value.trim();

    if (!nome || !email || !senha || !condominioID) {
      alert("Preencha todos os campos!");
      return;
    }

    if (tipo === "inquilino" && !apartamento) {
      alert("Inquilino precisa de apartamento!");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();

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
        alert(`${tipo === "admin" ? "Admin" : "Inquilino"} criado!`);
        formUsuario.reset();
        apartamentoInput.style.display = "none";
        carregarDados();
      } else {
        const err = await response.json();
        alert("Erro: " + err.erro);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao criar usuário.");
    }
  });

  // Filtros
  filtroNome.addEventListener("input", renderizar);
  filtroCondominio.addEventListener("change", renderizar);

  // Expandir/Colapsar
  document.getElementById("expandirTodos").addEventListener("click", () => {
    const contents = container.querySelectorAll(".accordion-content");
    const arrows = container.querySelectorAll(".arrow");
    contents.forEach((c, i) => {
      c.style.display = "block";
      if (arrows[i]) arrows[i].textContent = "▲";
    });
  });

  document.getElementById("colapsarTodos").addEventListener("click", () => {
    const contents = container.querySelectorAll(".accordion-content");
    const arrows = container.querySelectorAll(".arrow");
    contents.forEach((c, i) => {
      c.style.display = "none";
      if (arrows[i]) arrows[i].textContent = "▼";
    });
  });

  // Atualizar quando tema mudar
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    const observer = new MutationObserver(() => {
      renderizar();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  carregarDados();
});

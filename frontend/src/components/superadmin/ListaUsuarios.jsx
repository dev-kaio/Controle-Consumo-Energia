// Lista global de usuários agrupada por condomínio, com filtros por
// nome/condomínio e expandir/colapsar todos.
import { useState } from "react";
import AccordionCondominio from "./AccordionCondominio.jsx";

export default function ListaUsuarios({
  usuarios,
  condominios,
  aoAlternarStatus,
  aoAlterarSenha,
}) {
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCondo, setFiltroCondo] = useState("");
  const [abertos, setAbertos] = useState({}); // condoId -> true/false

  // Agrupa por condomínio aplicando os filtros (admins primeiro)
  const porCondominio = {};
  for (const [uid, u] of Object.entries(usuarios)) {
    if (filtroNome && !u.nome?.toLowerCase().includes(filtroNome.toLowerCase()))
      continue;
    if (filtroCondo && u.condominioID !== filtroCondo) continue;

    const condoId = u.condominioID || "sem_condominio";
    (porCondominio[condoId] ||= []).push({ uid, ...u });
  }
  for (const lista of Object.values(porCondominio)) {
    lista.sort((a, b) =>
      a.tipo === "admin" ? -1 : b.tipo === "admin" ? 1 : 0,
    );
  }

  function definirTodos(valor) {
    setAbertos(
      Object.fromEntries(Object.keys(porCondominio).map((id) => [id, valor])),
    );
  }

  return (
    <div className="panel">
      <h2>Usuários por condomínio</h2>
      <div className="form-linha">
        <div className="campo">
          <label htmlFor="filtroNome">Buscar por nome</label>
          <input
            id="filtroNome"
            placeholder="Nome…"
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="filtroCondominio">Condomínio</label>
          <select
            id="filtroCondominio"
            value={filtroCondo}
            onChange={(e) => setFiltroCondo(e.target.value)}
          >
            <option value="">Todos os Condomínios</option>
            {Object.entries(condominios).map(([id, c]) => (
              <option key={id} value={id}>
                {c.nome} ({id})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => definirTodos(true)}
        >
          Expandir todos
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => definirTodos(false)}
        >
          Colapsar todos
        </button>
      </div>

      <div style={{ marginTop: "16px" }}>
        {Object.entries(porCondominio).map(([condoId, lista]) => (
          <AccordionCondominio
            key={condoId}
            condoId={condoId}
            condo={condominios[condoId]}
            usuarios={lista}
            aberto={!!abertos[condoId]}
            alternar={() =>
              setAbertos((a) => ({ ...a, [condoId]: !a[condoId] }))
            }
            aoAlternarStatus={aoAlternarStatus}
            aoAlterarSenha={aoAlterarSenha}
          />
        ))}
      </div>
    </div>
  );
}

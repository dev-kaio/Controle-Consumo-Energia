// Tabela de inquilinos com as ações por linha.
// Os modais (editar/senha) são controlados pela página (Inquilinos.jsx);
// aqui só disparamos os callbacks.
import { Link } from "react-router-dom";
import { aptoSemCondominio } from "../../utils/formatos.js";

export default function TabelaInquilinos({
  inquilinos,
  aoAlternarStatus,
  aoEditar,
  aoAlterarSenha,
}) {
  const entradas = Object.entries(inquilinos);

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Apartamento</th>
          <th>Status</th>
          <th style={{ textAlign: "center" }}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {entradas.map(([uid, u]) => (
          <tr key={uid} style={u.ativo ? undefined : { opacity: 0.5 }}>
            <td>{u.nome || ""}</td>
            <td>{aptoSemCondominio(u.aptoID)}</td>
            <td>{u.ativo ? "Ativo" : "Inativo"}</td>
            <td
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                className="status-btn"
                onClick={() => aoAlternarStatus(uid, !u.ativo)}
              >
                {u.ativo ? "Desativar" : "Ativar"}
              </button>
              <button
                type="button"
                className="editar-btn"
                onClick={() => aoEditar(uid, u)}
              >
                Editar
              </button>
              <button
                type="button"
                className="senha-btn"
                onClick={() => aoAlterarSenha(uid, u)}
              >
                Alterar Senha
              </button>
              <Link
                className="link-consumo"
                to={`/dashboard?aptoID=${encodeURIComponent(u.aptoID || "")}`}
              >
                Gerenciar Consumo
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

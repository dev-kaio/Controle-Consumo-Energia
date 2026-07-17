// Um accordion por condomínio com a tabela de usuários dele.
// Aberto/fechado é estado do PAI (ListaUsuarios) — assim os botões
// "expandir/colapsar todos" funcionam de fora.
export default function AccordionCondominio({ condoId, condo, usuarios, aberto, alternar }) {
  return (
    <div className="accordion-item">
      <div className="accordion-header" onClick={alternar}>
        <span>
          <span className="condo-nome">{condo?.nome || "Sem Condomínio"}</span>{" "}
          <span className="condo-info">
            ({condoId}){condo?.localizacao ? ` — ${condo.localizacao}` : ""}
          </span>
        </span>
        <span className="arrow">{aberto ? "▲" : "▼"}</span>
      </div>

      <div className={aberto ? "accordion-content aberto" : "accordion-content"}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Perfil</th>
              <th>Apartamento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.uid} className={u.tipo === "admin" ? "linha-admin" : undefined}>
                <td>{u.nome || "-"}</td>
                <td>{u.tipo === "admin" ? "Admin" : u.tipo}</td>
                <td>{u.aptoID || "-"}</td>
                <td>{u.ativo ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

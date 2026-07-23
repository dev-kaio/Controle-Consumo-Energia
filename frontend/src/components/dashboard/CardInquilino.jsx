// Um card de inquilino na visão "por apartamento" do admin.
// Clicar leva pro dashboard filtrado naquele apto (?aptoID=).
import { Link } from "react-router-dom";
import { formatarKWh, aptoSemCondominio } from "../../utils/formatos.js";

export default function CardInquilino({ inquilino, totais, nomeFiltro }) {
  return (
    <Link
      to={`/dashboard?aptoID=${encodeURIComponent(inquilino.aptoID || "")}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="tenant-card">
        <div className="tenant-apto">
          Apto {aptoSemCondominio(inquilino.aptoID)}
        </div>
        <div className="tenant-nome">{inquilino.nome || ""}</div>

        <div className="tenant-linha">
          <span>Consumo ({nomeFiltro})</span>
          <span className="tenant-valor tenant-valor--consumo">
            {formatarKWh(totais.consumo)}
          </span>
        </div>
        <div className="tenant-linha">
          <span>Autoconsumo ({nomeFiltro})</span>
          <span className="tenant-valor tenant-valor--autoconsumo">
            {formatarKWh(totais.autoconsumo)}
          </span>
        </div>
        <div className="tenant-linha">
          <span>Geração ({nomeFiltro})</span>
          <span className="tenant-valor tenant-valor--geracao">
            {formatarKWh(totais.geracao)}
          </span>
        </div>
      </div>
    </Link>
  );
}

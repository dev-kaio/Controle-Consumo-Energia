// Os 3 blocos de média (roxo/verde/laranja) abaixo dos KPIs.
import { formatarKWh } from "../../utils/formatos.js";

const BLOCOS = [
  { tipo: "consumo", nome: "Consumo", cor: "var(--color-accent)" },
  { tipo: "autoconsumo", nome: "Autoconsumo", cor: "var(--color-autoconsumo)" },
  { tipo: "geracao", nome: "Geração", cor: "var(--color-geracao)" },
];

export default function MediasConsumo({ medias, nomeFiltro }) {
  return (
    <div className="media-consumo-container">
      {BLOCOS.map(({ tipo, nome, cor }) => (
        <div key={tipo}>
          <h3>
            Média de {nome}:
            <br /> {nomeFiltro}
          </h3>
          <p style={{ color: cor }}>
            {medias[tipo] ? formatarKWh(medias[tipo]) : "--"}
          </p>
        </div>
      ))}
    </div>
  );
}

// Input de senha com o "olhinho" de mostrar/ocultar.
import { useState } from "react";

const OLHO_ABERTO = "/assets/eye-open.png";
const OLHO_FECHADO = "/assets/eye-closed.png";

export default function CampoSenha({ id, label, value, onChange }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        type={visivel ? "text" : "password"}
        id={id}
        value={value}
        onChange={onChange}
        required
      />
      <button
        type="button"
        className="toggle-password"
        title={visivel ? "Ocultar senha" : "Mostrar senha"}
        style={{
          backgroundImage: `url(${visivel ? OLHO_ABERTO : OLHO_FECHADO})`,
        }}
        onClick={() => setVisivel((v) => !v)}
      />
    </div>
  );
}

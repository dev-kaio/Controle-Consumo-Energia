// Mensagem inline de sucesso/erro embaixo de forms e tabelas.
// Uso: const [msg, setMsg] = useState(null);
//      setMsg({ texto: "Salvo!", ok: true })  →  <MsgFeedback msg={msg} />
// Sem msg, ocupa a mesma altura (min-height no CSS) — nada "pula" na tela.
export default function MsgFeedback({ msg }) {
  const classe = msg
    ? `msg-feedback ${msg.ok ? "ok" : "erro"}`
    : "msg-feedback";
  return <p className={classe}>{msg?.texto || ""}</p>;
}

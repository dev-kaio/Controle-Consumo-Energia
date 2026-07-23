// Casca de modal genérica. Uso:
//   {aberto && <Modal titulo="Editar" aoFechar={...}> ...form... </Modal>}
export default function Modal({ titulo, aoFechar, children }) {
  return (
    <div className="modal" onClick={aoFechar}>
      {/* stopPropagation: clicar DENTRO do card não fecha o modal */}
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="fechar" onClick={aoFechar}>
          &times;
        </button>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

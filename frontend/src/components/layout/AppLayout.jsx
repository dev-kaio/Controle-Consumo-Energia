// Casca comum de todas as páginas internas: header + sidebar + conteúdo.
// O <Outlet/> é onde o react-router encaixa a página da rota atual.
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

export default function AppLayout() {
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <>
      <Header aoAbrirMenu={() => setSidebarAberta((v) => !v)} />
      <Sidebar aberta={sidebarAberta} fechar={() => setSidebarAberta(false)} />
      <main className="dashboard">
        <Outlet />
      </main>
    </>
  );
}

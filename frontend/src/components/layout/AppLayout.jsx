// Casca comum de todas as páginas internas: header + sidebar + conteúdo.
// O <Outlet/> é onde o react-router encaixa a página da rota atual.
//
// O TourProvider abraça tudo porque o tutorial é disparado de dois lugares
// (menu e Configurações) e desenhado num terceiro — e porque, morando aqui,
// ele sobrevive à troca de rota que o próprio tour faz.
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import TourProvider from "../tour/TourContext.jsx";
import Tour from "../tour/Tour.jsx";

export default function AppLayout() {
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <TourProvider>
      <Header aoAbrirMenu={() => setSidebarAberta((v) => !v)} />
      <Sidebar aberta={sidebarAberta} fechar={() => setSidebarAberta(false)} />
      <main className="dashboard">
        <Outlet />
      </main>
      <Tour />
    </TourProvider>
  );
}

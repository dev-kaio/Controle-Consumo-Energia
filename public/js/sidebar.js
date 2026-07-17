document.addEventListener("DOMContentLoaded", async () => {
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");

  const tipoUsuario = localStorage.getItem("tipoUsuario");
  const superadminLink = document.getElementById("superadminLink");
  if (superadminLink && tipoUsuario === "superadmin") {
    superadminLink.style.display = "block";
    superadminLink.href = "./superadmin.html";
  }

  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Tocar/clicar fora fecha a sidebar (essencial no celular)
  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("active") &&
      !sidebar.contains(e.target) &&
      !menuBtn.contains(e.target)
    ) {
      sidebar.classList.remove("active");
    }
  });

  // Nem toda página tem filtro (ex: estrutura.html) — os elementos são
  // opcionais pra este script servir qualquer página com sidebar.
  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");

  if (filterBtn && filterMenu) {
    filterBtn.addEventListener("click", () => {
      sidebar.classList.remove("active");

      const isVisible = filterMenu.style.display === "block";
      filterMenu.style.display = isVisible ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
      const isClickInsideMenu =
        filterMenu.contains(e.target) || filterBtn.contains(e.target);
      if (!isClickInsideMenu) {
        filterMenu.style.display = "none";
      }
    });
  }
});

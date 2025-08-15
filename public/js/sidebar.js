// Alternar sidebar
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});

// Abrir/fechar menu de filtros
const filterBtn = document.getElementById("filterBtn");
const filterMenu = document.getElementById("filterMenu");

filterBtn.addEventListener("click", () => {
  filterMenu.style.display =
    filterMenu.style.display === "block" ? "none" : "block";
});

// Captura o filtro selecionado
filterMenu.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const filtro = e.target.getAttribute("data-filter");
    console.log("Filtro selecionado:", filtro);
    filterMenu.style.display = "none";
    // Aqui você pode chamar a função que filtra o gráfico
    // ex: atualizarGrafico(filtro);
  });
});
document.addEventListener("DOMContentLoaded", async () => {
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");

  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");

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
});

const themeToggle = document.getElementById("themeToggle");

const temaSalvo = localStorage.getItem("tema");
if (temaSalvo === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");
  themeToggle.textContent = dark ? "☀️" : "🌙";
  localStorage.setItem("tema", dark ? "dark" : "light");
});

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
  const isClickInsideMenu = filterMenu.contains(e.target) || filterBtn.contains(e.target);
  if (!isClickInsideMenu) {
    filterMenu.style.display = "none";
  }
});

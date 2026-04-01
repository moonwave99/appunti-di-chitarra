const NAV_SCROLL_THRESHOLD = 100;

window.addEventListener("DOMContentLoaded", init);

async function init() {
  const nav = document.querySelector(".nav");
  const navToggler = document.querySelector(".navToggler");
  navToggler.addEventListener("click", () =>
    document.body.classList.toggle("isNavOpen"),
  );

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > NAV_SCROLL_THRESHOLD);
    document.body.classList.remove("isNavOpen");
  });

  await preloadAssets();
}

function preloadAssets() {
  return Promise.allSettled(
    [...document.querySelectorAll('link[rel="preload"][as="image"]')].map(
      (node) =>
        preload(node.href).then(() =>
          document.querySelector(node.dataset.for)?.classList.add("loaded"),
        ),
    ),
  );
}

function preload(imgSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = imgSrc;
  });
}

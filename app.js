const catalogGrid = document.querySelector("#catalog-grid");
const searchInput = document.querySelector("#search-input");
const timeline = document.querySelector("#timeline");
const modelCount = document.querySelector("#model-count");
const photoCount = document.querySelector("#photo-count");

document.querySelector("#year").textContent = new Date().getFullYear();

const config = {
  shipping: [
    {
      title: "准备期",
      date: "4月初 - 4月底",
      text: "确认采购清单、预估价格、筛选车况和卖家。适合提前表达意向。",
    },
    {
      title: "集中采买",
      date: "5月初 - 5月中",
      text: "统一沟通卖家并下单，价格和库存会随市场变化。",
    },
    {
      title: "结单与打包",
      date: "5月中 - 5月底",
      text: "完成付款确认、拍照留档、合箱加固和集运准备。",
    },
    {
      title: "预计到达",
      date: "6月上旬 - 6月中旬",
      text: "到达时间取决于航线、清关和国内派送进度。",
    },
  ],
};

function normalizeName(value) {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function renderTimeline() {
  timeline.innerHTML = config.shipping
    .map(
      (item) => `
        <li>
          <strong>${item.title}</strong>
          <time>${item.date}</time>
          <p>${item.text}</p>
        </li>
      `,
    )
    .join("");
}

function renderCatalog(items) {
  catalogGrid.innerHTML = items
    .map((item) => {
      const image = item.cover || item.images[0];
      return `
        <article class="model-card">
          <img src="${encodeURI(image)}" alt="${normalizeName(item.name)}" loading="lazy" />
          <div>
            <h3>${normalizeName(item.name)}</h3>
            <p>${item.images.length} 张图片</p>
          </div>
        </article>
      `;
    })
    .join("");
}

async function boot() {
  renderTimeline();

  const response = await fetch("./data/catalog.json");
  const catalog = await response.json();

  modelCount.textContent = catalog.length;
  photoCount.textContent = catalog.reduce((sum, item) => sum + item.images.length, 0);
  renderCatalog(catalog);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query
      ? catalog.filter((item) => item.name.toLowerCase().includes(query))
      : catalog;
    renderCatalog(filtered);
  });
}

boot().catch((error) => {
  catalogGrid.innerHTML = `<p>图片目录加载失败：${error.message}</p>`;
});

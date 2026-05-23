const catalogGrid = document.querySelector("#catalog-grid");
const searchInput = document.querySelector("#search-input");
const timeline = document.querySelector("#timeline");
const modelCount = document.querySelector("#model-count");
const photoCount = document.querySelector("#photo-count");
const galleryDialog = document.querySelector("#gallery-dialog");
const galleryImage = document.querySelector("#gallery-image");
const galleryTitle = document.querySelector("#gallery-title");
const galleryCount = document.querySelector("#gallery-count");
const galleryOpen = document.querySelector("#gallery-open");
const galleryClose = document.querySelector("#gallery-close");
const galleryPrev = document.querySelector("#gallery-prev");
const galleryNext = document.querySelector("#gallery-next");

let activeModel = null;
let activeImageIndex = 0;

document.querySelector("#year").textContent = new Date().getFullYear();

const config = {
  currentShipping: [
    {
      title: "已完成准备",
      date: "4月 - 5月中旬",
      text: "确认采购清单、价格、车况和卖家，完成本期集中采购准备。",
    },
    {
      title: "结单与封箱",
      date: "5月下旬",
      text: "完成付款确认、拍照留档、合箱加固和转运资料整理。",
    },
    {
      title: "封箱转运",
      date: "5月29日",
      text: "本期包裹封箱并开始转运，后续以物流和清关实际状态为准。",
    },
    {
      title: "预计配送",
      date: "6月第一周",
      text: "预计到中国、完成海关查验并出关，第一周内开始陆续国内配送。",
    },
  ],
  nextShipping: [
    {
      title: "下期准备",
      date: "6月",
      text: "收集意向车型、预算、比例、颜色和是否接受无盒等偏好。",
    },
    {
      title: "集中采买",
      date: "7月",
      text: "开始集中寻找和采买，具体结单日期按实际库存和卖家情况确定。",
    },
    {
      title: "转运封箱",
      date: "8月",
      text: "预计完成合箱加固并安排转运，具体日期后续更新。",
    },
  ],
};

function normalizeName(value) {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function renderTimeline() {
  const current = config.currentShipping
    .map(
      (item) => `
        <li class="current">
          <strong>${item.title}</strong>
          <time>${item.date}</time>
          <p>${item.text}</p>
        </li>
      `,
    )
    .join("");
  const next = config.nextShipping
    .map(
      (item) => `
        <li class="next">
          <strong>${item.title}</strong>
          <time>${item.date}</time>
          <p>${item.text}</p>
        </li>
      `,
    )
    .join("");

  timeline.innerHTML = `${current}<li class="timeline-divider">下期集运预告</li>${next}`;
}

function updateGallery() {
  if (!activeModel) return;
  const image = activeModel.images[activeImageIndex];
  galleryImage.src = encodeURI(image);
  galleryImage.alt = normalizeName(activeModel.name);
  galleryTitle.textContent = normalizeName(activeModel.name);
  galleryCount.textContent = `${activeImageIndex + 1} / ${activeModel.images.length}`;
  galleryOpen.href = encodeURI(image);
}

function openGallery(item, index = 0) {
  activeModel = item;
  activeImageIndex = index;
  updateGallery();
  galleryDialog.showModal();
}

function moveGallery(delta) {
  if (!activeModel) return;
  activeImageIndex = (activeImageIndex + delta + activeModel.images.length) % activeModel.images.length;
  updateGallery();
}

function renderCatalog(items) {
  catalogGrid.innerHTML = items
    .map((item, index) => {
      const image = item.cover || item.images[0];
      return `
        <article class="model-card" data-model-index="${index}">
          <img src="${encodeURI(image)}" alt="${normalizeName(item.name)}" loading="lazy" />
          <div>
            <h3>${normalizeName(item.name)}</h3>
            <p>${item.images.length} 张图片 · 点击查看</p>
          </div>
        </article>
      `;
    })
    .join("");

  catalogGrid.querySelectorAll(".model-card").forEach((card) => {
    card.addEventListener("click", () => {
      openGallery(items[Number(card.dataset.modelIndex)]);
    });
  });
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

  galleryClose.addEventListener("click", () => galleryDialog.close());
  galleryPrev.addEventListener("click", () => moveGallery(-1));
  galleryNext.addEventListener("click", () => moveGallery(1));
  galleryDialog.addEventListener("click", (event) => {
    if (event.target === galleryDialog) galleryDialog.close();
  });
  window.addEventListener("keydown", (event) => {
    if (!galleryDialog.open) return;
    if (event.key === "ArrowLeft") moveGallery(-1);
    if (event.key === "ArrowRight") moveGallery(1);
  });
}

boot().catch((error) => {
  catalogGrid.innerHTML = `<p>图片目录加载失败：${error.message}</p>`;
});

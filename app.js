const catalogGrid = document.querySelector("#catalog-grid");
const searchInput = document.querySelector("#search-input");
const timeline = document.querySelector("#timeline");
const modelCount = document.querySelector("#model-count");
const photoCount = document.querySelector("#photo-count");
const shippingProgressFill = document.querySelector("#shipping-progress-fill");
const shippingProgressLabel = document.querySelector("#shipping-progress-label");
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
      title: "11月集运准备",
      date: "2026年11月",
      text: "收集意向车型、预算、比例和颜色，确认本期采购清单。",
      progress: 0,
    },
    {
      title: "采购与集中收货",
      date: "11月起至封箱前",
      text: "按确认清单采购，陆续收货并核对车况、拍照留档。",
      progress: 0,
    },
    {
      title: "结单与封箱",
      date: "2026年12月 · 圣诞节前",
      text: "计划在圣诞节前完成付款核对、合箱加固和封箱，具体截止日期另行通知。",
      progress: 0,
    },
    {
      title: "转运与配送",
      date: "封箱后 · 时间待确认",
      text: "封箱后安排转运，到货、清关及国内配送时间以实际物流进度为准。",
      progress: 0,
    },
  ],
  nextShipping: [],
};

function getStageProgress(item) {
  return item.progress;
}

function getStageState(progress) {
  if (progress >= 100) return "已完成";
  if (progress > 0) return "进行中";
  return "未完成";
}

function getOverallProgress(today) {
  const stages = config.currentShipping;
  const total = stages.reduce((sum, item) => sum + getStageProgress(item, today), 0);
  return Math.round(total / stages.length);
}

function normalizeName(value) {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function renderTimeline() {
  const today = new Date();
  const overallProgress = getOverallProgress(today);
  shippingProgressFill.style.width = `${overallProgress}%`;
  shippingProgressLabel.textContent = `${overallProgress}%`;

  const current = config.currentShipping
    .map((item, index) => {
      const progress = getStageProgress(item, today);
      const state = getStageState(progress);
      return `
        <li class="current ${state === "已完成" ? "is-done" : ""} ${state === "进行中" ? "is-active" : ""}" style="--stage-progress: ${progress}%">
          <span class="step-index">${index + 1}</span>
          <span class="step-state">${state}</span>
          <strong>${item.title}</strong>
          <time>${item.date}</time>
          <p>${item.text}</p>
        </li>
      `;
    })
    .join("");
  const next = config.nextShipping
    .map((item, index) => `
        <li class="next">
          <span class="step-index">${index + 1}</span>
          <span class="step-state">预告</span>
          <strong>${item.title}</strong>
          <time>${item.date}</time>
          <p>${item.text}</p>
        </li>
      `,
    )
    .join("");

  timeline.innerHTML = `${current}${next ? '<li class="timeline-divider">下期集运预告</li>' + next : ""}`;
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
      const image = item.thumbnail || item.cover || item.images[0];
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

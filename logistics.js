const printButton = document.querySelector("#print-page");
const languageButton = document.querySelector("#language-toggle");

const frenchToChinese = {
  "Détails de la commande | Peugeot 4002": "订单详情 | 标致 4002",
  "Détails de la commande | Citroën DS5 Phase 1 Norev 1/18": "订单详情 | 雪铁龙 DS5 Phase 1 Norev 1/18",
  "Détails de la commande | Volkswagen VW Golf 8 GTI 1/18": "订单详情 | 大众 VW Golf 8 GTI 1/18",
  "Détails de la commande | Alpine Alpenglow 1/18": "订单详情 | Alpine Alpenglow 1/18",
  "Accueil": "首页", "Commande 1": "订单 1", "Commande 2": "订单 2", "Commande 3": "订单 3", "Détails de la commande": "订单详情", "Page imprimable": "打印页面",
  "EN TRANSIT": "运输中", "RETARD": "延误", "Peugeot 4002 Concept": "标致 4002 概念车", "Suivre la commande": "追踪订单",
  "Retard de livraison : le colis est toujours en transit. Son arrivée à la douane chinoise est prévue le 12 septembre 2026.": "物流延误：包裹仍在运输中，预计于 2026 年 9 月 12 日抵达中国海关。",
  "Navigation des commandes": "订单导航", "Passée le": "下单时间", "Vendu par": "卖家", "Statut": "状态", "En transit vers la douane chinoise": "运输中，前往中国海关", "Informations sur la livraison": "物流信息",
  "Payé": "已付款", "Pris en charge par le transporteur": "快递已取件", "Sorti de la douane française": "已离开法国海关", "En route vers la douane chinoise": "前往中国海关途中", "Arrivée prévue le 12 septembre 2026": "预计 2026 年 9 月 12 日到达",
  "Statut actuel": "当前状态", "Arrivée estimée": "预计到达", "Dernière mise à jour": "最后更新", "Historique": "历史记录", "Transporteur": "承运状态",
  "12 septembre 2026 — en attente d'entrée en douane chinoise": "2026 年 9 月 12 日 — 等待进入中国海关", "1er juillet 2026 — sortie de la douane française": "2026 年 7 月 1 日 — 已离开法国海关", "26 juin 2026 — entrée en douane française": "2026 年 6 月 26 日 — 进入法国海关", "Colis enregistré dans le système": "包裹已录入追踪系统",
  "Informations sur l'objet": "商品信息", "Modèle Peugeot 4002": "标致 4002 模型车", "Photos de l'objet": "商品照片", "Photos disponibles pour cette commande.": "此订单可查看商品照片。",
  "Adresse pour le retrait de la commande": "订单取件地址", "France métropolitaine": "法国本土", "Recevoir l'itinéraire à suivre": "获取路线", "Horaires d'ouverture": "营业时间", "Aujourd'hui, ouvert jusqu'à": "今天营业至",
  "Informations de paiement": "付款信息", "Payé par": "下单人", "Frais de livraison": "运费", "Total de la commande": "订单总额", "Une question sur cette commande ?": "对此订单有疑问？", "Contactez-nous": "联系我们", "6:30 pm": "18:30",
  "5 juin 2026": "2026 年 6 月 5 日", "10 juin 2026 · 15:34": "2026 年 6 月 10 日 · 15:34", "1er juillet 2026": "2026 年 7 月 1 日", "15 octobre 2026": "2026 年 10 月 15 日", "18 octobre 2026": "2026 年 10 月 18 日", "18 octobre 2026 · 18:00": "2026 年 10 月 18 日 · 18:00", "25 octobre 2026": "2026 年 10 月 25 日", "27 octobre 2026 · 15:15": "2026 年 10 月 27 日 · 15:15",
  "EN ROUTE VERS LA DOUANE FRANÇAISE": "前往法国海关", "Citroën DS5 Phase 1 · Norev · 1/18": "雪铁龙 DS5 Phase 1 · Norev · 1/18",
  "CONTRÔLE DOUANIER FRANÇAIS": "法国海关查验中", "Contrôle douanier français": "法国海关查验", "Contrôle douanier français en cours": "法国海关查验中",
  "Le colis a été pris en charge par le transporteur le 7 octobre 2026 à 17:47 et est en route vers la douane française.": "包裹已于 2026 年 10 月 7 日 17:47 由快递取走，正前往法国海关。",
  "Le colis est entré en contrôle douanier français le 16 octobre 2026.": "包裹已于 2026 年 10 月 16 日进入法国海关查验。",
  "Le colis a été pris en charge par le transporteur le 18 octobre 2026 à 18:00 et est en route vers la douane française.": "包裹已于 2026 年 10 月 18 日 18:00 由快递取走，正前往法国海关。",
  "Le colis a été pris en charge par le transporteur le 18 octobre 2026 et est en route vers la douane française.": "包裹已于 2026 年 10 月 18 日由快递取走，正前往法国海关。",
  "Alerte : les récentes grèves en France peuvent affecter les délais globaux de livraison.": "提示：近期法国罢工可能影响整体运输时效。",
  "Le colis a été pris en charge par le transporteur le 27 octobre 2026 à 15:15 et est en route vers la douane française.": "包裹已于 2026 年 10 月 27 日 15:15 由快递取走，正前往法国海关。",
  "En route vers la douane française": "前往法国海关途中", "6 octobre 2026 à 12:50": "2026 年 10 月 6 日 12:50", "6 octobre 2026 · 12:50": "2026 年 10 月 6 日 · 12:50", "7 octobre 2026 · 17:47": "2026 年 10 月 7 日 · 17:47", "En cours": "处理中", "Livré": "已送达", "À venir": "待更新",
  "7 octobre 2026 à 17:47 — pris en charge par le transporteur": "2026 年 10 月 7 日 17:47 — 快递已取件", "Citroën DS5 Phase 1 · Norev": "雪铁龙 DS5 Phase 1 · Norev", "Couleur : Blanche": "颜色：白色", "Échelle : 1/18": "比例：1/18",
  "16 octobre 2026": "2026 年 10 月 16 日", "16 octobre 2026 — entrée en douane française": "2026 年 10 月 16 日 — 进入法国海关",
  "18 octobre 2026 à 18:00 — pris en charge par le transporteur": "2026 年 10 月 18 日 18:00 — 快递已取件", "Volkswagen VW Golf 8 GTI · 1/18": "大众 VW Golf 8 GTI · 1/18", "Volkswagen VW Golf 8 GTI": "大众 VW Golf 8 GTI", "Couleur : Grise": "颜色：灰色",
  "18 octobre 2026 à 10:54 (heure de Paris)": "2026 年 10 月 18 日 10:54（巴黎时间）",
  "27 octobre 2026 à 15:15 — pris en charge par le transporteur": "2026 年 10 月 27 日 15:15 — 快递已取件",
  "Peugeot 4002, photo 1": "标致 4002，照片 1", "Peugeot 4002, photo 2": "标致 4002，照片 2", "Citroën DS5, photo 1": "雪铁龙 DS5，照片 1", "Citroën DS5, photo 2": "雪铁龙 DS5，照片 2", "Citroën DS5, photo 3": "雪铁龙 DS5，照片 3",
  "Citroën DS5 Phase 1 Norev 1/18, blanche": "雪铁龙 DS5 Phase 1 Norev 1/18，白色", "Volkswagen VW Golf 8 GTI 1/18, grise": "大众 VW Golf 8 GTI 1/18，灰色", "Volkswagen Golf 8 GTI, photo 1": "大众 Golf 8 GTI，照片 1", "Volkswagen Golf 8 GTI, photo 2": "大众 Golf 8 GTI，照片 2", "Volkswagen Golf 8 GTI, photo 3": "大众 Golf 8 GTI，照片 3", "Alpine Alpenglow · 1/18": "Alpine Alpenglow · 1/18", "Alpine Alpenglow": "Alpine Alpenglow", "Alpine Alpenglow, photo 1": "Alpine Alpenglow，照片 1", "Alpine Alpenglow, photo 2": "Alpine Alpenglow，照片 2", "Alpine Alpenglow, photo 3": "Alpine Alpenglow，照片 3"
};

const chineseToFrench = Object.fromEntries(Object.entries(frenchToChinese).map(([french, chinese]) => [chinese, french]));

const setLanguage = (language) => {
  const dictionary = language === "zh" ? frenchToChinese : chineseToFrench;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const value = node.nodeValue;
    const trimmed = value.trim();
    if (dictionary[trimmed]) node.nodeValue = value.replace(trimmed, dictionary[trimmed]);
  });

  document.querySelectorAll("[alt], [aria-label]").forEach((element) => {
    ["alt", "aria-label"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]);
    });
  });

  document.title = dictionary[document.title] ?? document.title;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "fr";
  document.body.dataset.language = language;
  languageButton.textContent = language === "zh" ? "FR" : "中文";
  languageButton.setAttribute("aria-label", language === "zh" ? "Passer en français" : "Passer en chinois");

  try { localStorage.setItem("order-language", language); } catch { /* Storage is optional. */ }
};

let activeLanguage = "fr";
try { activeLanguage = localStorage.getItem("order-language") === "zh" ? "zh" : "fr"; } catch { /* Use French. */ }
if (activeLanguage === "zh") setLanguage("zh");

languageButton?.addEventListener("click", () => {
  activeLanguage = document.body.dataset.language === "zh" ? "fr" : "zh";
  setLanguage(activeLanguage);
});

printButton?.addEventListener("click", () => window.print());

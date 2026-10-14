const CONFIG = {
  wa: "905416967790", // WhatsApp sipariş numarası (uluslararası biçim)
  currency: "₺",
  greeting: "Merhaba, sipariş vermek istiyorum:",
  freeShippingFrom: 5000, // bu tutar ve üzeri sepette kargo ücretsiz
  shippingFee: 250, // altındaki sepetlerde kargo ücreti
};

const PRODUCTS = {
  pastirma: { name: "Kastamonu Pastırması", unit: "1 kg", price: 2800, url: "/urun/kastamonu-pastirmasi.html" },
  pastirma_cemensiz: { name: "Kastamonu Pastırması (Çimensiz)", unit: "1 kg", price: 2800, url: "/urun/kastamonu-pastirmasi.html", img: "pastirma" },
  sucuk: { name: "Kastamonu Sucuğu", unit: "1 kg", price: 2000, url: "/urun/kastamonu-sucugu.html" },
  pide: { name: "Kastamonu Pastırmalı İnce Pide (Soğanlı)", unit: "adet", price: 350, url: "/urun/kastamonu-pastirmali-ince-pide.html", note: "Dondurulmuş olarak gönderilir" },
  pide_az_sogan: { name: "Kastamonu Pastırmalı İnce Pide (Az Soğanlı)", unit: "adet", price: 350, url: "/urun/kastamonu-pastirmali-ince-pide.html", img: "pide", note: "Dondurulmuş olarak gönderilir" },
};

const $ = (s) => document.querySelector(s);
// Dokunmatik cihazda wa.me uygulamayı açar; masaüstünde WhatsApp Web sohbet kutusuna doğrudan gider (ara sayfa yok).
const touch = matchMedia("(pointer: coarse)").matches;
const waLink = (text, phone = CONFIG.wa) => {
  const q = encodeURIComponent(text);
  return touch ? `https://wa.me/${phone}?text=${q}` : `https://web.whatsapp.com/send?phone=${phone}&text=${q}`;
};
const fmt = (n) => n.toLocaleString("tr-TR") + " " + CONFIG.currency;

// Sepet "pastirma=2&sucuk=1" biçiminde hem URL'de (paylaşılabilir link) hem localStorage'da tutulur.
function parse(qs) {
  const cart = {};
  for (const [id, v] of new URLSearchParams(qs)) {
    const q = parseInt(v, 10);
    if (PRODUCTS[id] && q > 0) cart[id] = Math.min(q, 99);
  }
  return cart;
}
function stored() {
  try { return localStorage.getItem("cart") || ""; } catch { return ""; }
}
let cart = parse(location.search);
if (!Object.keys(cart).length) cart = parse(stored());

const entries = () => Object.entries(cart).map(([id, qty]) => ({ id, qty, ...PRODUCTS[id] }));
const total = () => entries().reduce((s, p) => s + p.price * p.qty, 0);
// Boş sepette kargo yok; eşik ve üzeri ücretsiz.
const shipping = () => (total() === 0 || total() >= CONFIG.freeShippingFrom ? 0 : CONFIG.shippingFee);
const shippingText = () => (shipping() ? fmt(shipping()) : "Ücretsiz");

function change(id, delta) {
  if (!PRODUCTS[id]) return;
  cart[id] = Math.min((cart[id] || 0) + delta, 99);
  if (cart[id] <= 0) delete cart[id];
  render();
}

function message() {
  const lines = entries().map((p) => `*${p.qty} x ${p.name}*${p.note ? ` (${p.note})` : ""}: ${fmt(p.price * p.qty)}`);
  let msg = `${CONFIG.greeting}\n\n${lines.join("\n")}\n\nAra Toplam: ${fmt(total())}\nKargo: ${shippingText()}\nGenel Toplam: *${fmt(total() + shipping())}*`;
  msg += `\n\nMesafeli Satış Sözleşmesi'ni okudum, kabul ediyorum: ${location.origin}/mesafeli-satis-sozlesmesi.html`;
  return msg;
}

function render() {
  const qs = new URLSearchParams(cart).toString();
  try { localStorage.setItem("cart", qs); } catch {}
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);

  const items = entries();
  const n = items.reduce((s, p) => s + p.qty, 0);
  $("#count").textContent = n;
  $("#bar-count").textContent = n;
  $("#cart").hidden = items.length === 0;
  if (!items.length && $("#cart-panel").open) $("#cart-panel").close();
  for (const t of document.querySelectorAll(".total")) t.textContent = fmt(total() + shipping());
  const left = CONFIG.freeShippingFrom - total();
  const ship = $("#ship");
  ship.classList.toggle("free", !shipping());
  ship.innerHTML = shipping()
    ? `<span class="fee"><small>Kargo</small><b>${fmt(shipping())}</b></span><span class="gap">Ücretsiz kargo için <b>${fmt(left)}</b>'lik ürün daha eklemelisiniz</span>`
    : `<span class="fee"><small>Kargo</small><b>Ücretsiz</b></span>`;

  const list = $("#items");
  list.replaceChildren();
  for (const p of items) {
    const row = $("#row").content.cloneNode(true);
    row.querySelector("li").dataset.id = p.id;
    row.querySelector("img").src = `/assets/img/${p.img || p.id}.webp`;
    row.querySelector("b").textContent = p.name;
    row.querySelector("small").textContent = [p.unit, p.note].filter(Boolean).join(" · ");
    row.querySelector("output").textContent = p.qty;
    row.querySelector(".sum").textContent = fmt(p.price * p.qty);
    list.append(row);
  }
}

for (const el of document.querySelectorAll("[data-price]")) {
  if (PRODUCTS[el.dataset.price]) el.textContent = fmt(PRODUCTS[el.dataset.price].price);
}

for (const a of document.querySelectorAll("header nav a")) {
  if (a.pathname === location.pathname) a.setAttribute("aria-current", "page");
}

for (const a of document.querySelectorAll('a[href^="https://wa.me/"]')) {
  const u = new URL(a.href);
  a.href = waLink(u.searchParams.get("text") || "", u.pathname.slice(1));
}

document.addEventListener("change", (e) => {
  if (e.target.name !== "cemen") return;
  const note = $("#cemen-note");
  if (note) note.hidden = e.target.value !== "pastirma_cemensiz";
});

document.addEventListener("click", async (e) => {
  if (e.target.closest("#menu")) {
    $("#menu").setAttribute("aria-expanded", $("header").classList.toggle("open"));
    return;
  }
  if (e.target.closest("nav a")) $("header").classList.remove("open");
  const add = e.target.closest("[data-add]");
  if (add) {
    const variant = add.closest("div")?.querySelector("input[type=radio]:checked");
    change(variant ? variant.value : add.dataset.add, 1);
    add.dataset.label ||= add.textContent;
    add.textContent = "Sepete eklendi ✓";
    setTimeout(() => (add.textContent = add.dataset.label), 1200);
    return;
  }
  if (e.target.closest("#open-cart") || e.target.closest("#cart-bar")) {
    e.preventDefault();
    if (!entries().length) { location.href = "/urunlerimiz.html"; return; }
    $("#cart-panel").showModal();
    return;
  }
  if (e.target.closest("#cart-close")) { $("#cart-panel").close(); return; }
  if (e.target.closest("#add-more")) {
    if (location.pathname === "/urunlerimiz.html") { e.preventDefault(); $("#cart-panel").close(); }
    return;
  }
  const step = e.target.closest("[data-step]");
  if (step) { change(step.closest("li").dataset.id, +step.dataset.step); return; }
  if (e.target.closest("#send")) {
    open(waLink(message()), "_blank", "noopener");
    return;
  }
  if (e.target.closest("#share")) {
    const url = `${location.origin}/?${new URLSearchParams(cart)}`;
    try {
      if (navigator.share) await navigator.share({ title: "Çimenağa Pastırma sepeti", text: "Sepetime göz at:", url });
      else {
        await navigator.clipboard.writeText(url);
        $("#share").textContent = "Bağlantı panoya kopyalandı ✓";
      }
    } catch {}
  }
});

render();

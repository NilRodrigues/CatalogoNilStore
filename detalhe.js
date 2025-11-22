// ====== CONFIGURAÇÃO ======
const urlParams = new URLSearchParams(window.location.search);
const produtoId = urlParams.get("id");
const PLANILHA_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTeUFccjOnJgo0qkldrvB454NZ8pqvMVabJuPIG4W7aJgxS5oA_9KCeOzxmKnbsOcxqvJcmb976A5pd/pub?gid=0&single=true&output=csv";

// ====== UTILIDADES ======
const fmtBRL = (v) => {
  if (v == null) return "R$ 0,00";

  const raw = String(v).trim();
  if (!raw) return "R$ 0,00";

  // tenta extrair número da string
  let s = raw.replace(/[^\d.,-]/g, "");
  if (!s) return raw; // ex: "A combinar" → mostra o texto puro

  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  const num = Number(s);
  if (Number.isNaN(num)) return raw;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// pega preço com fallback de nomes, caso mude no futuro
const getPrice = (p) => p.price ?? p.Price ?? p.preco ?? "";
const getOldPrice = (p) => p.oldPrice ?? p.priceold ?? p.oldprice ?? "";

function parseCSVLine(line) {
  const result = [];
  let current = "",
    inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < headers.length) continue;

    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });

    items.push(item);
  }

  return items;
}

// ====== RENDERIZAR PRODUTO ======
function renderProduct(p) {
  document.title = `${p.name} - NilStore`;
  document.getElementById("produtoNome").textContent = p.name;
  document.getElementById("produtoNomeDetalhe").textContent = p.name;
  document.getElementById("produtoCategoria").textContent = p.category;
  document.getElementById("produtoCategoriaDetalhe").textContent = p.category;

  // Imagens
  const images = [
    p.image,
    p.image2 || p.image,
    p.image3 || p.image,
    p.image4 || p.image,
    p.image5 || p.image,
  ];

  const mainImage = document.getElementById("mainImage");
  mainImage.src = images[0];
  mainImage.alt = p.name;

  images.forEach((img, index) => {
    const thumbImg = document.getElementById(`thumb${index}`);
    if (thumbImg) {
      thumbImg.src = img;
      thumbImg.alt = `${p.name} - Imagem ${index + 1}`;
    }
  });

  // Preço
  const precoEl = document.getElementById("produtoPreco");
  const price = getPrice(p);
  const oldPrice = getOldPrice(p);

  precoEl.innerHTML = `
    ${oldPrice ? `<del>${fmtBRL(oldPrice)}</del>` : ""}
    <strong>${fmtBRL(price)}</strong>
  `;

  // Descrição
  const descriptionEl = document.getElementById("productDescription");
  if (p.description) {
    descriptionEl.innerHTML = p.description
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");
  } else {
    descriptionEl.innerHTML = `<p>Descrição indisponível.</p>`;
  }

  // Estoque
  const stockQuantityEl = document.querySelector(".stock-quantity");
  if (stockQuantityEl && p.stock) {
    stockQuantityEl.textContent = `Últimas ${p.stock} unidades!`;
  }

  // Especificações técnicas
  const specsBody = document.getElementById("specsTableBody");
  specsBody.innerHTML = `
    <tr><td>Categoria</td><td>${p.category}</td></tr>
    <tr><td>Código do Produto</td><td>${p.productId}</td></tr>
    <tr><td>Disponibilidade</td><td>${p.availability || "Verificar disponibilidade"}</td></tr>
    <tr><td>Garantia</td><td>${p.warranty || "Sem garantia"}</td></tr>
    <tr><td>Envio</td><td>${p.shipping || "Não especificado"}</td></tr>
    <tr><td>Condição</td><td>${p.condition || "Não especificado"}</td></tr>
  `;

  // Botão de compra
  const buyBtn = document.querySelector(".buy-now-btn");

  if (p.ml_url && p.ml_url.trim() !== "") {
    buyBtn.href = p.ml_url.trim();
    buyBtn.textContent = "🛒 Comprar no Mercado Livre";
    buyBtn.onclick = null;
  } else {
    const qty = document.getElementById("quantity").value;
    const message = `Olá! Gostaria de comprar:\n\n*${p.name}*\nQuantidade: ${qty}\nPreço: ${fmtBRL(
      price
    )}`;
    buyBtn.href = `https://wa.me/5519999151713?text=${encodeURIComponent(
      message
    )}`;
    buyBtn.textContent = "💬 Comprar via WhatsApp";
    buyBtn.onclick = null;
  }

  window.produtoAtual = p;

  const spinner = document.getElementById("spinner");
  if (spinner) spinner.classList.remove("show");
}

// ====== CARREGAR PRODUTO ======
async function carregarProduto() {
  if (!produtoId) {
    alert("ID do produto não fornecido.");
    window.location.href = "produtos.html";
    return;
  }

  try {
    const res = await fetch(PLANILHA_CSV);
    const csv = await res.text();
    const produtos = parseCSV(csv);

    const produto = produtos.find(
      (p) => String(p.productId) === String(produtoId)
    );

    if (produto) {
      renderProduct(produto);
    } else {
      alert("Produto não encontrado.");
      window.location.href = "produtos.html";
    }
  } catch (error) {
    console.error("Erro ao carregar produto:", error);
    alert("Erro ao carregar os dados do produto.");
    const spinner = document.getElementById("spinner");
    if (spinner) spinner.classList.remove("show");
  }
}

// ====== DROPDOWN MENU (topo) ======
document.querySelectorAll("[data-dropdown]").forEach((dropdown) => {
  const toggle = dropdown.querySelector(".dropdown-toggle");
  const setOpen = (open) => dropdown.classList.toggle("open", open);

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!dropdown.classList.contains("open"));
  });

  document.addEventListener("click", () => setOpen(false));
});

// ====== CONTROLE DE QUANTIDADE ======
let quantity = 1;
const qtyInput = document.getElementById("quantity");

document.getElementById("increaseQty")?.addEventListener("click", () => {
  if (quantity < 99) {
    quantity++;
    qtyInput.value = quantity;
    updateWhatsAppLink();
  }
});

document.getElementById("decreaseQty")?.addEventListener("click", () => {
  if (quantity > 1) {
    quantity--;
    qtyInput.value = quantity;
    updateWhatsAppLink();
  }
});

function updateWhatsAppLink() {
  if (!window.produtoAtual) return;

  const buyBtn = document.querySelector(".buy-now-btn");
  const p = window.produtoAtual;

  if (!p.ml_url || p.ml_url.trim() === "") {
    const qty = qtyInput.value;
    const price = getPrice(p);
    const message = `Olá! Gostaria de comprar:\n\n*${p.name}*\nQuantidade: ${qty}\nPreço: ${fmtBRL(
      price
    )}`;
    buyBtn.href = `https://wa.me/5519999151713?text=${encodeURIComponent(
      message
    )}`;
  }
}

// ====== GALERIA DE IMAGENS ======
document.querySelectorAll(".thumbnail").forEach((thumb) => {
  thumb.addEventListener("click", () => {
    document
      .querySelectorAll(".thumbnail")
      .forEach((t) => t.classList.remove("active"));
    thumb.classList.add("active");

    const index = thumb.getAttribute("data-index");
    const thumbImg = document.getElementById("thumb" + index);
    document.getElementById("mainImage").src = thumbImg.src;
  });
});

// ====== TABS ======
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetTab = tab.getAttribute("data-tab");

    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(targetTab).classList.add("active");
  });
});

// ====== INICIALIZAÇÃO ======
carregarProduto();

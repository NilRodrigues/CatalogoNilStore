// ====== CONFIGURAÇÃO DO GOOGLE SHEETS ======
const PRODUCTS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTeUFccjOnJgo0qkldrvB454NZ8pqvMVabJuPIG4W7aJgxS5oA_9KCeOzxmKnbsOcxqvJcmb976A5pd/pub?gid=0&single=true&output=csv';

// Estado global
let allProducts = [];

// ====== INICIALIZAÇÃO DO SPINNER ======
window.addEventListener('load', () => {
  const spinner = document.getElementById('spinner');
  if (spinner) {
    setTimeout(() => {
      spinner.classList.remove('show');
    }, 300);
  }
});

// ====== DROPDOWNS (topbar) ======
document.querySelectorAll('[data-dropdown]').forEach((drop) => {
  const toggle = drop.querySelector('.dropdown-toggle');
  const menu = drop.querySelector('.dropdown-menu');
  const setOpen = (open) => {
    drop.classList.toggle('open', open);
    drop.setAttribute('aria-expanded', String(open));
  };
  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!drop.classList.contains('open'));
  });
  document.addEventListener('click', () => setOpen(false));
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
});

// ====== BACK TO TOP ======
const backTop = document.querySelector('.back-to-top');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    backTop?.classList.add('show');
  } else {
    backTop?.classList.remove('show');
  }
});
backTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ====== TOGGLE CATEGORIAS ======
const catToggle = document.querySelector('.cat-toggle');
const catList = document.getElementById('catList');

catToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = catList.hasAttribute('hidden');

  if (isHidden) {
    catList.removeAttribute('hidden');
    catToggle.setAttribute('aria-expanded', 'true');
  } else {
    catList.setAttribute('hidden', '');
    catToggle.setAttribute('aria-expanded', 'false');
  }
});

// Fechar ao clicar fora
document.addEventListener('click', (e) => {
  if (!e.target.closest('.categories')) {
    catToggle?.setAttribute('aria-expanded', 'false');
    catList?.setAttribute('hidden', '');
  }
});

// ====== NORMALIZAÇÃO E MAPA DE CATEGORIAS ======
const normalizeCategory = (str) =>
  (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// chave = data-category do HTML
const CATEGORY_ALIASES = {
  acessorios: ['acessorios'],
  'action-figures': ['action figures', 'action figure'],
  trofeus: ['trofeus', 'trofeu', 'troféus', 'troféu'],
  decoracoes: ['decoracao', 'decoracoes'],
  colecionaveis: ['colecionaveis', 'colecionavel', 'colecionáveis'],
  miniaturas: ['miniaturas', 'miniatura'],
};

// Filtrar produtos por categoria (menu de categorias)
catList?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const categoryKey = link.dataset.category;

    document
      .querySelectorAll('.filter-btn')
      .forEach((btn) => btn.classList.remove('active'));

    filterProductsByCategory(categoryKey);

    catList.setAttribute('hidden', '');
    catToggle?.setAttribute('aria-expanded', 'false');
  });
});

function filterProductsByCategory(categoryKey) {
  const cards = document.querySelectorAll('.product-card');
  const emptyMsg = document.getElementById('emptyMessage');
  const heroP = document.querySelector('.hero p');

  if (!cards.length) return;

  const keyNorm = normalizeCategory(categoryKey);
  const aliases = CATEGORY_ALIASES[keyNorm] || [keyNorm];

  let visibleCount = 0;

  cards.forEach((card) => {
    const productCategoryText =
      card.querySelector('.product-category')?.textContent || '';
    const productCategoryNorm = normalizeCategory(productCategoryText);

    const shouldShow = aliases.some((alias) =>
      productCategoryNorm.includes(normalizeCategory(alias)),
    );

    if (shouldShow) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  if (heroP) {
    heroP.textContent = `${visibleCount} produtos`;
  }

  if (emptyMsg) {
    emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}

// Atualiza contadores dinâmicos das categorias
function updateCategoryCounts() {
  if (!catList || !allProducts.length) return;

  const items = catList.querySelectorAll('li');

  items.forEach((li) => {
    const link = li.querySelector('a');
    const span = li.querySelector('span');
    if (!link || !span) return;

    const key = link.dataset.category;
    const keyNorm = normalizeCategory(key);
    const aliases = CATEGORY_ALIASES[keyNorm] || [keyNorm];

    const count = allProducts.reduce((acc, p) => {
      const prodCatNorm = normalizeCategory(p.category || p.Category || '');
      if (!prodCatNorm) return acc;

      const match = aliases.some((alias) =>
        prodCatNorm.includes(normalizeCategory(alias)),
      );
      return match ? acc + 1 : acc;
    }, 0);

    span.textContent = count;
  });
}

// ====== UTILIDADES ======
const fmtBRL = (v) => {
  if (v == null) return 'R$ 0,00';

  const raw = String(v).trim();
  if (!raw) return 'R$ 0,00';

  // tenta extrair número da string
  let s = raw.replace(/[^\d.,-]/g, '');
  if (!s) return raw; // ex: "A combinar" → retorna texto puro

  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const num = Number(s);
  if (Number.isNaN(num)) return raw;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

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
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
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
      item[header] = values[index] || '';
    });
    items.push(item);
  }

  return items;
}

// ====== RENDERIZAR PRODUTOS ======
async function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  const emptyMsg = document.getElementById('emptyMessage');

  if (!grid) return;

  const heroP = document.querySelector('.hero p');
  if (heroP && products && products.length > 0) {
    heroP.textContent = `${products.length} produtos`;
  }

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="loading-message">
        <p>Nenhum produto encontrado.</p>
      </div>
    `;
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';
  grid.innerHTML = '';

  products.forEach((p) => {
    const oldPriceHTML =
      p.oldPrice && parseFloat(p.oldPrice) > 0
        ? `<del>${fmtBRL(p.oldPrice)}</del>`
        : '';

    const tags = (p.tags || '').toLowerCase();
    let badgeHTML = '';
    if (tags.includes('new')) {
      badgeHTML = '<div class="product-badge new">NEW</div>';
    } else if (tags.includes('featured')) {
      badgeHTML = '<div class="product-badge preorder">PRÉ-ORDEM</div>';
    }

    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.tags = p.tags || 'all';

    const numericPrice = parseFloat(p.price);
    card.dataset.price = Number.isNaN(numericPrice) ? 0 : numericPrice;
    card.dataset.name = p.name || '';
    card.dataset.productId = p.productId;

    card.innerHTML = `
      <div class="product-image">
        ${badgeHTML}
        <a href="produtodetalhe.html?id=${encodeURIComponent(p.productId)}">
          <img src="${
            p.image ||
            'https://via.placeholder.com/400x300?text=Sem+Imagem'
          }" 
               alt="${p.name || 'Produto'}"
               onerror="this.src='https://via.placeholder.com/400x300?text=Erro'">
        </a>
      </div>
      <div class="product-info">
        <span class="product-category">${p.category || 'Categoria'}</span>
        <h3 class="product-name">
          <a href="produtodetalhe.html?id=${encodeURIComponent(p.productId)}">
            ${p.name || 'Nome do Produto'}
          </a>
        </h3>
        <div class="product-price">
          ${oldPriceHTML}
          <strong>${fmtBRL(p.price)}</strong>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// ====== FILTROS (tags: all/new/featured/top) ======
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    filterProducts(filter);
  });
});

function filterProducts(filter) {
  const cards = document.querySelectorAll('.product-card');
  const heroP = document.querySelector('.hero p');
  const emptyMsg = document.getElementById('emptyMessage');

  let visibleCount = 0;

  cards.forEach((card) => {
    const tags = card.dataset.tags || '';
    const shouldShow = filter === 'all' || tags.includes(filter);

    if (shouldShow) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  if (heroP) {
    heroP.textContent = `${visibleCount} produtos`;
  }

  if (emptyMsg) {
    emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}

// ====== ORDENAÇÃO ======
const sortSelect = document.getElementById('sortSelect');
sortSelect?.addEventListener('change', (e) => {
  const sortType = e.target.value;
  if (sortType) {
    sortProducts(sortType);
  }
});

function sortProducts(sortType) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.product-card'));

  cards.sort((a, b) => {
    switch (sortType) {
      case 'name-asc':
        return a.dataset.name.localeCompare(b.dataset.name);
      case 'name-desc':
        return b.dataset.name.localeCompare(a.dataset.name);
      case 'price-asc':
        return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
      case 'price-desc':
        return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
      default:
        return 0;
    }
  });

  cards.forEach((card) => grid.appendChild(card));
}

// ====== BUSCA ======
function setupSearch() {
  const searchBox = document.querySelector('.ml-search');
  if (!searchBox) return;

  const input = searchBox.querySelector('input');
  const button = searchBox.querySelector('.ml-btn');
  if (!input || !button) return;

  const doSearch = () => {
    if (!allProducts || !allProducts.length) return;

    const term = input.value.trim().toLowerCase();

    if (!term) {
      renderProducts(allProducts);
      return;
    }

    const filtered = allProducts.filter((p) => {
      const text = [
        p.name || '',
        p.category || '',
        p.description || '',
        p.tags || '',
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(term);
    });

    renderProducts(filtered);
  };

  button.addEventListener('click', (e) => {
    e.preventDefault();
    doSearch();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  });
}

// ====== CARREGAR PRODUTOS DO GOOGLE SHEETS ======
async function loadProducts() {
  console.log('🔄 Carregando produtos do Google Sheets...');

  const spinner = document.getElementById('spinner');
  if (spinner) spinner.classList.add('show');

  try {
    const response = await fetch(PRODUCTS_URL);

    if (!response.ok) {
      throw new Error('Erro ao carregar produtos');
    }

    const csvText = await response.text();
    allProducts = parseCSV(csvText);

    console.log(`✅ ${allProducts.length} produtos carregados`);
    await renderProducts(allProducts);
    updateCategoryCounts();
  } catch (error) {
    console.error('❌ Erro ao carregar produtos:', error);

    const grid = document.getElementById('productsGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="loading-message">
          <p style="color: #e74c3c;">
            ⚠️ Erro ao carregar produtos do Google Sheets.<br><br>
            <strong>Passos para corrigir:</strong><br>
            1. Abra sua planilha no Google Sheets<br>
            2. Vá em <strong>Arquivo → Compartilhar → Publicar na Web</strong><br>
            3. Escolha <strong>"Documento inteiro"</strong><br>
            4. Clique em <strong>Publicar</strong><br>
            5. Recarregue esta página (F5)<br><br>
            <small>Erro técnico: ${error.message}</small>
          </p>
        </div>
      `;
    }
  } finally {
    if (spinner) {
      setTimeout(() => {
        spinner.classList.remove('show');
      }, 500);
    }
  }
}

// ====== INICIALIZAÇÃO ======
loadProducts();
setupSearch();

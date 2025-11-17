// ====== CONFIGURAÇÃO DO GOOGLE SHEETS ======
const PRODUCTS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTeUFccjOnJgo0qkldrvB454NZ8pqvMVabJuPIG4W7aJgxS5oA_9KCeOzxmKnbsOcxqvJcmb976A5pd/pub?gid=0&single=true&output=csv';

// Estado global
let allProducts = [];

// ====== INICIALIZAÇÃO ======
window.addEventListener('load', () => {
  const spinner = document.getElementById('spinner');
  if (spinner) {
    setTimeout(() => {
      spinner.classList.remove('show');
    }, 300);
  }
});

// ====== DROPDOWNS (topbar) ======
document.querySelectorAll('[data-dropdown]').forEach(drop => {
  const toggle = drop.querySelector('.dropdown-toggle');
  const menu = drop.querySelector('.dropdown-menu');
  const setOpen = (open) => {
    drop.classList.toggle('open', open);
    drop.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', (e) => {
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

catToggle?.addEventListener('click', () => {
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

// Filtrar produtos por categoria
catList?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const category = link.dataset.category;
    
    // Remover active de todos os filtros
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    filterProductsByCategory(category);
  });
});

function filterProductsByCategory(category) {
  const cards = document.querySelectorAll('.product-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const productCategory = card.querySelector('.product-category')?.textContent.toLowerCase() || '';
    const shouldShow = productCategory.includes(category);
    
    if (shouldShow) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // Atualizar contador no hero
  const heroP = document.querySelector('.hero p');
  if (heroP) {
    heroP.textContent = `${visibleCount} produtos`;
  }

  // Mostrar mensagem se nenhum produto foi encontrado
  const emptyMsg = document.getElementById('emptyMessage');
  if (visibleCount === 0) {
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
  }
}

// ====== UTILIDADES ======
const fmtBRL = (v) => {
  const num = parseFloat(v);
  if (isNaN(num)) return 'R$ 0,00';
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
  
  // Atualizar contador no hero
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
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';
  grid.innerHTML = '';

  products.forEach((p) => {
    const oldPriceHTML = p.oldPrice && parseFloat(p.oldPrice) > 0 
      ? `<del>${fmtBRL(p.oldPrice)}</del>` 
      : '';

    // Determinar badge
    let badgeHTML = '';
    const tags = (p.tags || '').toLowerCase();
    if (tags.includes('new')) {
      badgeHTML = '<div class="product-badge new">NEW</div>';
    } else if (tags.includes('featured')) {
      badgeHTML = '<div class="product-badge preorder">PRÉ-ORDEM</div>';
    }

    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.tags = p.tags || 'all';
    card.dataset.price = p.price || 0;
    card.dataset.name = p.name || '';
    card.dataset.productId = p.productId;

    card.innerHTML = `
      <div class="product-image">
        ${badgeHTML}
        <a href="produtodetalhe.html?id=${encodeURIComponent(p.productId)}">
          <img src="${p.image || 'https://via.placeholder.com/400x300?text=Sem+Imagem'}" 
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
          <strong>${fmtBRL(p.price || 0)}</strong>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// ====== FILTROS ======
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const filter = btn.dataset.filter;
    filterProducts(filter);
  });
});

function filterProducts(filter) {
  const cards = document.querySelectorAll('.product-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const tags = card.dataset.tags || '';
    const shouldShow = filter === 'all' || tags.includes(filter);
    
    if (shouldShow) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // Atualizar contador no hero
  const heroP = document.querySelector('.hero p');
  if (heroP) {
    heroP.textContent = `${visibleCount} produtos`;
  }

  // Mostrar mensagem se nenhum produto foi encontrado
  const emptyMsg = document.getElementById('emptyMessage');
  if (visibleCount === 0) {
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
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

  // Reordenar no DOM
  cards.forEach(card => grid.appendChild(card));
}

// ====== CARREGAR PRODUTOS DO GOOGLE SHEETS ======
async function loadProducts() {
  console.log('📄 Carregando produtos do Google Sheets...');
  
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
/* ==========================================================================
   SCRIPT PRINCIPAL DO SITE (main.js)
   --------------------------------------------------------------------------
   Este arquivo controla todas as interações da página:
   - Carregamento dinâmico de produtos do Google Sheets
   - Lógica do carrossel (automático e manual)
   - Interatividade da navbar, dropdowns, tabs e botões
   - Sistema de atualização automática a cada 3 minutos
   ========================================================================== */


/* ==========================================================================
   🔗 CONFIGURAÇÃO DO GOOGLE SHEETS
   --------------------------------------------------------------------------
   URL da planilha publicada no Google Sheets exportada como CSV.
   Colunas: productId, name, category, price, oldPrice, image, kicker, 
            description, buttonText, tags, discount
   ========================================================================== */
const PRODUCTS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTeUFccjOnJgo0qkldrvB454NZ8pqvMVabJuPIG4W7aJgxS5oA_9KCeOzxmKnbsOcxqvJcmb976A5pd/pub?gid=0&single=true&output=csv';

/* ==========================================================================
   🖼️ GERADOR DE PLACEHOLDER SVG (Evita problemas de CORS)
   ========================================================================== */
const createPlaceholder = (width, height, text) => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect fill='%23f0f0f0' width='${width}' height='${height}'/%3E%3Ctext x='50%25' y='50%25' font-size='16' text-anchor='middle' fill='%23666'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
};

/* ==========================================================================
   💰 FORMATAÇÃO DE MOEDAS E CSV PARSER
   --------------------------------------------------------------------------
   fmtBRL() → converte número para formato BRL
   parseCSV() → lê um CSV em texto e transforma em lista de objetos
   parseCSVLine() → faz o parsing de cada linha (com suporte a aspas)
   ========================================================================== */
const fmtBRL = (v) => {
  const num = parseFloat(v);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// ============================
// CONVERSOR DE CSV PARA OBJETO
// ============================
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
      item[header] = values[index] || '';
    });
    items.push(item);
  }

  return items;
}

/* Parser de linha com suporte a valores entre aspas e vírgulas internas */
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

/* ==========================================================================
   🌀 SPINNER (Animação de carregamento)
   --------------------------------------------------------------------------
   Ao carregar a página, o spinner desaparece, sinalizando o fim do preload.
   ========================================================================== */
window.addEventListener('load', () => {
  const spinner = document.getElementById('spinner');
  if (spinner) spinner.classList.remove('show');
});


/* ==========================================================================
   📽 DROPDOWN DA TOPBAR
   --------------------------------------------------------------------------
   - Gerencia menus suspensos (por exemplo, menu de usuário ou idiomas)
   - Fecha automaticamente ao clicar fora ou pressionar ESC
   ========================================================================== */
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


/* ==========================================================================
   📱 TOGGLE DA NAVBAR (modo mobile)
   --------------------------------------------------------------------------
   Exibe ou oculta o menu principal no celular ao clicar no botão hambúrguer.
   ========================================================================== */
const navToggle = document.querySelector('.nav-toggle');
const primaryNav = document.getElementById('primaryNav');
if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    primaryNav.hidden = expanded;
  });
}


/* ==========================================================================
   🗂️ DROPDOWN DE "PAGES" NA NAVBAR
   --------------------------------------------------------------------------
   Permite abrir submenus dentro da navbar, mantendo acessibilidade.
   ========================================================================== */
const pagesToggle = document.querySelector('.has-dropdown .linklike');
const pagesItem = pagesToggle?.closest('.has-dropdown');
if (pagesToggle && pagesItem) {
  pagesToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = pagesItem.getAttribute('aria-expanded') === 'true';
    pagesItem.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', () => pagesItem.setAttribute('aria-expanded','false'));
}


/* ==========================================================================
   ⬆️ BOTÃO "BACK TO TOP"
   --------------------------------------------------------------------------
   Mostra o botão ao rolar 300px e rola suavemente para o topo ao clicar.
   ========================================================================== */
const backTop = document.querySelector('.back-to-top');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) backTop?.classList.add('show');
  else backTop?.classList.remove('show');
});
backTop?.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

// Suaviza a troca dos produtos
function updateProductFilter(filter) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  // Aplica fade-out
  grid.classList.add('fade-out');

  setTimeout(() => {
    // Aqui chama sua função atual de filtragem
    renderProducts(filteredProducts);

    // Retira fade-out (retorna com fade-in)
    grid.classList.remove('fade-out');
  }, 900);
}


/* ==========================================================================
   🧩 TABS (Filtros de produtos)
   --------------------------------------------------------------------------
   Cada aba corresponde a uma categoria ("all", "new", "featured", etc).
   Ao clicar, apenas produtos com o tag correspondente permanecem visíveis.
   ========================================================================== */
const tabs = document.querySelectorAll('.tab');
const grid = document.getElementById('productGrid');
if (tabs.length && grid) {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const key = tab.dataset.tab;
      grid.dataset.active = key;
      grid.querySelectorAll('.product-card').forEach(card => {
        const tags = card.dataset.tags || '';
        card.style.display = tags.includes(key) || key === 'all' ? '' : 'none';
      });
    });
  });
}



/* ==========================================================================
   📂 TOGGLE DE CATEGORIAS
   --------------------------------------------------------------------------
   Abre/fecha a lista lateral de categorias e oculta ao clicar fora.
   Também adiciona efeito de esconder a navbar ao rolar para baixo.
   ========================================================================== */
(function() {
  const catToggle = document.querySelector('.cat-toggle');
  const catList = document.getElementById('catList');
  if (!catToggle || !catList) return;

  // Abrir/fechar categorias
  catToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = catToggle.getAttribute('aria-expanded') === 'true';
    catToggle.setAttribute('aria-expanded', !isExpanded);
    catList.hidden = isExpanded;
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.categories')) {
      catToggle.setAttribute('aria-expanded', 'false');
      catList.hidden = true;
    }
  });

  // Efeito "navbar retrátil"
  let lastScroll = 0;
  const navbar = document.querySelector('.navwrap');
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > lastScroll && currentScroll > 100) {
      navbar.style.transform = 'translateY(-100%)';
    } else {
      navbar.style.transform = 'translateY(0)';
    }
    lastScroll = currentScroll;
  });
})();


/* ==========================================================================
   🎠 CAROUSEL SLIDER
   --------------------------------------------------------------------------
   Controla slides automáticos e manuais, botões de navegação, dots e swipe.
   initSlider() é chamado após renderCarousel().
   ========================================================================== */
let sliderInstance = null;

function initSlider() {
  const root = document.querySelector('[data-slider]');
  if (!root) return;
  
  const slidesWrap = root.querySelector('.slides');
  const slides = Array.from(root.querySelectorAll('.slide'));
  const prev = root.querySelector('.prev');
  const next = root.querySelector('.next');
  const dotsWrap = root.querySelector('.dots');
  if (slides.length === 0) return;
  
  let idx = 0;
  let timer = null;
  const DURATION = 5000;

  function go(i){ idx = (i + slides.length) % slides.length; slidesWrap.style.transform = `translateX(-${idx * 100}%)`; updateDots(); }
  function nextSlide(){ go(idx + 1); }
  function prevSlide(){ go(idx - 1); }
  function play(){ stop(); timer = setInterval(nextSlide, DURATION); }
  function stop(){ if (timer) clearInterval(timer); }

  dotsWrap.innerHTML = '';
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role','tab');
    b.setAttribute('aria-label',`Go to slide ${i+1}`);
    b.addEventListener('click', () => { go(i); play(); });
    dotsWrap.appendChild(b);
  });
  
  function updateDots(){
    dotsWrap.querySelectorAll('button').forEach((b,i)=>{
      b.setAttribute('aria-selected', String(i===idx));
    });
  }

  next.addEventListener('click', () => { nextSlide(); play(); });
  prev.addEventListener('click', () => { prevSlide(); play(); });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', play);

  let startX = 0;
  slidesWrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; stop(); }, {passive:true});
  slidesWrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50){ dx<0 ? nextSlide() : prevSlide(); }
    play();
  }, {passive:true});

  go(0); play();
  sliderInstance = { go, play, stop };
}


/* ==========================================================================
   🖼️ RENDERIZAÇÃO DOS CONTEÚDOS
   --------------------------------------------------------------------------
   Funções para injetar HTML dinamicamente nas seções:
   - renderCarousel() - usa produtos com tag "carousel"
   - renderPromoCard() - primeiro produto com tag "promo"
   - renderOfferBanners() - dois primeiros produtos com tag "offer"
   - renderProducts() - todos os produtos
   ========================================================================== */

// ============================
// RENDERIZAR CARROSSEL
// ============================
function renderCarousel(data) {
  const slidesContainer = document.querySelector(".slides");
  if (!slidesContainer) return;

  slidesContainer.innerHTML = "";

  // Filtrar produtos que contêm "carousel" nas tags (case insensitive)
  const carouselItems = data.filter((p) => {
    const tags = (p.tags || '').toLowerCase();
    return tags.includes("carousel");
  });

  if (carouselItems.length === 0) {
    slidesContainer.innerHTML = `
      <article class="slide">
        <div class="slide-media">
          <img src="${createPlaceholder(600, 400, 'Sem Produtos no Carrossel')}" alt="Placeholder">
        </div>
        <div class="slide-content">
          <h4 class="kicker">Configure sua planilha</h4>
          <h2>Adicione produtos com tag "carousel"</h2>
          <p>Para exibir produtos no carrossel, adicione a tag "carousel" na coluna tags.</p>
        </div>
      </article>`;
    initSlider();
    return;
  }

  carouselItems.forEach((p) => {
    const priceHTML = `
      <div class="carousel-price">
        ${p.oldPrice ? `<del>${fmtBRL(p.oldPrice)}</del>` : ""}
        <strong>${fmtBRL(p.price)}</strong>
        ${p.discount ? `<span class="discount">(${p.discount})</span>` : ""}
      </div>`;

    const buttonClass = p.buttonText?.toLowerCase().includes("comprar")
        ? "btn primary blue-btn"
        : "btn primary";

    slidesContainer.insertAdjacentHTML(
      "beforeend",
      `
      <article class="slide">
        <div class="slide-media">
          <img src="${p.image || createPlaceholder(600, 400, 'Sem Imagem')}" 
               alt="${p.name}" 
               onerror="this.src='${createPlaceholder(600, 400, 'Erro ao Carregar')}'">
        </div>
        <div class="slide-content">
          <h4 class="kicker">${p.kicker || ""}</h4>
          <h2>${p.name || ""}</h2>
          <p>${p.description || ""}</p>
          ${priceHTML}
          <a class="${buttonClass}" href="produtodetalhe.html?id=${encodeURIComponent(p.productId)}">${p.buttonText || "Saiba Mais"}</a>
        </div>
      </article>`
    );
  });

  initSlider();
}


// ============================
// RENDERIZAR CARD PROMOCIONAL LATERAL
// ============================
function renderPromoCard(data) {
  const promoSection = document.querySelector('.promo');
  if (!promoSection) {
    console.warn('⚠️ Elemento .promo não encontrado no HTML');
    return;
  }

  // 🔹 Corrigir o filtro: procura 'promo' dentro da lista de tags, mesmo com espaços
  const promo = data.find(p => {
    if (!p.tags) return false;
    return p.tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .includes('promo');
  });

  // 🔹 Se não encontrar nenhum produto com tag "promo"
  if (!promo) {
    promoSection.innerHTML = `
      <div class="promo-image">
        <img src="${createPlaceholder(400, 300, 'Card Promocional')}" alt="Promo" />
        <div class="promo-badge">
          <span class="save">Configure</span>
          <span class="title">Adicione tag "promo"</span>
        </div>
      </div>
      <div class="promo-content">
        <a href="#" class="category">Categoria</a>
        <a href="#" class="name">Produto Promocional</a>
        <div class="price"><strong>R$ 0,00</strong></div>
      </div>
    `;
    return;
  }

  // 🔹 Validar se a imagem existe
  if (!promo.image || promo.image.trim() === '') {
    console.error('❌ Produto promo não tem URL de imagem!');
  }

  // 🔹 Garante link funcional
  const linkHref = promo.productId
    ? `produtodetalhe.html?id=${encodeURIComponent(promo.productId)}`
    : '#';

  // 🔹 Monta o card final
  promoSection.innerHTML = `
    <a href="${linkHref}" class="promo-link">
      <div class="promo-image">
        <img src="${promo.image}" 
             alt="${promo.name}" 
             onerror="this.src='${createPlaceholder(400, 300, 'Imagem Indisponível')}'">
        <div class="promo-badge">
          <span class="save">${promo.discount || 'OFERTA'}</span>
          <span class="title">Oferta Especial</span>
        </div>
      </div>
      <div class="promo-content">
        <span class="category">${promo.category}</span>
        <span class="name">${promo.name}</span>
        <div class="price">
          ${promo.oldPrice && parseFloat(promo.oldPrice) > 0 ? `<del>${fmtBRL(promo.oldPrice)}</del>` : ''}
          <strong>${fmtBRL(promo.price)}</strong>
        </div>
      </div>
    </a>
  `;
}


// ============================
// RENDERIZAR BANNERS DE OFERTAS
// ============================
function renderOfferBanners(data) {
  const offerGrid = document.querySelector('.offer-grid');
  if (!offerGrid) return;

  // Filtrar produtos que contêm "offer" nas tags (case insensitive)
  const offers = data.filter(p => {
    const tags = (p.tags || '').toLowerCase();
    return tags.includes("offer");
  }).slice(0, 2);

  offerGrid.innerHTML = '';

  const b1 = offers[0] || {};
  const b2 = offers[1] || {};

  const link1 = b1.productId ? `produtodetalhe.html?id=${encodeURIComponent(b1.productId)}` : '#';
  const link2 = b2.productId ? `produtodetalhe.html?id=${encodeURIComponent(b2.productId)}` : '#';

  // Primeiro Banner (b1) - Usa a coluna "image" da planilha
  offerGrid.insertAdjacentHTML('beforeend', `
    <a class="offer card" href="${link1}">
      <div>
        <p class="muted">${b1.kicker || 'Encontre a melhor impressão 3D para você!'}</p>
        <h3>${b1.name || 'Produto'}</h3>
        <h1 class="huge">${b1.discount || '40%'} <span>Off</span></h1>
      </div>
      <img src="${b1.image || createPlaceholder(220, 140, 'Sem Imagem')}" 
           alt="${b1.name || 'Oferta'}" 
           onerror="this.src='${createPlaceholder(220, 140, 'Erro')}'">
    </a>`);

  // Segundo Banner (b2) - Usa a coluna "image" da planilha
  offerGrid.insertAdjacentHTML('beforeend', `
    <a class="offer card" href="${link2}">
      <div>
        <p class="muted">${b2.kicker || 'Encontre a melhor decoração para você!'}</p>
        <h3>${b2.name || 'Produto'}</h3>
        <h1 class="huge">${b2.discount || '20%'} <span>Off</span></h1>
      </div>
      <img src="${b2.image || createPlaceholder(220, 140, 'Sem Imagem')}" 
           alt="${b2.name || 'Oferta'}" 
           onerror="this.src='${createPlaceholder(220, 140, 'Erro')}'">
    </a>`);
}


/* ==========================================================================
   🛒 PRODUTOS (Grid principal)
   --------------------------------------------------------------------------
   - Renderiza cada item vindo do Google Sheets como card completo
   - Adiciona link para página de detalhes usando o productId
   ========================================================================== */
function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = '';
  if (!products || products.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px;"><p style="color: #666;">Nenhum produto encontrado.</p></div>`;
    return;
  }

  products.forEach((p) => {
    const oldPriceHTML = p.oldPrice && parseFloat(p.oldPrice) > 0 ? `<del>${fmtBRL(p.oldPrice)}</del>` : '';
    
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.tags = p.tags || 'all';
    card.dataset.price = p.price || 0;
    card.dataset.name = p.name || '';
    card.dataset.productId = p.productId;
    
    card.innerHTML = `
      <a href="produtodetalhe.html?id=${encodeURIComponent(p.productId)}" class="product-link">
        <div class="product-image">
          <img src="${p.image || createPlaceholder(400, 300, 'Sem Imagem')}" 
               alt="${p.name || 'Produto'}" 
               onerror="this.src='${createPlaceholder(400, 300, 'Erro')}'">
        </div>
        <div class="product-info">
          <span class="product-category">${p.category || 'Categoria'}</span>
          <h3 class="product-name">${p.name || 'Nome do Produto'}</h3>
          <div class="product-price">
            ${oldPriceHTML}
            <strong>${fmtBRL(p.price || 0)}</strong>
          </div>
        </div>
      </a>`;
    
    grid.appendChild(card);
  });
}


/* ==========================================================================
   ☁️ CARREGAR CONTEÚDO DO GOOGLE SHEETS
   --------------------------------------------------------------------------
   - Busca dados da planilha
   - Renderiza cada seção de forma independente
   - Exibe mensagens de erro em caso de falha
   ========================================================================== */
async function loadAllContent() {
  try {
    console.log('📄 Carregando dados do Google Sheets...');
    
    const response = await fetch(PRODUCTS_URL);
    const csv = await response.text();
    const data = parseCSV(csv);
    
    console.log('✅ Total de produtos carregados:', data.length);
    console.log('📦 Dados completos:', data);
    
    // Debug: mostrar quantos produtos têm cada tag
    const carouselCount = data.filter(p => (p.tags || '').toLowerCase().includes('carousel')).length;
    const featuredCount = data.filter(p => (p.tags || '').toLowerCase().includes('featured')).length;
    const promoCount = data.filter(p => (p.tags || '').toLowerCase().includes('promo')).length;
    const offerCount = data.filter(p => (p.tags || '').toLowerCase().includes('offer')).length;
    
    console.log('🏷️ Produtos com tag "carousel":', carouselCount);
    console.log('🏷️ Produtos com tag "featured":', featuredCount);
    console.log('🏷️ Produtos com tag "promo":', promoCount);
    console.log('🏷️ Produtos com tag "offer":', offerCount);
    
    renderCarousel(data);
    renderPromoCard(data);
    renderOfferBanners(data);
    renderProducts(data);
    
    console.log('✨ Todas as seções renderizadas com sucesso!');
    
  } catch (err) {
    console.error("❌ Erro ao carregar dados:", err);
  }
}

/* ==========================================================================
   🚀 INICIALIZAÇÃO
   ========================================================================== */
// Executar ao iniciar
loadAllContent();

// Atualizar automaticamente a cada 3 minutos
setInterval(loadAllContent, 180000);
// js/menu.js

(function configurarSistema() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    const basePath = container.getAttribute('data-path') || './';
    let currentPage = window.location.pathname.split('/').pop();

    if (currentPage === '' || currentPage === '/') currentPage = 'index.html';

    // --- INJEÇÃO AUTOMÁTICA DO FAVICON ---
    if (!document.querySelector("link[rel='icon']")) {
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        favicon.href = `${basePath}img/icon.png`;
        document.head.appendChild(favicon);
    }

    const menuHTML = `
        <nav class="sidebar">
            <div class="logo-area" style="display: flex; justify-content: center; align-items: center; padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px;">
                <img src="${basePath}img/logo.png" alt="Logo" style="height: 55px; width: auto; object-fit: contain;">
            </div>
            <a href="${basePath}index.html" class="menu-item ${currentPage === 'index.html' ? 'active' : ''}">
                <span class="material-icons-round">dashboard</span> Visão geral
            </a>
            <a href="${basePath}pages/campanhas.html" class="menu-item ${currentPage === 'campanhas.html' ? 'active' : ''}">
                <span class="material-icons-round">campaign</span> Campanhas
            </a>
            <a href="${basePath}pages/celulares.html" class="menu-item ${currentPage === 'celulares.html' ? 'active' : ''}">
                <span class="material-icons-round">phone_android</span> Chips
            </a>
            <a href="${basePath}pages/analytics.html" class="menu-item ${currentPage === 'analytics.html' ? 'active' : ''}">
                <span class="material-icons-round">analytics</span> Métricas & Gráficos
            </a>
            <a href="${basePath}pages/mapa.html" class="menu-item ${currentPage === 'mapa.html' ? 'active' : ''}">
                <span class="material-icons-round">grid_view</span> Mapa de Aparelhos
            </a>
            <a href="${basePath}pages/api.html" class="menu-item ${currentPage === 'api.html' ? 'active' : ''}">
                <span class="material-icons-round">hub</span> Webhook & Integrações
            </a>
        </nav>
    `;

    // Injeta o menu imediatamente
    container.outerHTML = menuHTML;

    // --- INJEÇÃO AUTOMÁTICA DO TÍTULO GLOBAL E DO RODAPÉ ---
    function injetarElementosGlobais() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        // 1. Injeta o Título H1 no topo absoluto do conteúdo principal
        if (!document.querySelector('.sistema-titulo-global')) {
            const tituloGlobal = document.createElement('h1');
            tituloGlobal.className = 'sistema-titulo-global';
            tituloGlobal.innerText = 'Controle De Números e Celulares';
            tituloGlobal.style.cssText = "font-size: 22px; color: var(--texto-claro); margin: 30px 40px 0 40px; font-weight: bold; letter-spacing: 0.5px; display: flex; align-items: center; gap: 10px;";

            // Adiciona um ícone decorativo elegante ao lado do título
            tituloGlobal.innerHTML = `<span class="material-icons-round" style="color: var(--laranja-brabo); font-size: 26px;">verified</span> Controle De Números e Celulares`;

            mainContent.insertBefore(tituloGlobal, mainContent.firstChild);
        }

    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injetarElementosGlobais);
    } else {
        injetarElementosGlobais();
    }
})();
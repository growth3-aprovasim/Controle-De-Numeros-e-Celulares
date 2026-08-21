// js/script-index.js

async function carregarDashboard() {
    try {
        const numeros = (await DB.numerosControle.listar()) || [];
        const campanhas = (await DB.campanhas.listar()) || [];
        const aparelhos = (await DB.mapaAparelhos.listar()) || [];

        // --- 1. CÁLCULO DAS MÉTRICAS PRINCIPAIS ---
        const total = numeros.length;
        const emUso = numeros.filter(n => n.atividade === 'Em Uso').length;
        const emAnalise = numeros.filter(n => n.atividade === 'Em Análise').length;
        const banidos = numeros.filter(n => n.atividade === 'Banido').length;
        const reconectar = numeros.filter(n => n.atividade === 'Reconectar').length;
        const campanhasAtivas = campanhas.filter(c => c.status === 'Em Andamento').length;

        // Atualiza os contadores no topo
        if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
        if (document.getElementById('stat-em-uso')) document.getElementById('stat-em-uso').innerText = emUso;
        if (document.getElementById('stat-analise')) document.getElementById('stat-analise').innerText = emAnalise;
        if (document.getElementById('stat-banidos')) document.getElementById('stat-banidos').innerText = banidos;
        if (document.getElementById('stat-reconectar')) document.getElementById('stat-reconectar').innerText = reconectar;
        if (document.getElementById('stat-campanhas')) document.getElementById('stat-campanhas').innerText = campanhasAtivas;

        // --- 2. RENDERIZAÇÃO DAS CAMPANHAS EM DESTAQUE COM CARDS VISUAIS DE CHIPS ---
        renderizarCampanhasDashboard(campanhas, numeros);

        // --- 3. INSIGHTS: APARELHOS, FUNÇÕES E EXPERTS (BASEADO EM CAMPANHAS) ---
        renderizarInsights(numeros, aparelhos, campanhas);

    } catch (e) {
        console.error("Erro ao carregar dados do dashboard:", e);
    }
}

function renderizarCampanhasDashboard(campanhas, todosNumeros) {
    const container = document.getElementById('dashboard-grid-campanhas');
    if (!container) return;

    container.innerHTML = '';

    const campanhasAtivasOuTodas = campanhas.filter(c => c.status !== 'Encerrada');

    if (campanhasAtivasOuTodas.length === 0) {
        container.innerHTML = `<div class="equipe-card aberto" style="padding: 25px; text-align: center; color: var(--texto-muted);">Nenhuma campanha em andamento no momento. Vá em Campanhas para criar uma nova.</div>`;
        return;
    }

    campanhasAtivasOuTodas.forEach(camp => {
        const itensAlocados = camp.equipes || [];
        const chipsDetalhados = [];

        itensAlocados.forEach(item => {
            let idOuNome = item;
            let grupo = 'NORMAL';

            if (typeof item === 'string' && item.includes(':')) {
                const partes = item.split(':');
                idOuNome = partes[0];
                grupo = partes[1] || 'NORMAL';
            }

            const numObj = todosNumeros.find(n => String(n.id) === String(idOuNome) || n.nome === idOuNome);
            if (numObj) {
                chipsDetalhados.push({
                    num: numObj,
                    grupo: grupo
                });
            }
        });

        // Ordenar: VIPs primeiro, depois Ambos, depois Normais
        chipsDetalhados.sort((a, b) => {
            const peso = { 'VIP': 1, 'AMBOS': 2, 'NORMAL': 3 };
            return (peso[a.grupo] || 3) - (peso[b.grupo] || 3);
        });

        const totalNumsCampanha = chipsDetalhados.length;
        const totalVip = chipsDetalhados.filter(c => c.grupo === 'VIP').length;
        const totalAmbos = chipsDetalhados.filter(c => c.grupo === 'AMBOS').length;
        const totalNormal = chipsDetalhados.filter(c => c.grupo === 'NORMAL').length;

        let corStatus = camp.status === 'Em Andamento' ? '#10b981' : '#3b82f6';

        let card = document.createElement('div');
        card.className = 'equipe-card aberto';
        card.style.borderColor = 'var(--laranja-brabo)';
        card.style.marginBottom = '0';

        // Renderização dos quadradinhos / cards de cada número
        let chipsGridHTML = '';

        if (totalNumsCampanha === 0) {
            chipsGridHTML = `<div style="color: var(--texto-muted); font-size: 13px; padding: 15px 0;">Nenhum número alocado para esta campanha ainda.</div>`;
        } else {
            chipsGridHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 15px;">`;
            
            chipsDetalhados.forEach(item => {
                const chip = item.num;
                const grp = item.grupo;

                // Cores dinâmicas da caixa baseadas na atividade do chip (Em Uso = Verde, Em Análise = Amarelo, Banido = Vermelho, Reconectar = Roxo)
                let borderStyle = '1px solid rgba(255, 255, 255, 0.08)';
                let bgCard = 'rgba(255, 255, 255, 0.02)';
                let corAtividade = '#94a3b8';
                let ativ = chip.atividade || 'Disponível';

                if (ativ === 'Em Uso') {
                    borderStyle = '1px solid rgba(16, 185, 129, 0.6)';
                    bgCard = 'rgba(16, 185, 129, 0.10)';
                    corAtividade = '#10b981';
                } else if (ativ === 'Em Análise') {
                    borderStyle = '1px solid rgba(245, 158, 11, 0.6)';
                    bgCard = 'rgba(245, 158, 11, 0.10)';
                    corAtividade = '#f59e0b';
                } else if (ativ === 'Banido') {
                    borderStyle = '1px solid rgba(239, 68, 68, 0.6)';
                    bgCard = 'rgba(239, 68, 68, 0.10)';
                    corAtividade = '#ef4444';
                } else if (ativ === 'Reconectar') {
                    borderStyle = '1px solid rgba(168, 85, 247, 0.6)';
                    bgCard = 'rgba(168, 85, 247, 0.10)';
                    corAtividade = '#a855f7';
                } else {
                    borderStyle = '1px solid rgba(59, 130, 246, 0.4)';
                    bgCard = 'rgba(59, 130, 246, 0.05)';
                    corAtividade = '#60a5fa';
                }

                let badgeGrupoHTML = `<span class="badge badge-normal" style="font-size: 10px; padding: 2px 6px;">📱 Normal</span>`;
                if (grp === 'VIP') {
                    badgeGrupoHTML = `<span class="badge badge-vip" style="font-size: 10px; padding: 2px 6px;">⭐ VIP</span>`;
                } else if (grp === 'AMBOS') {
                    badgeGrupoHTML = `<span class="badge badge-ambos" style="font-size: 10px; padding: 2px 6px;">👑 Ambos</span>`;
                }

                let classFunc = chip.funcao === 'Envios' ? 'bg-func-envios' : (chip.funcao === 'Criador' ? 'bg-func-criador' : 'bg-func-reserva');

                chipsGridHTML += `
                    <div style="background-color: ${bgCard}; border: ${borderStyle}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; transition: transform 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <b style="font-size: 13px; color: var(--texto-claro); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${chip.nome}">${chip.nome}</b>
                            ${badgeGrupoHTML}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 11px; color: var(--texto-muted);">${chip.numero}</span>
                            <span style="font-size: 10px; font-weight: 600; color: ${corAtividade}; display: flex; align-items: center; gap: 3px;">
                                <span style="width: 6px; height: 6px; border-radius: 50%; background-color: ${corAtividade}; display: inline-block;"></span>
                                ${ativ}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px;">
                            <span class="badge ${classFunc}" style="font-size: 9px; padding: 2px 5px;">${chip.funcao || 'Reserva'}</span>
                            <span style="font-size: 10px; color: var(--texto-muted);">Bans: <b style="color: ${chip.bans > 0 ? '#ef4444' : 'var(--texto-claro)'}">${chip.bans || 0}</b></span>
                        </div>
                    </div>
                `;
            });

            chipsGridHTML += `</div>`;
        }

        let badgesResumo = '';
        if (totalVip > 0) badgesResumo += `<span class="badge badge-vip" style="font-size: 10px; padding: 2px 6px;">⭐ ${totalVip} VIP</span> `;
        if (totalAmbos > 0) badgesResumo += `<span class="badge badge-ambos" style="font-size: 10px; padding: 2px 6px;">👑 ${totalAmbos} Ambos</span> `;
        if (totalNormal > 0) badgesResumo += `<span class="badge badge-normal" style="font-size: 10px; padding: 2px 6px;">📱 ${totalNormal} Normal</span> `;

        card.innerHTML = `
            <div class="equipe-titulo-area" style="cursor: default; padding-bottom: 12px;">
                <div class="equipe-titulo-esq">
                    <h3 style="font-size: 17px;">${camp.nome}</h3>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px; color: var(--texto-muted);">
                            Volume: <b style="color: var(--laranja-brabo); font-size: 13px;">${totalNumsCampanha} números</b>
                        </span>
                        ${badgesResumo}
                    </div>
                </div>
                <div class="equipe-meta" style="display: flex; align-items: center; gap: 10px;">
                    <span class="badge" style="background-color: ${corStatus}20; color: ${corStatus}; border: 1px solid ${corStatus}50;">${camp.status}</span>
                    <span class="badge bg-expert"><span class="material-icons-round" style="font-size: 12px; margin-right: 4px;">event</span> ${camp.data ? camp.data.split('-').reverse().join('/') : 'Sem data'}</span>
                    <span class="badge" style="background-color: rgba(255,255,255,0.06); color: var(--texto-claro);"><span class="material-icons-round" style="font-size: 12px; margin-right: 4px;">person</span> ${camp.expert || 'Geral'}</span>
                    <a href="pages/campanhas.html" class="btn-icon" title="Ver no Gerenciador de Campanhas">
                        <span class="material-icons-round" style="font-size: 18px;">open_in_new</span>
                    </a>
                </div>
            </div>
            ${chipsGridHTML}
        `;

        container.appendChild(card);
    });
}

function renderizarInsights(numeros, aparelhos, campanhas = []) {
    // 1. Aparelhos Físicos
    const containerAparelhos = document.getElementById('resumo-aparelhos');
    if (containerAparelhos) {
        const totalAp = aparelhos.length;
        const comEspaco = aparelhos.filter(a => {
            const ocupados = (a.chips || []).filter(c => c && c.toLowerCase() !== 'x').length;
            return ocupados < (a.maxSlots || 6);
        }).length;

        containerAparelhos.innerHTML = `
            <div style="display: flex; justify-content: space-between;"><span>Total de Aparelhos Físicos:</span> <b style="color: var(--texto-claro);">${totalAp}</b></div>
            <div style="display: flex; justify-content: space-between;"><span>Aparelhos com Vagas Livres:</span> <b style="color: #10b981;">${comEspaco}</b></div>
            <div style="display: flex; justify-content: space-between;"><span>Aparelhos Lotados:</span> <b style="color: #f59e0b;">${totalAp - comEspaco}</b></div>
        `;
    }

    // 2. Funções dos Números
    const containerFuncoes = document.getElementById('resumo-funcoes');
    if (containerFuncoes) {
        const envios = numeros.filter(n => n.funcao === 'Envios').length;
        const criador = numeros.filter(n => n.funcao === 'Criador').length;
        const reserva = numeros.filter(n => n.funcao === 'Reserva').length;

        containerFuncoes.innerHTML = `
            <div style="display: flex; justify-content: space-between;"><span>Números para Envios:</span> <b style="color: #60a5fa;">${envios}</b></div>
            <div style="display: flex; justify-content: space-between;"><span>Números Criadores:</span> <b style="color: #c084fc;">${criador}</b></div>
            <div style="display: flex; justify-content: space-between;"><span>Números de Reserva:</span> <b style="color: #fcd34d;">${reserva}</b></div>
        `;
    }

    // 3. Contagem por Expert (Calculado dinamicamente a partir das Campanhas)
    const containerExperts = document.getElementById('resumo-experts');
    if (containerExperts) {
        const expertCounts = {};
        
        campanhas.forEach(camp => {
            const exp = camp.expert || 'Geral';
            const itens = camp.equipes || [];
            expertCounts[exp] = (expertCounts[exp] || 0) + itens.length;
        });

        let expertsHtml = '';
        const chavesExperts = Object.keys(expertCounts);

        if (chavesExperts.length === 0) {
            expertsHtml = `<span style="color: var(--texto-muted);">Nenhum número alocado em campanhas de experts.</span>`;
        } else {
            chavesExperts.forEach(exp => {
                expertsHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Expert <b>${exp}</b>:</span> 
                        <span class="badge bg-expert" style="padding: 2px 8px; font-weight: bold;">${expertCounts[exp]} números em campanhas</span>
                    </div>
                `;
            });
        }

        containerExperts.innerHTML = expertsHtml;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarDashboard);
} else {
    carregarDashboard();
}
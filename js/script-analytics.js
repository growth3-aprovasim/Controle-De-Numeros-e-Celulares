// js/script-analytics.js

let listaNumerosGlobal = [];
let listaCampanhasGlobal = [];

let chartCampanhasInst = null;
let chartStatusInst = null;
let chartExpertsInst = null;
let chartFuncoesInst = null;
let chartPlanejadoRealInst = null;

// Configuração padrão de tema escuro para o Chart.js
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
Chart.defaults.font.size = 12;

async function carregarDadosAnalytics() {
    try {
        listaNumerosGlobal = (await DB.numerosControle.listar()) || [];
        listaCampanhasGlobal = (await DB.campanhas.listar()) || [];

        popularSelectCampanhas();
        aplicarFiltroCampanhaAnalytics();
    } catch (e) {
        console.error("Erro ao carregar dados analíticos:", e);
    }
}

function popularSelectCampanhas() {
    const select = document.getElementById('filtro-campanha-analytics');
    if (!select) return;

    const valorAtual = select.value || 'GERAL';
    select.innerHTML = '<option value="GERAL">📊 Visão Geral (Todas as Campanhas)</option>';

    listaCampanhasGlobal.forEach(camp => {
        const opt = document.createElement('option');
        opt.value = String(camp.id);
        opt.innerText = `🎯 ${camp.nome} (${camp.expert || 'Geral'}) - ${camp.status}`;
        select.appendChild(opt);
    });

    select.value = valorAtual;
}

function aplicarFiltroCampanhaAnalytics() {
    const select = document.getElementById('filtro-campanha-analytics');
    const idSelecionado = select ? select.value : 'GERAL';
    const infoLabel = document.getElementById('info-campanha-selecionada');

    let campanhasFiltradas = [];
    let numerosAnalisados = [];

    if (idSelecionado === 'GERAL') {
        campanhasFiltradas = listaCampanhasGlobal;
        numerosAnalisados = listaNumerosGlobal;
        if (infoLabel) infoLabel.innerText = "Mostrando dados agregados de todas as campanhas e base geral.";
    } else {
        const camp = listaCampanhasGlobal.find(c => String(c.id) === String(idSelecionado));
        if (camp) {
            campanhasFiltradas = [camp];
            if (infoLabel) infoLabel.innerText = `Mostrando métricas da campanha "${camp.nome}" (${camp.expert || 'Geral'})`;

            // Obter apenas os números vinculados a esta campanha
            const idsOuNomes = (camp.equipes || []).map(item => {
                if (typeof item === 'string' && item.includes(':')) return item.split(':')[0];
                return item;
            });

            numerosAnalisados = listaNumerosGlobal.filter(n => 
                idsOuNomes.some(idNome => String(n.id) === String(idNome) || n.nome === idNome)
            );
        } else {
            campanhasFiltradas = listaCampanhasGlobal;
            numerosAnalisados = listaNumerosGlobal;
        }
    }

    // 1. KPIS
    const totalBase = numerosAnalisados.length;
    const totalEmUso = numerosAnalisados.filter(n => n.atividade === 'Em Uso').length;
    const totalDisponivel = numerosAnalisados.filter(n => n.atividade === 'Disponível').length;
    const totalAnalise = numerosAnalisados.filter(n => n.atividade === 'Em Análise').length;
    const totalReconectar = numerosAnalisados.filter(n => n.atividade === 'Reconectar').length;
    const totalBanidos = numerosAnalisados.filter(n => n.atividade === 'Banido').length;
    const somaTotalBans = numerosAnalisados.reduce((acc, n) => acc + (Number(n.bans) || 0), 0);

    let totalChipsNoVip = 0;
    campanhasFiltradas.forEach(camp => {
        (camp.equipes || []).forEach(item => {
            if (typeof item === 'string' && item.includes(':VIP')) totalChipsNoVip++;
        });
    });

    const taxaSaude = totalBase > 0 ? Math.round(((totalEmUso + totalDisponivel) / totalBase) * 100) : 0;

    if (document.getElementById('kpi-total-base')) document.getElementById('kpi-total-base').innerText = totalBase;
    if (document.getElementById('kpi-total-vip')) document.getElementById('kpi-total-vip').innerText = totalChipsNoVip;
    if (document.getElementById('kpi-total-analise')) document.getElementById('kpi-total-analise').innerText = totalAnalise;
    if (document.getElementById('kpi-total-bans')) document.getElementById('kpi-total-bans').innerText = somaTotalBans;
    if (document.getElementById('kpi-taxa-saude')) document.getElementById('kpi-taxa-saude').innerText = `${taxaSaude}%`;

    // 2. PROCESSAR DADOS DAS CAMPANHAS
    const nomesCampanhas = [];
    const dataVip = [];
    const dataAmbos = [];
    const dataNormal = [];
    const dataPlanejado = [];
    const dataReal = [];

    const expertCampanhasCounts = {};

    const dadosTabelaCampanhas = campanhasFiltradas.map(camp => {
        let vip = 0;
        let ambos = 0;
        let normal = 0;
        let reaisEmUso = 0;
        let bansAcumulados = 0;

        (camp.equipes || []).forEach(item => {
            let idOuNome = item;
            let grupo = 'NORMAL';

            if (typeof item === 'string' && item.includes(':')) {
                const partes = item.split(':');
                idOuNome = partes[0];
                grupo = partes[1] || 'NORMAL';
            }

            if (grupo === 'VIP') vip++;
            else if (grupo === 'AMBOS') ambos++;
            else normal++;

            const numObj = listaNumerosGlobal.find(n => String(n.id) === String(idOuNome) || n.nome === idOuNome);
            if (numObj) {
                bansAcumulados += (Number(numObj.bans) || 0);
                if (numObj.atividade === 'Em Uso') {
                    reaisEmUso++;
                }
            }
        });

        const totalNumsCamp = vip + ambos + normal;
        nomesCampanhas.push(camp.nome.length > 20 ? camp.nome.substring(0, 18) + '...' : camp.nome);
        dataVip.push(vip);
        dataAmbos.push(ambos);
        dataNormal.push(normal);
        dataPlanejado.push(totalNumsCamp);
        dataReal.push(reaisEmUso);

        const exp = camp.expert || 'Geral';
        expertCampanhasCounts[exp] = (expertCampanhasCounts[exp] || 0) + totalNumsCamp;

        return {
            nome: camp.nome,
            expert: camp.expert || 'Geral',
            status: camp.status,
            data: camp.data,
            total: totalNumsCamp,
            real: reaisEmUso,
            vip: vip,
            ambos: ambos,
            normal: normal,
            bans: bansAcumulados
        };
    });

    // 3. RENDERIZAR GRÁFICOS
    renderizarGraficoCampanhas(nomesCampanhas, dataVip, dataAmbos, dataNormal);
    renderizarGraficoExperts(expertCampanhasCounts);
    renderizarGraficoPlanejadoReal(nomesCampanhas, dataPlanejado, dataReal);
    renderizarGraficoStatus(totalDisponivel, totalEmUso, totalAnalise, totalReconectar, totalBanidos);
    renderizarGraficoFuncoes(numerosAnalisados);

    // 4. RENDERIZAR TABELA
    renderizarTabelaComparativa(dadosTabelaCampanhas);
}

// --- GRÁFICO 1: COMPARATIVO DE CAMPANHAS (VIP vs Normal vs Ambos) ---
function renderizarGraficoCampanhas(labels, vips, ambos, normais) {
    const ctx = document.getElementById('chartCampanhas');
    if (!ctx) return;

    if (chartCampanhasInst) chartCampanhasInst.destroy();

    chartCampanhasInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['Nenhuma campanha'],
            datasets: [
                {
                    label: '⭐ VIP',
                    data: vips.length > 0 ? vips : [0],
                    backgroundColor: '#f59e0b',
                    borderRadius: 4
                },
                {
                    label: '👑 Ambos',
                    data: ambos.length > 0 ? ambos : [0],
                    backgroundColor: '#a855f7',
                    borderRadius: 4
                },
                {
                    label: '📱 Normal',
                    data: normais.length > 0 ? normais : [0],
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12 } },
                tooltip: { padding: 10 }
            }
        }
    });
}

// --- GRÁFICO 2: CARGA DE NÚMEROS POR EXPERT ---
function renderizarGraficoExperts(counts) {
    const ctx = document.getElementById('chartExperts');
    if (!ctx) return;

    if (chartExpertsInst) chartExpertsInst.destroy();

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    chartExpertsInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['Sem dados'],
            datasets: [{
                label: 'Números Alocados',
                data: data.length > 0 ? data : [0],
                backgroundColor: ['#6ee7b7', '#93c5fd', '#fcd34d', '#f472b6', '#a78bfa'],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// --- GRÁFICO 3: NÚMEROS PLANEJADOS VS NÚMEROS REAIS ---
function renderizarGraficoPlanejadoReal(labels, planejados, reais) {
    const ctx = document.getElementById('chartPlanejadoReal');
    if (!ctx) return;

    if (chartPlanejadoRealInst) chartPlanejadoRealInst.destroy();

    chartPlanejadoRealInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['Sem campanhas'],
            datasets: [
                {
                    label: '📋 Planejado (Alocado)',
                    data: planejados.length > 0 ? planejados : [0],
                    backgroundColor: 'rgba(59, 130, 246, 0.85)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '🟢 Real (Em Operação)',
                    data: reais.length > 0 ? reais : [0],
                    backgroundColor: 'rgba(16, 185, 129, 0.85)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 14 } },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const plan = planejados[index] || 0;
                            const real = reais[index] || 0;
                            const perc = plan > 0 ? Math.round((real / plan) * 100) : 0;
                            return `Taxa de Cobertura: ${perc}%`;
                        }
                    }
                }
            }
        }
    });
}

// --- GRÁFICO 4: STATUS DA BASE (ROSCA COM AMOSTRAS VISÍVEIS) ---
function renderizarGraficoStatus(disp, uso, analise, reconectar, banido) {
    // 1. Atualizar cards de amostras numéricas diretas
    const resumoAmostras = document.getElementById('resumo-status-amostras');
    if (resumoAmostras) {
        resumoAmostras.innerHTML = `
            <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); border-radius: 6px; padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; color: #10b981; display: block; font-weight: 600;">Disponível</span>
                <b style="font-size: 15px; color: #10b981;">${disp}</b>
            </div>
            <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; color: #60a5fa; display: block; font-weight: 600;">Em Uso</span>
                <b style="font-size: 15px; color: #60a5fa;">${uso}</b>
            </div>
            <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; color: #f59e0b; display: block; font-weight: 600;">Em Análise</span>
                <b style="font-size: 15px; color: #f59e0b;">${analise}</b>
            </div>
            <div style="background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.3); border-radius: 6px; padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; color: #a855f7; display: block; font-weight: 600;">Reconectar</span>
                <b style="font-size: 15px; color: #a855f7;">${reconectar}</b>
            </div>
            <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; color: #ef4444; display: block; font-weight: 600;">Banidos</span>
                <b style="font-size: 15px; color: #ef4444;">${banido}</b>
            </div>
        `;
    }

    const ctx = document.getElementById('chartStatus');
    if (!ctx) return;

    if (chartStatusInst) chartStatusInst.destroy();

    chartStatusInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [`Disponível (${disp})`, `Em Uso (${uso})`, `Em Análise (${analise})`, `Reconectar (${reconectar})`, `Banido (${banido})`],
            datasets: [{
                data: [disp, uso, analise, reconectar, banido],
                backgroundColor: [
                    '#10b981', // Verde
                    '#3b82f6', // Azul
                    '#f59e0b', // Âmbar
                    '#a855f7', // Roxo
                    '#ef4444'  // Vermelho
                ],
                borderWidth: 2,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } }
            },
            cutout: '60%'
        }
    });
}

// --- GRÁFICO 5: DISTRIBUIÇÃO POR FUNÇÃO ---
function renderizarGraficoFuncoes(numeros) {
    const envios = numeros.filter(n => n.funcao === 'Envios').length;
    const criador = numeros.filter(n => n.funcao === 'Criador').length;
    const reserva = numeros.filter(n => n.funcao === 'Reserva').length;

    // Resumo de amostras diretas
    const resumoFuncoes = document.getElementById('resumo-funcoes-amostras');
    if (resumoFuncoes) {
        resumoFuncoes.innerHTML = `
            <div style="background: rgba(43,85,181,0.12); border: 1px solid rgba(43,85,181,0.4); border-radius: 6px; padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; color: #60a5fa; display: block; font-weight: 600;">Envios</span>
                <b style="font-size: 15px; color: #60a5fa;">${envios}</b>
            </div>
            <div style="background: rgba(99,48,148,0.12); border: 1px solid rgba(99,48,148,0.4); border-radius: 6px; padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; color: #c084fc; display: block; font-weight: 600;">Criador</span>
                <b style="font-size: 15px; color: #c084fc;">${criador}</b>
            </div>
            <div style="background: rgba(255,230,84,0.12); border: 1px solid rgba(255,230,84,0.4); border-radius: 6px; padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; color: #fcd34d; display: block; font-weight: 600;">Reserva</span>
                <b style="font-size: 15px; color: #fcd34d;">${reserva}</b>
            </div>
        `;
    }

    const ctx = document.getElementById('chartFuncoes');
    if (!ctx) return;

    if (chartFuncoesInst) chartFuncoesInst.destroy();

    chartFuncoesInst = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [`Envios (${envios})`, `Criador (${criador})`, `Reserva (${reserva})`],
            datasets: [{
                data: [envios, criador, reserva],
                backgroundColor: [
                    '#2b55b5', // Azul escuro
                    '#633094', // Roxo escuro
                    '#ffe654'  // Amarelo
                ],
                borderWidth: 2,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } }
            }
        }
    });
}

// --- TABELA COMPARATIVA DETALHADA ---
function renderizarTabelaComparativa(campanhas) {
    const tbody = document.getElementById('tabela-comparativa-campanhas');
    const infoTotal = document.getElementById('tabela-total-campanhas-info');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (infoTotal) infoTotal.innerText = `${campanhas.length} campanhas filtradas`;

    if (campanhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--texto-muted); padding: 25px;">Nenhuma campanha encontrada.</td></tr>`;
        return;
    }

    campanhas.forEach(camp => {
        let corStatus = camp.status === 'Em Andamento' ? '#10b981' : (camp.status === 'Encerrada' ? '#6b7280' : '#3b82f6');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 14px 20px; font-weight: 600; color: var(--texto-claro);">${camp.nome}</td>
            <td style="padding: 14px 15px; text-align: center;"><span class="badge bg-expert" style="font-size: 11px;">${camp.expert}</span></td>
            <td style="padding: 14px 15px; text-align: center;"><span class="badge" style="background-color: ${corStatus}20; color: ${corStatus}; font-size: 10px;">${camp.status}</span></td>
            <td style="padding: 14px 15px; text-align: center; color: var(--texto-muted); font-size: 12px;">${camp.data ? camp.data.split('-').reverse().join('/') : '-'}</td>
            <td style="padding: 14px 15px; text-align: center; font-weight: bold; color: #60a5fa;">${camp.total}</td>
            <td style="padding: 14px 15px; text-align: center; font-weight: bold; color: #10b981;">${camp.real || 0}</td>
            <td style="padding: 14px 15px; text-align: center;"><span class="badge badge-vip" style="font-size: 10px; padding: 2px 6px;">${camp.vip}</span></td>
            <td style="padding: 14px 15px; text-align: center;"><span class="badge badge-ambos" style="font-size: 10px; padding: 2px 6px;">${camp.ambos}</span></td>
            <td style="padding: 14px 15px; text-align: center;"><span class="badge badge-normal" style="font-size: 10px; padding: 2px 6px;">${camp.normal}</span></td>
            <td style="padding: 14px 15px; text-align: center; font-weight: bold; color: ${camp.bans > 0 ? '#ef4444' : '#10b981'};">${camp.bans}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosAnalytics();
});

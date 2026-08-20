// js/script-analytics.js

let chartCampanhasInst = null;
let chartStatusInst = null;
let chartExpertsInst = null;
let chartFuncoesInst = null;

// Configuração padrão de tema escuro para o Chart.js
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
Chart.defaults.font.size = 12;

async function carregarDadosAnalytics() {
    try {
        const numeros = (await DB.numerosControle.listar()) || [];
        const campanhas = (await DB.campanhas.listar()) || [];

        // 1. KPIS GLOBAIS
        const totalBase = numeros.length;
        const totalEmUso = numeros.filter(n => n.atividade === 'Em Uso').length;
        const totalDisponivel = numeros.filter(n => n.atividade === 'Disponível').length;
        const totalAnalise = numeros.filter(n => n.atividade === 'Em Análise').length;
        const totalReconectar = numeros.filter(n => n.atividade === 'Reconectar').length;
        const totalBanidos = numeros.filter(n => n.atividade === 'Banido').length;
        const somaTotalBans = numeros.reduce((acc, n) => acc + (Number(n.bans) || 0), 0);

        // Contagem de VIPs em campanhas
        let totalChipsNoVip = 0;
        campanhas.forEach(camp => {
            (camp.equipes || []).forEach(item => {
                if (typeof item === 'string' && item.includes(':VIP')) totalChipsNoVip++;
            });
        });

        // Taxa de Operação (%) = (Disponíveis + Em Uso) / Total
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

        const expertCampanhasCounts = {};

        const dadosTabelaCampanhas = campanhas.map(camp => {
            let vip = 0;
            let ambos = 0;
            let normal = 0;
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

                const numObj = numeros.find(n => String(n.id) === String(idOuNome) || n.nome === idOuNome);
                if (numObj) {
                    bansAcumulados += (Number(numObj.bans) || 0);
                }
            });

            nomesCampanhas.push(camp.nome.length > 22 ? camp.nome.substring(0, 20) + '...' : camp.nome);
            dataVip.push(vip);
            dataAmbos.push(ambos);
            dataNormal.push(normal);

            const exp = camp.expert || 'Geral';
            const totalNumsCamp = vip + ambos + normal;
            expertCampanhasCounts[exp] = (expertCampanhasCounts[exp] || 0) + totalNumsCamp;

            return {
                nome: camp.nome,
                expert: camp.expert || 'Geral',
                status: camp.status,
                data: camp.data,
                total: totalNumsCamp,
                vip: vip,
                ambos: ambos,
                normal: normal,
                bans: bansAcumulados
            };
        });

        // 3. RENDERIZAR GRÁFICOS
        renderizarGraficoCampanhas(nomesCampanhas, dataVip, dataAmbos, dataNormal);
        renderizarGraficoStatus(totalDisponivel, totalEmUso, totalAnalise, totalReconectar, totalBanidos);
        renderizarGraficoExperts(expertCampanhasCounts);
        renderizarGraficoFuncoes(numeros);

        // 4. RENDERIZAR TABELA COMPARATIVA
        renderizarTabelaComparativa(dadosTabelaCampanhas);

    } catch (e) {
        console.error("Erro ao carregar dados analíticos:", e);
    }
}

// --- GRÁFICO 1: COMPARATIVO DE CAMPANHAS (BARRAS EMPILHADAS) ---
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

// --- GRÁFICO 2: STATUS DA BASE (ROSCA) ---
function renderizarGraficoStatus(disp, uso, analise, reconectar, banido) {
    const ctx = document.getElementById('chartStatus');
    if (!ctx) return;

    if (chartStatusInst) chartStatusInst.destroy();

    chartStatusInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Disponível', 'Em Uso', 'Em Análise', 'Reconectar', 'Banido'],
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
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
            },
            cutout: '65%'
        }
    });
}

// --- GRÁFICO 3: NÚMEROS POR EXPERT (BARRAS HORIZONTAIS) ---
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
                backgroundColor: '#6ee7b7',
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

// --- GRÁFICO 4: DISTRIBUIÇÃO POR FUNÇÃO (PIE) ---
function renderizarGraficoFuncoes(numeros) {
    const ctx = document.getElementById('chartFuncoes');
    if (!ctx) return;

    if (chartFuncoesInst) chartFuncoesInst.destroy();

    const envios = numeros.filter(n => n.funcao === 'Envios').length;
    const criador = numeros.filter(n => n.funcao === 'Criador').length;
    const reserva = numeros.filter(n => n.funcao === 'Reserva').length;

    chartFuncoesInst = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Envios', 'Criador', 'Reserva'],
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
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
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
    if (infoTotal) infoTotal.innerText = `${campanhas.length} campanhas registradas`;

    if (campanhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--texto-muted); padding: 25px;">Nenhuma campanha cadastrada.</td></tr>`;
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
            <td style="padding: 14px 15px; text-align: center; font-weight: bold; color: var(--laranja-brabo);">${camp.total}</td>
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

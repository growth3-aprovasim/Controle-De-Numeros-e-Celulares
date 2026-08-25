// js/script-analytics.js

let listaNumerosGlobal = [];
let listaCampanhasGlobal = [];

let chartCampanhasInst = null;
let chartFuncaoAlocadoUsoInst = null;
let chartStatusInst = null;

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

    // Contadores para o gráfico combinado de funções (Alocados vs Em Uso)
    let alocadosEnvios = 0;
    let alocadosCriador = 0;
    let alocadosEspiao = 0;
    let alocadosReserva = 0;

    let emUsoEnvios = 0;
    let emUsoCriador = 0;
    let emUsoEspiao = 0;
    let emUsoReserva = 0;

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
                
                const func = numObj.funcao || 'Reserva';
                if (func === 'Envios') alocadosEnvios++;
                else if (func === 'Criador') alocadosCriador++;
                else if (func === 'Espião') alocadosEspiao++;
                else alocadosReserva++;

                if (numObj.atividade === 'Em Uso') {
                    reaisEmUso++;
                    if (func === 'Envios') emUsoEnvios++;
                    else if (func === 'Criador') emUsoCriador++;
                    else if (func === 'Espião') emUsoEspiao++;
                    else emUsoReserva++;
                }
            }
        });

        const totalNumsCamp = vip + ambos + normal;
        nomesCampanhas.push(camp.nome.length > 18 ? camp.nome.substring(0, 16) + '...' : camp.nome);
        dataVip.push(vip);
        dataAmbos.push(ambos);
        dataNormal.push(normal);

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
    renderizarGraficoCampanhasColunas(nomesCampanhas, dataVip, dataAmbos, dataNormal);
    renderizarGraficoFuncaoAlocadoUso(
        [alocadosEnvios, alocadosCriador, alocadosEspiao, alocadosReserva],
        [emUsoEnvios, emUsoCriador, emUsoEspiao, emUsoReserva]
    );
    renderizarGraficoStatus(totalDisponivel, totalEmUso, totalAnalise, totalReconectar, totalBanidos);

    // 4. RENDERIZAR TABELA
    renderizarTabelaComparativa(dadosTabelaCampanhas);
}

// --- GRÁFICO 1: COMPARATIVO POR CAMPANHA COM COLUNAS LATERAIS (AGRUPADAS) ---
function renderizarGraficoCampanhasColunas(labels, vips, ambos, normais) {
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
                    borderColor: '#d97706',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '👑 Ambos',
                    data: ambos.length > 0 ? ambos : [0],
                    backgroundColor: '#a855f7',
                    borderColor: '#9333ea',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '📱 Normal',
                    data: normais.length > 0 ? normais : [0],
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
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
                    stacked: false, // Colunas lado a lado
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    stacked: false, // Colunas lado a lado
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } },
                tooltip: { padding: 10 }
            }
        }
    });
}

// --- GRÁFICO 2: ALOCADOS VS EM USO POR FUNÇÃO (ENVIOS, CRIADOR, RESERVA) ---
function renderizarGraficoFuncaoAlocadoUso(alocados, emUso) {
    const ctx = document.getElementById('chartFuncaoAlocadoUso');
    if (!ctx) return;

    if (chartFuncaoAlocadoUsoInst) chartFuncaoAlocadoUsoInst.destroy();

    chartFuncaoAlocadoUsoInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Envios', 'Criador', 'Espião', 'Reserva'],
            datasets: [
                {
                    label: '📋 Números Alocados (Planejado)',
                    data: alocados,
                    backgroundColor: 'rgba(59, 130, 246, 0.85)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 5
                },
                {
                    label: '🟢 Em Operação (Em Uso Real)',
                    data: emUso,
                    backgroundColor: 'rgba(16, 185, 129, 0.85)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const totalAlocado = alocados[index] || 0;
                            const totalUso = emUso[index] || 0;
                            const taxa = totalAlocado > 0 ? Math.round((totalUso / totalAlocado) * 100) : 0;
                            return `Taxa em Operação: ${taxa}%`;
                        }
                    }
                }
            }
        }
    });
}

// --- GRÁFICO 3: STATUS DA BASE COM AMOSTRAS VISÍVEIS ---
function renderizarGraficoStatus(disp, uso, analise, reconectar, banido) {
    const totalGeral = disp + uso + analise + reconectar + banido;
    const calcPerc = (val) => totalGeral > 0 ? Math.round((val / totalGeral) * 100) : 0;

    const resumoAmostras = document.getElementById('resumo-status-amostras');
    if (resumoAmostras) {
        resumoAmostras.innerHTML = `
            <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 10px 14px; text-align: center;">
                <span style="font-size: 11px; color: #10b981; display: block; font-weight: 600;">Disponível</span>
                <b style="font-size: 20px; color: #10b981;">${disp}</b>
                <span style="font-size: 11px; color: var(--texto-muted); display: block; margin-top: 2px;">${calcPerc(disp)}% da base</span>
            </div>
            <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.3); border-radius: 8px; padding: 10px 14px; text-align: center;">
                <span style="font-size: 11px; color: #60a5fa; display: block; font-weight: 600;">Em Uso</span>
                <b style="font-size: 20px; color: #60a5fa;">${uso}</b>
                <span style="font-size: 11px; color: var(--texto-muted); display: block; margin-top: 2px;">${calcPerc(uso)}% da base</span>
            </div>
            <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px; padding: 10px 14px; text-align: center;">
                <span style="font-size: 11px; color: #f59e0b; display: block; font-weight: 600;">Em Análise</span>
                <b style="font-size: 20px; color: #f59e0b;">${analise}</b>
                <span style="font-size: 11px; color: var(--texto-muted); display: block; margin-top: 2px;">${calcPerc(analise)}% da base</span>
            </div>
            <div style="background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.3); border-radius: 8px; padding: 10px 14px; text-align: center;">
                <span style="font-size: 11px; color: #a855f7; display: block; font-weight: 600;">Reconectar</span>
                <b style="font-size: 20px; color: #a855f7;">${reconectar}</b>
                <span style="font-size: 11px; color: var(--texto-muted); display: block; margin-top: 2px;">${calcPerc(reconectar)}% da base</span>
            </div>
            <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 10px 14px; text-align: center;">
                <span style="font-size: 11px; color: #ef4444; display: block; font-weight: 600;">Banidos</span>
                <b style="font-size: 20px; color: #ef4444;">${banido}</b>
                <span style="font-size: 11px; color: var(--texto-muted); display: block; margin-top: 2px;">${calcPerc(banido)}% da base</span>
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
                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } }
            },
            cutout: '60%'
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

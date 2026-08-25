// js/script-campanhas.js

let listaCampanhas = [];
let listaNumerosGeral = [];
// Mapeamento de ID -> 'VIP' | 'NORMAL' | 'AMBOS'
let mapNumerosSelecionados = new Map();

async function carregarDadosCampanhas() {
    try {
        listaCampanhas = (await DB.campanhas.listar()) || [];
        listaCampanhas.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
        listaNumerosGeral = (await DB.numerosControle.listar()) || [];
        renderizarCampanhas();
    } catch (erro) {
        console.error("Erro ao carregar dados de campanhas:", erro);
    }
}

function obterClasseAtividadeCampanha(atividade) {
    switch (atividade) {
        case 'Em Uso': return 'bg-ativ-uso';
        case 'Disponível': return 'bg-ativ-disponivel';
        case 'Em Análise': return 'bg-ativ-analise';
        case 'Banido': return 'bg-ativ-banido';
        case 'Reconectar': return 'bg-ativ-reconectar';
        case 'Indisponível': return 'bg-ativ-banido';
        default: return 'bg-ativ-disponivel';
    }
}

// Retorna lista de objetos { numero: numObj, grupo: 'VIP' | 'NORMAL' | 'AMBOS' }
function obterNumerosDetalhadosDaCampanha(camp) {
    const itens = camp.equipes || [];
    const resultado = [];

    itens.forEach(item => {
        let idOuNome = item;
        let grupo = 'NORMAL';

        if (typeof item === 'string' && item.includes(':')) {
            const partes = item.split(':');
            idOuNome = partes[0];
            grupo = partes[1] || 'NORMAL';
        }

        const numObj = listaNumerosGeral.find(n => String(n.id) === String(idOuNome) || n.nome === idOuNome);
        if (numObj) {
            resultado.push({
                num: numObj,
                grupo: grupo
            });
        }
    });

    // Ordenação especial: VIPs primeiro, depois Ambos, depois Normais
    resultado.sort((a, b) => {
        const peso = { 'VIP': 1, 'AMBOS': 2, 'NORMAL': 3 };
        return (peso[a.grupo] || 3) - (peso[b.grupo] || 3);
    });

    return resultado;
}

function alternarColapsoCampanha(elementoHeader) {
    const card = elementoHeader.closest('.equipe-card');
    if (card) {
        card.classList.toggle('fechada');
    }
}

function renderizarCampanhas(dadosParaRenderizar = listaCampanhas) {
    const container = document.getElementById('grid-campanhas');
    if (!container) return;
    container.innerHTML = '';

    if (dadosParaRenderizar.length === 0) {
        container.innerHTML = `<p style="color: var(--texto-muted); text-align: center; padding: 20px;">Nenhuma campanha cadastrada.</p>`;
        return;
    }

    dadosParaRenderizar.forEach(camp => {
        const card = document.createElement('div');
        // Padrão: FECHADA (suspensa/colapsada)
        card.className = 'equipe-card fechada';
        card.style.borderColor = camp.status === 'Encerrada' ? 'var(--bordas)' : 'var(--laranja-brabo)';

        let corStatus = '#3b82f6';
        if (camp.status === 'Em Andamento') corStatus = '#10b981';
        if (camp.status === 'Encerrada') corStatus = '#6b7280';

        const detalhesNumeros = obterNumerosDetalhadosDaCampanha(camp);
        const totalNumerosCampanha = detalhesNumeros.length;
        const totalVip = detalhesNumeros.filter(d => d.grupo === 'VIP').length;
        const totalAmbos = detalhesNumeros.filter(d => d.grupo === 'AMBOS').length;
        const totalNormal = detalhesNumeros.filter(d => d.grupo === 'NORMAL').length;

        let linhasTabelaHTML = '';

        if (totalNumerosCampanha === 0) {
            linhasTabelaHTML = `<tr><td colspan="7" style="text-align: center; color: var(--texto-muted); padding: 20px;">Nenhum número vinculado a esta campanha. Clique em Editar para adicionar números.</td></tr>`;
        } else {
            detalhesNumeros.forEach(item => {
                const num = item.num;
                const grp = item.grupo;

                let classAtiv = obterClasseAtividadeCampanha(num.atividade);
                let classFunc = num.funcao === 'Envios' ? 'bg-func-envios' : (num.funcao === 'Criador' ? 'bg-func-criador' : (num.funcao === 'Espião' ? 'bg-func-espiao' : 'bg-func-reserva'));
                let iconeCapitao = num.isCapitao ? '<span title="Capitão" style="font-size: 14px; margin-right: 4px;">👑</span>' : '';

                let badgeGrupo = '';
                let estiloLinha = 'border-bottom: 1px solid rgba(255,255,255,0.05);';

                if (grp === 'VIP') {
                    badgeGrupo = `<span class="badge badge-vip">⭐ GRUPO VIP</span>`;
                    estiloLinha += ' background-color: rgba(245, 158, 11, 0.04); border-left: 3px solid #f59e0b;';
                } else if (grp === 'AMBOS') {
                    badgeGrupo = `<span class="badge badge-ambos">👑 AMBOS</span>`;
                    estiloLinha += ' border-left: 3px solid #a855f7;';
                } else {
                    badgeGrupo = `<span class="badge badge-normal">📱 NORMAL</span>`;
                }

                linhasTabelaHTML += `
                    <tr style="${estiloLinha}">
                        <td style="padding: 12px 15px; text-align: center;">${badgeGrupo}</td>
                        <td style="padding: 12px 15px; font-weight: 600; color: var(--texto-claro);">${iconeCapitao}${num.nome}</td>
                        <td style="padding: 12px 15px; color: var(--texto-claro);">${num.numero}</td>
                        <td style="padding: 12px 15px; text-align: center;"><span class="badge ${classAtiv}">${num.atividade}</span></td>
                        <td style="padding: 12px 15px; text-align: center;"><span class="badge ${classFunc}">${num.funcao}</span></td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: bold; color: ${num.bans > 0 ? '#ef4444' : 'var(--texto-muted)'};">${num.bans !== undefined ? num.bans : 0}</td>
                        <td style="padding: 12px 15px; text-align: right; white-space: nowrap;">
                            <button class="btn-icon" title="Alterar Grupo / Função" onclick="abrirModalEditarNumeroCampanha(${camp.id}, ${num.id}, '${grp}')" style="color: var(--laranja-brabo); margin-right: 4px;">
                                <span class="material-icons-round" style="font-size: 18px;">edit</span>
                            </button>
                            <button class="btn-icon" title="Remover da Campanha" onclick="removerNumeroDaCampanha(${camp.id}, ${num.id})" style="color: #ef4444;">
                                <span class="material-icons-round" style="font-size: 18px;">remove_circle_outline</span>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        let tagsGruposResumo = '';
        if (totalVip > 0) tagsGruposResumo += `<span class="badge badge-vip" style="font-size: 10px; padding: 2px 6px;">⭐ ${totalVip} VIP</span> `;
        if (totalAmbos > 0) tagsGruposResumo += `<span class="badge badge-ambos" style="font-size: 10px; padding: 2px 6px;">👑 ${totalAmbos} Ambos</span> `;
        if (totalNormal > 0) tagsGruposResumo += `<span class="badge badge-normal" style="font-size: 10px; padding: 2px 6px;">📱 ${totalNormal} Normal</span> `;

        let htmlCard = `
            <div class="equipe-titulo-area" onclick="alternarColapsoCampanha(this)" style="cursor: pointer; user-select: none;">
                <div class="equipe-titulo-esq">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-icons-round chevron-campanha">expand_more</span>
                        <h3 style="margin: 0;">${camp.nome}</h3>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-left: 34px;">
                        <span style="font-size: 13px; color: var(--texto-muted); font-weight: normal;">
                            (Total: <b style="color: var(--laranja-brabo);">${totalNumerosCampanha}</b> números)
                        </span>
                        ${tagsGruposResumo}
                    </div>
                </div>
                <div class="equipe-meta" style="display: flex; align-items: center; gap: 10px;">
                    <span class="badge" style="background-color: ${corStatus}20; color: ${corStatus}; border: 1px solid ${corStatus}50;">${camp.status}</span>
                    <span class="badge bg-expert"><span class="material-icons-round" style="font-size: 12px; margin-right: 4px;">event</span> ${camp.data ? camp.data.split('-').reverse().join('/') : 'Sem data'}</span>
                    <span class="badge" style="background-color: rgba(255,255,255,0.06); color: var(--texto-claro);"><span class="material-icons-round" style="font-size: 12px; margin-right: 4px;">person</span> ${camp.expert || 'Geral'}</span>
                    <button class="btn-icon" title="Editar Campanha" onclick="event.stopPropagation(); abrirModalCampanha(${camp.id})">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="btn-icon" title="Excluir Campanha" onclick="event.stopPropagation(); excluirCampanha(${camp.id})" style="color: #ef4444;">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </div>
            <div class="tabela-wrapper" style="display: block;">
                <table>
                    <thead>
                        <tr>
                            <th style="padding: 10px 15px; text-align: center; width: 140px;">GRUPO</th>
                            <th style="padding: 10px 15px; text-align: left;">NOME (IDENTIFICAÇÃO)</th>
                            <th style="padding: 10px 15px; text-align: left;">NÚMERO</th>
                            <th style="padding: 10px 15px; text-align: center;">ATIVIDADE</th>
                            <th style="padding: 10px 15px; text-align: center;">FUNÇÃO</th>
                            <th style="padding: 10px 15px; text-align: center;">BANS</th>
                            <th style="padding: 10px 15px; text-align: right;">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabelaHTML}
                    </tbody>
                </table>
            </div>
        `;

        card.innerHTML = htmlCard;
        container.appendChild(card);
    });
}

function filtrarCampanhas() {
    const input = document.getElementById('input-filtro-campanhas');
    const termo = input ? input.value.toLowerCase().trim() : '';

    const selectExpert = document.getElementById('filtro-expert-camp');
    const expertFiltro = selectExpert ? selectExpert.value : '';

    const selectStatus = document.getElementById('filtro-status-camp');
    const statusFiltro = selectStatus ? selectStatus.value : '';

    const filtrados = listaCampanhas.filter(item => {
        if (expertFiltro && item.expert !== expertFiltro) return false;
        if (statusFiltro && item.status !== statusFiltro) return false;
        if (termo && (!item.nome || !item.nome.toLowerCase().includes(termo))) return false;
        return true;
    });

    renderizarCampanhas(filtrados);
}

function limparFiltrosCampanhas() {
    const input = document.getElementById('input-filtro-campanhas');
    if (input) input.value = '';
    const selectExpert = document.getElementById('filtro-expert-camp');
    if (selectExpert) selectExpert.value = '';
    const selectStatus = document.getElementById('filtro-status-camp');
    if (selectStatus) selectStatus.value = '';
    renderizarCampanhas(listaCampanhas);
}

function abrirModalCampanha(id = null) {
    mapNumerosSelecionados.clear();

    const inputBusca = document.getElementById('busca-numeros-modal');
    if (inputBusca) inputBusca.value = '';
    const filtroFunc = document.getElementById('filtro-funcao-modal');
    if (filtroFunc) filtroFunc.value = '';
    const filtroStatus = document.getElementById('filtro-status-modal');
    if (filtroStatus) filtroStatus.value = '';

    if (id) {
        const camp = listaCampanhas.find(c => c.id === id);
        if (!camp) return;

        document.getElementById('modal-titulo-camp').innerText = 'Editar Campanha';
        document.getElementById('edit-camp-id').value = camp.id;
        document.getElementById('edit-camp-nome').value = camp.nome || '';
        document.getElementById('edit-camp-expert').value = camp.expert || 'Mateus';
        document.getElementById('edit-camp-status').value = camp.status || 'Em Andamento';
        document.getElementById('edit-camp-data').value = camp.data || '';

        const itensJaAlocados = camp.equipes || [];
        itensJaAlocados.forEach(item => {
            let idOuNome = item;
            let grupo = 'NORMAL';

            if (typeof item === 'string' && item.includes(':')) {
                const partes = item.split(':');
                idOuNome = partes[0];
                grupo = partes[1] || 'NORMAL';
            }

            const numCorrespondente = listaNumerosGeral.find(n => String(n.id) === String(idOuNome) || n.nome === idOuNome);
            if (numCorrespondente) {
                mapNumerosSelecionados.set(String(numCorrespondente.id), grupo);
            } else {
                mapNumerosSelecionados.set(String(idOuNome), grupo);
            }
        });
    } else {
        document.getElementById('modal-titulo-camp').innerText = 'Nova Campanha';
        document.getElementById('edit-camp-id').value = '';
        document.getElementById('edit-camp-nome').value = '';
        document.getElementById('edit-camp-expert').value = 'Mateus';
        document.getElementById('edit-camp-status').value = 'Em Andamento';
        document.getElementById('edit-camp-data').value = '';
    }

    renderizarCheckboxesNumeros();
    document.getElementById('modal-campanha').style.display = 'flex';
}

function renderizarCheckboxesNumeros() {
    const container = document.getElementById('lista-checkbox-numeros-camp');
    if (!container) return;
    container.innerHTML = '';

    const contador = document.getElementById('contador-selecionados-camp');
    if (contador) {
        contador.innerText = `${mapNumerosSelecionados.size} selecionado(s)`;
    }

    const inputBusca = document.getElementById('busca-numeros-modal');
    const termo = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

    const selectFuncao = document.getElementById('filtro-funcao-modal');
    const funcaoFiltro = selectFuncao ? selectFuncao.value : '';

    const selectStatus = document.getElementById('filtro-status-modal');
    const statusFiltro = selectStatus ? selectStatus.value : '';

    const numerosExibicao = listaNumerosGeral.filter(n => {
        // Apenas números do Sendflow podem ser atribuídos em campanhas (excluir Unnichat)
        const isUnnichat = n.plataforma === 'Unnichat' || n.equipe === 'UNNICHAT' || n.equipe === 'Unnichat';
        if (isUnnichat) return false;

        if (funcaoFiltro && n.funcao !== funcaoFiltro) return false;
        if (statusFiltro && n.atividade !== statusFiltro) return false;
        if (!termo) return true;
        return (n.nome && n.nome.toLowerCase().includes(termo)) ||
            (n.numero && n.numero.toLowerCase().includes(termo));
    });

    if (numerosExibicao.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--texto-muted); font-size: 12px; padding: 15px;">Nenhum número encontrado.</div>`;
        return;
    }

    numerosExibicao.forEach(num => {
        const idStr = String(num.id);
        const estaMarcado = mapNumerosSelecionados.has(idStr);
        const grupoAtual = mapNumerosSelecionados.get(idStr) || 'NORMAL';
        let classAtiv = obterClasseAtividadeCampanha(num.atividade);

        const itemRow = document.createElement('div');
        itemRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 6px;
            background-color: ${estaMarcado ? (grupoAtual === 'VIP' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(234, 88, 12, 0.12)') : 'rgba(255, 255, 255, 0.02)'};
            border: 1px solid ${estaMarcado ? (grupoAtual === 'VIP' ? '#f59e0b' : 'var(--laranja-brabo)') : 'transparent'};
            transition: all 0.2s;
        `;

        itemRow.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <input type="checkbox" class="cb-numero-item" value="${idStr}" ${estaMarcado ? 'checked' : ''} style="cursor: pointer; accent-color: var(--laranja-brabo);">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 13px; font-weight: 600; color: var(--texto-claro);">${num.nome}</span>
                    <span style="font-size: 11px; color: var(--texto-muted);">${num.numero}</span>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="badge ${classAtiv}" style="font-size: 10px; padding: 2px 6px;">${num.atividade}</span>
                <span style="font-size: 11px; color: var(--texto-muted);">${num.funcao || 'Reserva'}</span>
                
                ${estaMarcado ? `
                    <select class="sel-grupo-chip filter-select" data-id="${idStr}" style="font-size: 11px; padding: 3px 6px; font-weight: bold; background-color: ${grupoAtual === 'VIP' ? '#f59e0b' : (grupoAtual === 'AMBOS' ? '#9333ea' : 'var(--bg-secundario)')}; color: ${grupoAtual === 'VIP' ? '#000' : '#fff'};">
                        <option value="NORMAL" ${grupoAtual === 'NORMAL' ? 'selected' : ''}>📱 NORMAL</option>
                        <option value="VIP" ${grupoAtual === 'VIP' ? 'selected' : ''}>⭐ VIP</option>
                        <option value="AMBOS" ${grupoAtual === 'AMBOS' ? 'selected' : ''}>👑 AMBOS</option>
                    </select>
                ` : ''}
            </div>
        `;

        const checkbox = itemRow.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                mapNumerosSelecionados.set(idStr, 'NORMAL');
            } else {
                mapNumerosSelecionados.delete(idStr);
            }
            renderizarCheckboxesNumeros();
        });

        const selectGrupo = itemRow.querySelector('.sel-grupo-chip');
        if (selectGrupo) {
            selectGrupo.addEventListener('change', (e) => {
                mapNumerosSelecionados.set(idStr, e.target.value);
                renderizarCheckboxesNumeros();
            });
        }

        container.appendChild(itemRow);
    });
}

function filtrarNumerosModal() {
    renderizarCheckboxesNumeros();
}

function marcarTodosNumerosModal(marcar) {
    const checkboxes = document.querySelectorAll('#lista-checkbox-numeros-camp .cb-numero-item');
    checkboxes.forEach(cb => {
        if (marcar) {
            if (!mapNumerosSelecionados.has(cb.value)) {
                mapNumerosSelecionados.set(cb.value, 'NORMAL');
            }
        } else {
            mapNumerosSelecionados.delete(cb.value);
        }
    });
    renderizarCheckboxesNumeros();
}

function fecharModalCampanha() {
    const modal = document.getElementById('modal-campanha');
    if (modal) modal.style.display = 'none';
}

// Sincroniza a atividade dos números baseado no status de todas as campanhas
async function sincronizarStatusNumeros(campanhasAtualizadas) {
    try {
        const idsEmUso = new Set();
        campanhasAtualizadas.forEach(c => {
            if (c.status === 'Em Andamento') {
                (c.equipes || []).forEach(item => {
                    let idOuNome = item;
                    if (typeof item === 'string' && item.includes(':')) {
                        idOuNome = item.split(':')[0];
                    }
                    const numCorrespondente = listaNumerosGeral.find(n => String(n.id) === String(idOuNome) || n.nome === idOuNome);
                    if (numCorrespondente) idsEmUso.add(numCorrespondente.id);
                });
            }
        });

        const paraEmUso = [];
        const paraDisponivel = [];

        listaNumerosGeral.forEach(n => {
            const deveriaEstarEmUso = idsEmUso.has(n.id);
            if (deveriaEstarEmUso && n.atividade !== 'Em Uso') {
                paraEmUso.push(n.id);
                n.atividade = 'Em Uso';
            } else if (!deveriaEstarEmUso && n.atividade === 'Em Uso') {
                paraDisponivel.push(n.id);
                n.atividade = 'Disponível';
            }
        });

        if (paraEmUso.length > 0) {
            await DB.numerosControle.atualizarAtividade(paraEmUso, 'Em Uso');
        }
        if (paraDisponivel.length > 0) {
            await DB.numerosControle.atualizarAtividade(paraDisponivel, 'Disponível');
        }
    } catch (err) {
        console.error("Erro ao sincronizar status dos números:", err);
    }
}

async function removerNumeroDaCampanha(campId, numId) {
    const camp = listaCampanhas.find(c => c.id === campId);
    if (!camp) return;

    const numObj = listaNumerosGeral.find(n => n.id === numId);
    const nomeNum = numObj ? numObj.nome : `ID ${numId}`;

    if (confirm(`Deseja remover o número "${nomeNum}" desta campanha?`)) {
        const novosNumeros = (camp.equipes || []).filter(item => {
            let idStr = item;
            if (typeof item === 'string' && item.includes(':')) {
                idStr = item.split(':')[0];
            }
            return String(idStr) !== String(numId) && (numObj ? idStr !== numObj.nome : true);
        });

        camp.equipes = novosNumeros;

        await DB.campanhas.salvar(camp);
        await sincronizarStatusNumeros(listaCampanhas);
        await carregarDadosCampanhas();
    }
}

// --- MODAL DE EDIÇÃO DE NÚMERO NA CAMPANHA (GRUPO E FUNÇÃO) ---
function abrirModalEditarNumeroCampanha(campId, numId, grupoAtual = 'NORMAL') {
    const camp = listaCampanhas.find(c => c.id === campId);
    const num = listaNumerosGeral.find(n => n.id === numId);
    if (!camp || !num) return;

    document.getElementById('edit-numcamp-camp-id').value = campId;
    document.getElementById('edit-numcamp-num-id').value = numId;

    document.getElementById('edit-numcamp-nome-preview').innerText = num.nome || 'Sem Nome';
    document.getElementById('edit-numcamp-numero-preview').innerText = num.numero || '';

    document.getElementById('edit-numcamp-grupo').value = grupoAtual || 'NORMAL';
    document.getElementById('edit-numcamp-funcao').value = num.funcao || 'Envios';

    const modal = document.getElementById('modal-editar-numero-campanha');
    if (modal) modal.style.display = 'flex';
}

function fecharModalEditarNumeroCampanha() {
    const modal = document.getElementById('modal-editar-numero-campanha');
    if (modal) modal.style.display = 'none';
}

async function salvarEdicaoNumeroCampanha(e) {
    e.preventDefault();

    const campId = Number(document.getElementById('edit-numcamp-camp-id').value);
    const numId = Number(document.getElementById('edit-numcamp-num-id').value);
    const novoGrupo = document.getElementById('edit-numcamp-grupo').value;
    const novaFuncao = document.getElementById('edit-numcamp-funcao').value;

    const camp = listaCampanhas.find(c => c.id === campId);
    const num = listaNumerosGeral.find(n => n.id === numId);
    if (!camp || !num) return;

    // 1. Atualiza a função no chip (cnc_numeros_controle) se tiver mudado
    if (num.funcao !== novaFuncao) {
        num.funcao = novaFuncao;
        await DB.numerosControle.salvar(num);
    }

    // 2. Atualiza o grupo (VIP, NORMAL, AMBOS) na lista de equipes da campanha
    let alterouGrupo = false;
    const equipesAtualizadas = (camp.equipes || []).map(item => {
        let idStr = item;
        if (typeof item === 'string' && item.includes(':')) {
            idStr = item.split(':')[0];
        }
        if (String(idStr) === String(numId) || idStr === num.nome) {
            alterouGrupo = true;
            return `${numId}:${novoGrupo}`;
        }
        return item;
    });

    if (!alterouGrupo) {
        equipesAtualizadas.push(`${numId}:${novoGrupo}`);
    }

    camp.equipes = equipesAtualizadas;
    await DB.campanhas.salvar(camp);

    fecharModalEditarNumeroCampanha();
    await carregarDadosCampanhas();
}

async function excluirCampanha(id) {
    if (confirm("Tem certeza que deseja excluir esta campanha? Os números vinculados a ela serão liberados.")) {
        await DB.campanhas.deletar(id);
        listaCampanhas = listaCampanhas.filter(c => c.id !== id);
        await sincronizarStatusNumeros(listaCampanhas);
        await carregarDadosCampanhas();
    }
}

const formCampanha = document.getElementById('form-campanha');
if (formCampanha) {
    formCampanha.addEventListener('submit', async function (e) {
        e.preventDefault();

        const idValue = document.getElementById('edit-camp-id').value;
        const idAtual = idValue === '' ? null : Number(idValue);
        const nomeForm = document.getElementById('edit-camp-nome').value.trim();
        const expertForm = document.getElementById('edit-camp-expert').value;
        const statusForm = document.getElementById('edit-camp-status').value;
        const dataForm = document.getElementById('edit-camp-data').value;

        // Salva no formato "ID:GRUPO" (ex: "14:VIP", "15:NORMAL", "16:AMBOS")
        const numerosComGrupo = Array.from(mapNumerosSelecionados.entries()).map(([id, grupo]) => `${id}:${grupo}`);

        fecharModalCampanha();

        const campSalva = await DB.campanhas.salvar({
            id: idAtual,
            nome: nomeForm,
            expert: expertForm,
            status: statusForm,
            data: dataForm,
            equipes: numerosComGrupo
        });

        if (idAtual === null) {
            listaCampanhas.unshift(campSalva);
        } else {
            const idx = listaCampanhas.findIndex(c => c.id === idAtual);
            if (idx !== -1) listaCampanhas[idx] = campSalva;
        }

        await sincronizarStatusNumeros(listaCampanhas);
        await carregarDadosCampanhas();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosCampanhas();
});
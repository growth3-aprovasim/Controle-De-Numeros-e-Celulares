// js/script-celulares.js

let listaChips = []; 
let colunaAtual = 'nome';
let ordemCrescente = true; 

async function carregarDadosDoBanco() {
    try {
        listaChips = (await DB.numerosControle.listar()) || [];
        atualizarDropdownsFiltroUnnichat();
        ordenarPor(colunaAtual, true);
    } catch (erro) {
        console.error("Erro ao carregar dados dos chips:", erro);
    }
}

// --- POPULA DINAMICAMENTE OS DROPDOWNS DE BM E TARGET COM AS OPÇÕES CADASTRADAS ---
function atualizarDropdownsFiltroUnnichat() {
    const selBm = document.getElementById('filtro-bm');
    const selTarget = document.getElementById('filtro-target');

    const chipsUnnichat = listaChips.filter(c => c.plataforma === 'Unnichat' || c.equipe === 'UNNICHAT');

    const bms = Array.from(new Set(chipsUnnichat.map(c => c.bm && c.bm.trim()).filter(Boolean))).sort();
    const targets = Array.from(new Set(chipsUnnichat.map(c => c.target && c.target.trim()).filter(Boolean))).sort();

    if (selBm) {
        const valAtual = selBm.value;
        selBm.innerHTML = '<option value="">Todas</option>';
        bms.forEach(bm => {
            const opt = document.createElement('option');
            opt.value = bm;
            opt.innerText = bm;
            selBm.appendChild(opt);
        });
        selBm.value = bms.includes(valAtual) ? valAtual : '';
    }

    if (selTarget) {
        const valAtual = selTarget.value;
        selTarget.innerHTML = '<option value="">Todas</option>';
        targets.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.innerText = t;
            selTarget.appendChild(opt);
        });
        selTarget.value = targets.includes(valAtual) ? valAtual : '';
    }
}

// --- CONTROLE DE COLAPSO / EXPANSÃO DAS TABELAS ---
function alternarColapso(idElemento) {
    const card = document.getElementById(idElemento);
    if (card) {
        card.classList.toggle('colapsado');
    }
}

// --- ORDENAÇÃO INTELIGENTE PARA TODAS AS COLUNAS DO SENDFLOW ---
function ordenarPor(coluna, manterDirecao = false) {
    if (!manterDirecao) {
        if (colunaAtual === coluna) {
            ordemCrescente = !ordemCrescente;
        } else {
            colunaAtual = coluna;
            ordemCrescente = true;
        }
    }

    listaChips.sort((a, b) => {
        let valorA = a[coluna] !== undefined ? a[coluna] : '';
        let valorB = b[coluna] !== undefined ? b[coluna] : '';

        if (coluna === 'bans') {
            return ordemCrescente ? Number(valorA) - Number(valorB) : Number(valorB) - Number(valorA);
        }

        if (coluna === 'nome') {
            let regex = /^([a-zA-Z\s\(\)]*)(\d*)$/;
            let matchA = valorA.toString().trim().match(regex);
            let matchB = valorB.toString().trim().match(regex);

            if (matchA && matchB && matchA[2] !== '' && matchB[2] !== '') {
                let textoA = matchA[1].toLowerCase();
                let textoB = matchB[1].toLowerCase();

                if (textoA === textoB) {
                    let numA = parseInt(matchA[2], 10);
                    let numB = parseInt(matchB[2], 10);
                    return ordemCrescente ? numA - numB : numB - numA;
                }
            }
        }

        let strA = valorA.toString().toLowerCase();
        let strB = valorB.toString().toLowerCase();

        if (strA < strB) return ordemCrescente ? -1 : 1;
        if (strA > strB) return ordemCrescente ? 1 : -1;
        return 0;
    });

    atualizarIconesOrdenacao();
    filtrarTodosChips(); 
}

function atualizarIconesOrdenacao() {
    const icones = {
        'nome': 'icone-ordem-nome',
        'numero': 'icone-ordem-numero',
        'atividade': 'icone-ordem-atividade',
        'funcao': 'icone-ordem-funcao',
        'qualidade': 'icone-ordem-qualidade',
        'bans': 'icone-ordem-bans'
    };

    for (let key in icones) {
        const el = document.getElementById(icones[key]);
        if (el) el.innerText = 'sort';
    }

    const iconeAtivo = document.getElementById(icones[colunaAtual]);
    if (iconeAtivo) {
        iconeAtivo.innerText = ordemCrescente ? 'arrow_downward' : 'arrow_upward';
    }
}

function aplicarMascara(input) {
    let valor = input.value.replace(/\D/g, '');
    let formatado = '';
    if (valor.length > 0) formatado = '(' + valor.substring(0, 2);
    if (valor.length > 2) {
        if (valor.length > 10) {
            formatado += ') ' + valor.substring(2, 7) + '-' + valor.substring(7, 11);
        } else {
            formatado += ') ' + valor.substring(2, 6) + '-' + valor.substring(6, 10);
        }
    }
    input.value = formatado;
}

function obterClasseAtividade(atividade) {
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

function obterClasseQualidade(qualidade) {
    switch (qualidade) {
        case 'Alta': return 'bg-qual-alta';
        case 'Média': return 'bg-qual-media';
        case 'Baixa': return 'bg-qual-baixa';
        default: return 'bg-qual-media';
    }
}

// --- FILTRO AVANÇADO UNIFICADO ---
function filtrarTodosChips() {
    const inputFiltro = document.getElementById('input-filtro-chips');
    const termo = inputFiltro ? inputFiltro.value.toLowerCase().trim() : '';

    // Filtros Sendflow
    const selStatus = document.getElementById('filtro-status');
    const statusVal = selStatus ? selStatus.value : '';

    const selFuncao = document.getElementById('filtro-funcao');
    const funcaoVal = selFuncao ? selFuncao.value : '';

    const selQualidade = document.getElementById('filtro-qualidade');
    const qualidadeVal = selQualidade ? selQualidade.value : '';

    // Filtros Unnichat (Dropdowns com seleção rápida)
    const selBm = document.getElementById('filtro-bm');
    const bmVal = selBm ? selBm.value.toLowerCase().trim() : '';

    const selTarget = document.getElementById('filtro-target');
    const targetVal = selTarget ? selTarget.value.toLowerCase().trim() : '';

    // Separar chips por plataforma
    const chipsSendflow = listaChips.filter(item => {
        const isUnnichat = item.plataforma === 'Unnichat' || item.equipe === 'UNNICHAT';
        if (isUnnichat) return false;

        if (statusVal && item.atividade !== statusVal) return false;
        if (funcaoVal && item.funcao !== funcaoVal) return false;
        if (qualidadeVal && item.qualidade !== qualidadeVal) return false;

        if (termo) {
            const matchNome = item.nome && item.nome.toLowerCase().includes(termo);
            const matchNumero = item.numero && item.numero.toLowerCase().includes(termo);
            const matchAtividade = item.atividade && item.atividade.toLowerCase().includes(termo);
            const matchFuncao = item.funcao && item.funcao.toLowerCase().includes(termo);
            const matchJuizo = item.juizo && item.juizo.toLowerCase().includes(termo);
            if (!matchNome && !matchNumero && !matchAtividade && !matchFuncao && !matchJuizo) {
                return false;
            }
        }

        return true;
    });

    const chipsUnnichat = listaChips.filter(item => {
        const isUnnichat = item.plataforma === 'Unnichat' || item.equipe === 'UNNICHAT';
        if (!isUnnichat) return false;

        if (bmVal && (!item.bm || item.bm.toLowerCase().trim() !== bmVal)) return false;
        if (targetVal && (!item.target || item.target.toLowerCase().trim() !== targetVal)) return false;

        if (termo) {
            const matchNome = item.nome && item.nome.toLowerCase().includes(termo);
            const matchNumero = item.numero && item.numero.toLowerCase().includes(termo);
            const matchBm = item.bm && item.bm.toLowerCase().includes(termo);
            const matchTarget = item.target && item.target.toLowerCase().includes(termo);
            if (!matchNome && !matchNumero && !matchBm && !matchTarget) {
                return false;
            }
        }

        return true;
    });

    renderizarTabelaSendflow(chipsSendflow);
    renderizarTabelaUnnichat(chipsUnnichat);
}

function limparFiltrosSendflow() {
    if (document.getElementById('filtro-status')) document.getElementById('filtro-status').value = '';
    if (document.getElementById('filtro-funcao')) document.getElementById('filtro-funcao').value = '';
    if (document.getElementById('filtro-qualidade')) document.getElementById('filtro-qualidade').value = '';
    filtrarTodosChips();
}

function limparFiltrosUnnichat() {
    if (document.getElementById('filtro-bm')) document.getElementById('filtro-bm').value = '';
    if (document.getElementById('filtro-target')) document.getElementById('filtro-target').value = '';
    filtrarTodosChips();
}

// --- RENDERIZAÇÃO DA TABELA SENDFLOW ---
function renderizarTabelaSendflow(dados) {
    const tbody = document.getElementById('tabela-chips-sendflow');
    const badgeContador = document.getElementById('badge-contador-sendflow');
    if (badgeContador) badgeContador.innerText = `${dados.length} números`;
    if (!tbody) return;

    tbody.innerHTML = '';

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--texto-muted); padding: 25px;">Nenhum chip Sendflow encontrado.</td></tr>`;
        return;
    }

    dados.forEach(chip => {
        let classAtiv = obterClasseAtividade(chip.atividade);
        let classFunc = chip.funcao === 'Envios' ? 'bg-func-envios' : (chip.funcao === 'Criador' ? 'bg-func-criador' : 'bg-func-reserva');
        let classQual = obterClasseQualidade(chip.qualidade);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 15px 20px; font-weight: 500;">${chip.nome}</td>
            <td style="padding: 15px 20px; color: var(--texto-claro);">${chip.numero}</td>
            <td style="padding: 15px 20px; text-align: center;"><span class="badge ${classAtiv}">${chip.atividade || 'Disponível'}</span></td>
            <td style="padding: 15px 20px; text-align: center;"><span class="badge ${classFunc}">${chip.funcao || 'Reserva'}</span></td>
            <td style="padding: 15px 20px; text-align: center;"><span class="badge ${classQual}">${chip.qualidade || 'Média'}</span></td>
            <td style="padding: 15px 20px; text-align: center; font-weight: bold; color: ${chip.bans > 0 ? '#ef4444' : 'var(--texto-muted)'};">${chip.bans !== undefined ? chip.bans : 0}</td>
            <td style="padding: 15px 20px; text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn-icon" title="Ver Histórico nas Campanhas" onclick="abrirHistoricoChip(${chip.id})" style="color: var(--laranja-brabo);">
                    <span class="material-icons-round">history</span>
                </button>
                <button class="btn-icon" title="Editar" onclick="abrirModalChip(${chip.id})">
                    <span class="material-icons-round">edit</span>
                </button>
                <button class="btn-icon" title="Remover" onclick="removerChip(${chip.id})" style="color: #ef4444;">
                    <span class="material-icons-round">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- RENDERIZAÇÃO DA TABELA UNNICHAT ---
function renderizarTabelaUnnichat(dados) {
    const tbody = document.getElementById('tabela-chips-unnichat');
    const badgeContador = document.getElementById('badge-contador-unnichat');
    if (badgeContador) badgeContador.innerText = `${dados.length} números`;
    if (!tbody) return;

    tbody.innerHTML = '';

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--texto-muted); padding: 25px;">Nenhum chip Unnichat encontrado.</td></tr>`;
        return;
    }

    dados.forEach(chip => {
        const bmTexto = chip.bm ? chip.bm : '-';
        const targetTexto = chip.target ? chip.target : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 15px 20px; font-weight: 500;">${chip.nome}</td>
            <td style="padding: 15px 20px; color: var(--texto-claro);">${chip.numero}</td>
            <td style="padding: 15px 20px; text-align: center;">
                <span class="badge" style="background-color: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 600;">
                    ${bmTexto}
                </span>
            </td>
            <td style="padding: 15px 20px; text-align: center;">
                <span class="badge" style="background-color: rgba(255, 255, 255, 0.05); color: var(--texto-claro); border: 1px solid var(--bordas);">
                    ${targetTexto}
                </span>
            </td>
            <td style="padding: 15px 20px; text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn-icon" title="Editar" onclick="abrirModalChip(${chip.id})">
                    <span class="material-icons-round">edit</span>
                </button>
                <button class="btn-icon" title="Remover" onclick="removerChip(${chip.id})" style="color: #ef4444;">
                    <span class="material-icons-round">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- CONTROLE DOS CAMPOS DINÂMICOS DO MODAL ---
function alternarCamposPlataforma() {
    const plat = document.getElementById('edit-plataforma').value;
    const boxSendflow = document.getElementById('campos-sendflow');
    const boxUnnichat = document.getElementById('campos-unnichat');

    if (plat === 'Unnichat') {
        if (boxSendflow) boxSendflow.style.display = 'none';
        if (boxUnnichat) boxUnnichat.style.display = 'grid';
    } else {
        if (boxSendflow) boxSendflow.style.display = 'grid';
        if (boxUnnichat) boxUnnichat.style.display = 'none';
    }
}

function configurarSelectAtividade(valorAtual = 'Disponível') {
    const elAtividade = document.getElementById('edit-num-atividade');
    if (!elAtividade) return;

    elAtividade.innerHTML = '';
    
    if (valorAtual === 'Em Uso') {
        const optUso = document.createElement('option');
        optUso.value = 'Em Uso';
        optUso.innerText = 'Em Uso (Em Campanha)';
        elAtividade.appendChild(optUso);
    }

    const opcoes = ['Disponível', 'Em Análise', 'Reconectar', 'Banido'];
    opcoes.forEach(opt => {
        const elOpt = document.createElement('option');
        elOpt.value = opt;
        elOpt.innerText = opt;
        elAtividade.appendChild(elOpt);
    });

    elAtividade.value = valorAtual || 'Disponível';
}

function abrirModalChip(id = null) {
    if (id !== null && id !== undefined) {
        const chipId = Number(id);
        const chip = listaChips.find(c => c.id === chipId || c.id === id);
        if (!chip) return;

        const plat = chip.plataforma === 'Unnichat' || chip.equipe === 'UNNICHAT' ? 'Unnichat' : 'Sendflow';

        if (document.getElementById('edit-id')) document.getElementById('edit-id').value = chip.id;
        if (document.getElementById('edit-plataforma')) document.getElementById('edit-plataforma').value = plat;
        if (document.getElementById('edit-nome')) document.getElementById('edit-nome').value = chip.nome || '';
        if (document.getElementById('edit-numero')) document.getElementById('edit-numero').value = chip.numero || '';
        
        // Campos Sendflow
        configurarSelectAtividade(chip.atividade || 'Disponível');
        if (document.getElementById('edit-funcao')) document.getElementById('edit-funcao').value = chip.funcao || 'Envios';
        if (document.getElementById('edit-qualidade')) document.getElementById('edit-qualidade').value = chip.qualidade || 'Alta';
        if (document.getElementById('edit-juizo')) document.getElementById('edit-juizo').value = chip.juizo || '';
        
        // Campos Unnichat
        if (document.getElementById('edit-bm')) document.getElementById('edit-bm').value = chip.bm || '';
        if (document.getElementById('edit-target')) document.getElementById('edit-target').value = chip.target || '';

        const titulo = document.getElementById('modal-titulo');
        if (titulo) titulo.innerText = `Editar Número (${plat})`;
    } else {
        if (document.getElementById('edit-id')) document.getElementById('edit-id').value = '';
        if (document.getElementById('edit-plataforma')) document.getElementById('edit-plataforma').value = 'Sendflow';
        if (document.getElementById('edit-nome')) document.getElementById('edit-nome').value = '';
        if (document.getElementById('edit-numero')) document.getElementById('edit-numero').value = '';
        
        configurarSelectAtividade('Disponível');
        if (document.getElementById('edit-funcao')) document.getElementById('edit-funcao').value = 'Envios';
        if (document.getElementById('edit-qualidade')) document.getElementById('edit-qualidade').value = 'Alta';
        if (document.getElementById('edit-juizo')) document.getElementById('edit-juizo').value = '';
        
        if (document.getElementById('edit-bm')) document.getElementById('edit-bm').value = '';
        if (document.getElementById('edit-target')) document.getElementById('edit-target').value = '';

        const titulo = document.getElementById('modal-titulo');
        if (titulo) titulo.innerText = 'Adicionar Novo Número';
    }

    alternarCamposPlataforma();
    const modal = document.getElementById('modal-chip');
    if (modal) modal.style.display = 'flex';
}

function fecharModalChip() {
    const modal = document.getElementById('modal-chip');
    if (modal) modal.style.display = 'none';
}

const formChip = document.getElementById('form-chip');
if (formChip) {
    formChip.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        
        const idValue = document.getElementById('edit-id') ? document.getElementById('edit-id').value : '';
        const plataformaForm = document.getElementById('edit-plataforma') ? document.getElementById('edit-plataforma').value : 'Sendflow';
        const nomeForm = document.getElementById('edit-nome') ? document.getElementById('edit-nome').value.trim() : '';
        const numeroForm = document.getElementById('edit-numero') ? document.getElementById('edit-numero').value.trim() : '';
        
        const selectAtividade = document.getElementById('edit-num-atividade');
        let atividadeForm = selectAtividade ? selectAtividade.value : 'Disponível';

        const funcaoForm = document.getElementById('edit-funcao') ? document.getElementById('edit-funcao').value : 'Envios';
        const qualidadeForm = document.getElementById('edit-qualidade') ? document.getElementById('edit-qualidade').value : 'Alta';
        const juizoForm = document.getElementById('edit-juizo') ? document.getElementById('edit-juizo').value.trim() : '';

        const bmForm = document.getElementById('edit-bm') ? document.getElementById('edit-bm').value.trim() : '';
        const targetForm = document.getElementById('edit-target') ? document.getElementById('edit-target').value.trim() : '';

        const idAtual = idValue === '' ? null : Number(idValue);

        // Validações de duplicidade
        const nomeDuplicado = listaChips.find(c => c.nome && c.nome.toLowerCase() === nomeForm.toLowerCase() && c.id !== idAtual);
        if (nomeDuplicado) {
            alert(`❌ Erro: O nome "${nomeForm}" já está cadastrado no sistema!`);
            return; 
        }

        const numeroDuplicado = listaChips.find(c => c.numero === numeroForm && c.id !== idAtual);
        if (numeroDuplicado) {
            alert(`❌ Erro: O número ${numeroForm} já está atrelado ao cadastro "${numeroDuplicado.nome}".`);
            return; 
        }

        let chipExistente = idAtual !== null ? listaChips.find(c => c.id === idAtual) : null;
        let bansCalculados = chipExistente ? (chipExistente.bans || 0) : 0;

        if (plataformaForm === 'Sendflow' && atividadeForm === 'Banido') {
            if (!chipExistente || chipExistente.atividade !== 'Banido') {
                bansCalculados += 1;
            }
        }

        // --- VERIFICAÇÃO AUTOMÁTICA DE CAMPANHA ATIVA ---
        // Se o número estava banido/reconectar e foi alterado para Disponível, verificar se ele está em alguma campanha Em Andamento.
        // Se estiver, mudar automaticamente para "Em Uso"!
        if (atividadeForm === 'Disponível') {
            try {
                const campanhasAtivas = (await DB.campanhas.listar()) || [];
                const estaEmCampanhaAndamento = campanhasAtivas.some(camp => {
                    if (camp.status !== 'Em Andamento') return false;
                    return (camp.equipes || []).some(item => {
                        let idOuNome = item;
                        if (typeof item === 'string' && item.includes(':')) {
                            idOuNome = item.split(':')[0];
                        }
                        return String(idOuNome) === String(idAtual) || idOuNome === nomeForm;
                    });
                });

                if (estaEmCampanhaAndamento) {
                    atividadeForm = 'Em Uso';
                }
            } catch (errCamp) {
                console.error("Erro ao verificar campanhas ativas:", errCamp);
            }
        }

        fecharModalChip();

        const itemAtualizado = await DB.numerosControle.salvar({
            id: idAtual,
            equipe: plataformaForm === 'Unnichat' ? 'UNNICHAT' : 'SENDFLOW',
            plataforma: plataformaForm,
            nome: nomeForm,
            numero: numeroForm,
            atividade: plataformaForm === 'Unnichat' ? 'Disponível' : atividadeForm,
            funcao: plataformaForm === 'Unnichat' ? 'Envios' : funcaoForm,
            bans: bansCalculados,
            qualidade: qualidadeForm,
            juizo: juizoForm,
            bm: bmForm,
            target: targetForm,
            statusEquipe: "Disponível",
            expert: ["Mateus"]
        });

        if (idAtual === null) {
            listaChips.push(itemAtualizado);
        } else {
            const index = listaChips.findIndex(c => c.id === idAtual);
            if (index !== -1) {
                listaChips[index] = { ...itemAtualizado };
            }
        }

        await carregarDadosDoBanco();
    });
}

async function removerChip(id) {
    const chipId = Number(id);
    const chip = listaChips.find(c => c.id === chipId || c.id === id);
    if (!chip) return;

    if (confirm(`Tem certeza que deseja remover o número "${chip.nome}"?`)) {
        try {
            const sucesso = await DB.numerosControle.deletar(chipId);
            if (sucesso !== false) {
                listaChips = listaChips.filter(n => n.id !== chipId && n.id !== id);
                filtrarTodosChips();
            } else {
                alert("Erro ao excluir o número do banco de dados.");
            }
        } catch (err) {
            console.error("Erro ao deletar:", err);
            alert("Erro ao excluir o número.");
        }
        await carregarDadosDoBanco();
    }
}

// --- MODAL DE HISTÓRICO COMPLETO DO CHIP ---
async function abrirHistoricoChip(id) {
    const chip = listaChips.find(c => c.id === Number(id));
    if (!chip) return;

    const modal = document.getElementById('modal-historico-chip');
    const elTitulo = document.getElementById('hist-chip-titulo');
    const elResumo = document.getElementById('hist-chip-resumo');
    const elLista = document.getElementById('hist-chip-campanhas-lista');

    if (elTitulo) elTitulo.innerText = `Histórico de ${chip.nome} (${chip.numero})`;

    let classAtiv = obterClasseAtividade(chip.atividade);
    let classFunc = chip.funcao === 'Envios' ? 'bg-func-envios' : (chip.funcao === 'Criador' ? 'bg-func-criador' : 'bg-func-reserva');
    let classQual = obterClasseQualidade(chip.qualidade);

    if (elResumo) {
        elResumo.innerHTML = `
            <div>
                <span style="font-size: 11px; color: var(--texto-muted); display: block;">Status Atual:</span>
                <span class="badge ${classAtiv}" style="margin-top: 4px;">${chip.atividade}</span>
            </div>
            <div>
                <span style="font-size: 11px; color: var(--texto-muted); display: block;">Função:</span>
                <span class="badge ${classFunc}" style="margin-top: 4px;">${chip.funcao || 'Reserva'}</span>
            </div>
            <div>
                <span style="font-size: 11px; color: var(--texto-muted); display: block;">Qualidade:</span>
                <span class="badge ${classQual}" style="margin-top: 4px;">${chip.qualidade || 'Média'}</span>
            </div>
            <div>
                <span style="font-size: 11px; color: var(--texto-muted); display: block;">Total de Bans:</span>
                <b style="font-size: 16px; color: ${chip.bans > 0 ? '#ef4444' : '#10b981'}; margin-top: 2px; display: inline-block;">${chip.bans || 0} bans</b>
            </div>
        `;
    }

    if (elLista) {
        elLista.innerHTML = `<div style="text-align: center; padding: 15px; color: var(--texto-muted);">Carregando campanhas...</div>`;
    }

    if (modal) modal.style.display = 'flex';

    try {
        const campanhas = (await DB.campanhas.listar()) || [];
        const campanhasDoChip = [];

        campanhas.forEach(camp => {
            const alocados = camp.equipes || [];
            alocados.forEach(item => {
                let match = false;
                let grupo = 'NORMAL';

                if (typeof item === 'string' && item.includes(':')) {
                    const [idStr, grp] = item.split(':');
                    if (idStr === String(chip.id) || idStr === chip.nome) {
                        match = true;
                        grupo = grp || 'NORMAL';
                    }
                } else if (String(item) === String(chip.id) || item === chip.nome) {
                    match = true;
                    grupo = 'NORMAL';
                }

                if (match) {
                    campanhasDoChip.push({
                        campanha: camp,
                        grupo: grupo
                    });
                }
            });
        });

        if (!elLista) return;

        if (campanhasDoChip.length === 0) {
            elLista.innerHTML = `<div style="text-align: center; color: var(--texto-muted); padding: 20px; font-size: 13px;">Este número ainda não foi alocado em nenhuma campanha.</div>`;
        } else {
            elLista.innerHTML = '';
            campanhasDoChip.forEach(reg => {
                const camp = reg.campanha;
                const grp = reg.grupo;

                let corStatus = camp.status === 'Em Andamento' ? '#10b981' : (camp.status === 'Encerrada' ? '#6b7280' : '#3b82f6');
                let badgeGrupo = grp === 'VIP' ? `<span class="badge badge-vip">⭐ GRUPO VIP</span>` : (grp === 'AMBOS' ? `<span class="badge badge-ambos">👑 AMBOS</span>` : `<span class="badge badge-normal">📱 NORMAL</span>`);

                const cardCamp = document.createElement('div');
                cardCamp.style.cssText = `
                    background-color: var(--bg-card);
                    border: 1px solid var(--bordas);
                    border-radius: 6px;
                    padding: 12px 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                cardCamp.innerHTML = `
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <b style="color: var(--texto-claro); font-size: 14px;">${camp.nome}</b>
                            <span class="badge" style="background-color: ${corStatus}20; color: ${corStatus}; font-size: 10px; padding: 2px 6px;">${camp.status}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--texto-muted); display: flex; gap: 15px;">
                            <span>Data: <b>${camp.data ? camp.data.split('-').reverse().join('/') : 'Sem data'}</b></span>
                            <span>Expert: <b>${camp.expert || 'Geral'}</b></span>
                        </div>
                    </div>
                    <div>
                        ${badgeGrupo}
                    </div>
                `;
                elLista.appendChild(cardCamp);
            });
        }
    } catch (err) {
        console.error("Erro ao carregar histórico:", err);
        if (elLista) elLista.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 10px;">Erro ao carregar histórico.</div>`;
    }
}

function fecharModalHistorico() {
    const modal = document.getElementById('modal-historico-chip');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosDoBanco();
    DB.assinarMudancas('cnc_numeros_controle', () => carregarDadosDoBanco());
});
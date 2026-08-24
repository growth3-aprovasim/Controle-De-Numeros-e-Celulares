// js/script-api.js

let listaApi = [];
let todosChips = [];

async function carregarDadosInteg() {
    await carregarDadosApi();
    await carregarChipsParaSimulador();
}

function trocarAbaInteg(aba) {
    const btnWebhook = document.getElementById('tab-btn-webhook');
    const btnApi = document.getElementById('tab-btn-api');
    const secaoWebhook = document.getElementById('secao-webhook');
    const secaoApi = document.getElementById('secao-api');

    if (aba === 'webhook') {
        btnWebhook.classList.add('active');
        btnApi.classList.remove('active');
        secaoWebhook.style.display = 'flex';
        secaoApi.style.display = 'none';
    } else {
        btnApi.classList.add('active');
        btnWebhook.classList.remove('active');
        secaoWebhook.style.display = 'none';
        secaoApi.style.display = 'flex';
    }
}

// --- WEBHOOK SENDFLOW (SIMULADOR E TESTES) ---

async function carregarChipsParaSimulador() {
    try {
        todosChips = (await DB.numerosControle.listar()) || [];
        const select = document.getElementById('simula-chip-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Escolha um chip para preencher automaticamente --</option>';
        todosChips.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = `${c.nome} (${c.numero}) - Status Atual: [${c.atividade || 'Disponível'}]`;
            select.appendChild(opt);
        });

        atualizarJsonSimulacao();
    } catch (e) {
        console.error("Erro ao carregar chips para simulador:", e);
    }
}

function preencherCamposSimulacao() {
    const select = document.getElementById('simula-chip-select');
    const id = select.value;
    if (!id) return;

    const chip = todosChips.find(c => String(c.id) === String(id));
    if (chip) {
        document.getElementById('simula-name').value = chip.nome;
        document.getElementById('simula-number').value = String(chip.numero || '').replace(/\D/g, '');
        atualizarJsonSimulacao();
    }
}

function gerarPayloadAtual() {
    const nome = document.getElementById('simula-name') ? document.getElementById('simula-name').value : 'Minha Conta';
    const numero = document.getElementById('simula-number') ? document.getElementById('simula-number').value : '5511999999999';
    const reason = document.getElementById('simula-reason') ? document.getElementById('simula-reason').value : 'account-banned';

    return {
        id: "TESTE_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        event: "account.logged-out",
        data: {
            accountId: "ACC_" + Math.random().toString(36).substring(2, 12).toUpperCase(),
            number: numero,
            name: nome,
            userId: "USER_" + Math.random().toString(36).substring(2, 12).toUpperCase(),
            reason: reason,
            reasonMessage: reason,
            disconnectedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            createdAt_with_timezone_br: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
        },
        version: "1.0.0"
    };
}

function atualizarJsonSimulacao() {
    const box = document.getElementById('box-json-preview');
    if (!box) return;
    const payload = gerarPayloadAtual();
    box.innerText = JSON.stringify(payload, null, 2);
}

// Event listeners para inputs da simulação
['simula-name', 'simula-number'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', atualizarJsonSimulacao);
});

async function executarSimulacaoWebhook(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-simulacao');
    const payload = gerarPayloadAtual();

    if (resultadoDiv) {
        resultadoDiv.style.display = 'block';
        resultadoDiv.style.background = 'rgba(59, 130, 246, 0.1)';
        resultadoDiv.style.border = '1px solid #3b82f6';
        resultadoDiv.style.color = '#93c5fd';
        resultadoDiv.innerHTML = '⏳ Processando webhook no banco de dados Supabase...';
    }

    try {
        const res = await DB.numerosControle.processarWebhookSendflow(payload);

        if (res.success) {
            resultadoDiv.style.background = res.isBanido ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)';
            resultadoDiv.style.border = res.isBanido ? '1px solid #ef4444' : '1px solid #a855f7';
            resultadoDiv.style.color = res.isBanido ? '#fca5a5' : '#d8b4fe';
            resultadoDiv.innerHTML = `
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
                    ${res.isBanido ? '🚫 CONTA BANIDA DETECTADA' : '🔄 CONTA DESCONECTADA (RECONECTAR)'}
                </div>
                <div><b>Chip Atualizado:</b> ${res.chipNome} (${res.chipNumero})</div>
                <div><b>Status:</b> ${res.statusAnterior} ➡️ <span style="text-decoration: underline; font-weight: bold;">${res.novoStatus}</span></div>
                <div><b>Total de Bans Registrados:</b> ${res.totalBans}</div>
                <div style="font-size: 11px; margin-top: 6px; opacity: 0.8;">Motivo reportado pelo Sendflow: "${res.reason}"</div>
            `;
            await carregarChipsParaSimulador();
        } else {
            resultadoDiv.style.background = 'rgba(245, 158, 11, 0.15)';
            resultadoDiv.style.border = '1px solid #f59e0b';
            resultadoDiv.style.color = '#fcd34d';
            resultadoDiv.innerHTML = `
                <b>⚠️ Atenção:</b> ${res.error || 'Não foi possível localizar o chip no banco de dados.'}
            `;
        }
    } catch (err) {
        console.error("Erro na simulação:", err);
        resultadoDiv.style.background = 'rgba(239, 68, 68, 0.15)';
        resultadoDiv.style.border = '1px solid #ef4444';
        resultadoDiv.style.color = '#fca5a5';
        resultadoDiv.innerHTML = `<b>❌ Erro:</b> ${err.message}`;
    }
}

function copiarTexto(idElemento) {
    const el = document.getElementById(idElemento);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
        alert("📋 URL copiada com sucesso para a área de transferência!");
    }).catch(err => {
        console.error("Erro ao copiar:", err);
    });
}

// --- GESTÃO DE NÚMEROS DE API ---

async function carregarDadosApi() {
    try {
        listaApi = await DB.apiNumeros.listar();
        renderizarTabelaApi();
    } catch (erro) {
        console.error("Erro ao carregar banco de API:", erro);
    }
}

function renderizarTabelaApi(dados = listaApi) {
    const tbody = document.getElementById('tabela-api-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (dados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--texto-muted); padding: 20px;">Nenhum número de API cadastrado.</td></tr>`;
        return;
    }

    dados.forEach(item => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="text-align: center; font-weight: 500; font-family: monospace; font-size: 14px;">${item.numero}</td>
                <td style="color: var(--texto-claro);">${item.descricao}</td>
                <td style="text-align: center;">
                    <button class="btn-icon" title="Editar" onclick="abrirModalApi(${item.id})">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="btn-icon" title="Excluir" onclick="excluirApi(${item.id})" style="color: #ef4444;">
                        <span class="material-icons-round">delete</span>
                    </button>
                </td>
            </tr>
        `;
    });
}

function filtrarApi() {
    const termo = document.getElementById('input-filtro-api').value.toLowerCase();
    const filtrados = listaApi.filter(item => 
        item.numero.toLowerCase().includes(termo) || 
        item.descricao.toLowerCase().includes(termo)
    );
    renderizarTabelaApi(filtrados);
}

function abrirModalApi(id = null) {
    if (id) {
        const item = listaApi.find(a => a.id === id);
        if (!item) return;

        document.getElementById('modal-titulo-api').innerText = 'Editar Número API';
        document.getElementById('edit-api-id').value = item.id;
        document.getElementById('edit-api-numero').value = item.numero;
        document.getElementById('edit-api-desc').value = item.descricao;
    } else {
        document.getElementById('modal-titulo-api').innerText = 'Adicionar Número API';
        document.getElementById('edit-api-id').value = '';
        document.getElementById('edit-api-numero').value = '';
        document.getElementById('edit-api-desc').value = '';
    }

    document.getElementById('modal-api').style.display = 'flex';
}

function fecharModalApi() {
    document.getElementById('modal-api').style.display = 'none';
}

async function excluirApi(id) {
    if (confirm("Tem certeza que deseja excluir este número das integrações de API?")) {
        await DB.apiNumeros.deletar(id);
        await carregarDadosApi();
    }
}

const formApi = document.getElementById('form-api');
if (formApi) {
    formApi.addEventListener('submit', async function(e) {
        e.preventDefault();

        const idValue = document.getElementById('edit-api-id').value;
        const idAtual = idValue === '' ? null : parseInt(idValue);
        const numeroForm = document.getElementById('edit-api-numero').value.trim();
        const descForm = document.getElementById('edit-api-desc').value.trim();

        await DB.apiNumeros.salvar({
            id: idAtual,
            numero: numeroForm,
            descricao: descForm
        });

        fecharModalApi();
        await carregarDadosApi();
    });
}

carregarDadosInteg();
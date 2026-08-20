// js/script-api.js

let listaApi = [];

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

document.getElementById('form-api').addEventListener('submit', async function(e) {
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

carregarDadosApi();
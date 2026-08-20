// js/script-mapa.js

let listaAparelhos = [];

async function carregarDadosMapa() {
    try {
        listaAparelhos = await DB.mapaAparelhos.listar();
        renderizarMapa();
    } catch (erro) {
        console.error("Erro ao carregar mapa:", erro);
    }
}

function renderizarMapa() {
    // Limpa as colunas (mantendo o titulo)
    const colunas = ["Esquerda", "Centro", "Direita"];
    
    colunas.forEach(col => {
        const divCol = document.getElementById(`col-${col}`);
        if (!divCol) return;
        divCol.innerHTML = `<div class="mapa-col-titulo">${col}</div>`;
    });

    // Ordena por linha (de cima para baixo)
    const aparelhosOrdenados = [...listaAparelhos].sort((a, b) => a.linha - b.linha);

    aparelhosOrdenados.forEach(aparelho => {
        const divCol = document.getElementById(`col-${aparelho.coluna}`);
        if (!divCol) return;

        const maxSlots = aparelho.maxSlots || 6;
        const chipsAlocados = aparelho.chips || [];
        
        // Conta os ocupados
        const ocupados = chipsAlocados.filter(c => c.trim() !== '' && c.trim().toLowerCase() !== 'x').length;
        
        // Define a Cor / Classe (A Regra de Ouro)
        let classeCor = 'aparelho-cheio'; // Padrão: sem espaço
        if (maxSlots < 6) {
            classeCor = 'aparelho-restrito'; // Menos espaços que o normal
        } else if (ocupados < maxSlots) {
            classeCor = 'aparelho-disponivel'; // Tem espaço
        }

        // Monta a string visual com o X (ex: 130 // 90 // x // x)
        let displayHtmlArray = [];
        for (let i = 0; i < maxSlots; i++) {
            let val = chipsAlocados[i];
            if (!val || val.trim() === '' || val.trim().toLowerCase() === 'x') {
                displayHtmlArray.push(`<span class="slot-vazio">x</span>`);
            } else {
                displayHtmlArray.push(`<span>${val.trim()}</span>`);
            }
        }
        
        const displayFinal = displayHtmlArray.join(`<span class="slot-separator">//</span>`);

        const cardHtml = `
            <div class="aparelho-card ${classeCor}">
                ${displayFinal}
                <div class="aparelho-acoes">
                    <button type="button" title="Editar" onclick="abrirModalMapa(${aparelho.id})"><span class="material-icons-round" style="font-size: 14px;">edit</span></button>
                    <button type="button" class="del" title="Excluir" onclick="excluirMapa(${aparelho.id})"><span class="material-icons-round" style="font-size: 14px;">close</span></button>
                </div>
            </div>
        `;
        
        divCol.innerHTML += cardHtml;
    });
}

function abrirModalMapa(id = null) {
    if (id) {
        const ap = listaAparelhos.find(a => a.id === id);
        if (!ap) return;

        document.getElementById('modal-titulo-mapa').innerText = 'Editar Aparelho';
        document.getElementById('edit-mapa-id').value = ap.id;
        document.getElementById('edit-mapa-coluna').value = ap.coluna;
        document.getElementById('edit-mapa-linha').value = ap.linha;
        document.getElementById('edit-mapa-max').value = ap.maxSlots;
        
        // Remove os 'x' para facilitar a edição do usuário
        const chipsLimpos = ap.chips.filter(c => c.toLowerCase() !== 'x').join(" ");
        document.getElementById('edit-mapa-chips').value = chipsLimpos;
    } else {
        document.getElementById('modal-titulo-mapa').innerText = 'Novo Aparelho';
        document.getElementById('edit-mapa-id').value = '';
        document.getElementById('edit-mapa-linha').value = (listaAparelhos.length > 0) ? Math.max(...listaAparelhos.map(a => a.linha)) + 1 : 1;
        document.getElementById('edit-mapa-coluna').value = 'Esquerda';
        document.getElementById('edit-mapa-max').value = '6';
        document.getElementById('edit-mapa-chips').value = '';
    }
    document.getElementById('modal-mapa').style.display = 'flex';
}

function fecharModalMapa() {
    document.getElementById('modal-mapa').style.display = 'none';
}

async function excluirMapa(id) {
    if (confirm("Tem certeza que deseja remover este aparelho do mapa?")) {
        await DB.mapaAparelhos.deletar(id);
        await carregarDadosMapa();
    }
}

document.getElementById('form-mapa').addEventListener('submit', async function(e) {
    e.preventDefault();

    const idValue = document.getElementById('edit-mapa-id').value;
    const idAtual = idValue === '' ? null : parseInt(idValue);
    const coluna = document.getElementById('edit-mapa-coluna').value;
    const linha = parseInt(document.getElementById('edit-mapa-linha').value);
    const maxSlots = parseInt(document.getElementById('edit-mapa-max').value);
    
    // Pega o texto bruto e transforma num Array limpo
    const textoChips = document.getElementById('edit-mapa-chips').value;
    // Divide por vírgula ou espaço e remove vazios
    let chipsExtraidos = textoChips.split(/[\s,]+/).filter(c => c.trim() !== '');

    // Preenche com 'x' até bater a capacidade máxima
    while (chipsExtraidos.length < maxSlots) {
        chipsExtraidos.push('x');
    }
    
    // Se o usuário digitou a mais, recorta pro limite do aparelho
    chipsExtraidos = chipsExtraidos.slice(0, maxSlots);

    await DB.mapaAparelhos.salvar({
        id: idAtual,
        coluna: coluna,
        linha: linha,
        maxSlots: maxSlots,
        chips: chipsExtraidos
    });

    fecharModalMapa();
    await carregarDadosMapa();
});

carregarDadosMapa();
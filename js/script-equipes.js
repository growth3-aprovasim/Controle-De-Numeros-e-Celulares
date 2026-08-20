// js/script-equipes.js

let listaNumerosGeral = [];

async function carregarDadosEquipes() {
    try {
        listaNumerosGeral = await DB.numerosControle.listar();
        renderizarEquipes();
    } catch (erro) {
        console.error("Erro ao carregar banco de equipes:", erro);
        const container = document.getElementById('grid-equipes');
        if (container) container.innerHTML = `<p style="color: #ef4444; text-align: center;">Erro ao carregar dados. Atualize a página.</p>`;
    }
}

function renderizarEquipes(dadosParaRenderizar = listaNumerosGeral) {
    const container = document.getElementById('grid-equipes');
    if (!container) return; 
    container.innerHTML = '';

    const grupos = {};
    dadosParaRenderizar.forEach(item => {
        const nomeEq = (item.equipe && item.equipe.trim() !== "") ? item.equipe : "📌 SEM EQUIPE";
        if (!grupos[nomeEq]) {
            // Garante que experts sempre seja um array, mesmo lendo dados antigos do banco
            let expertsArray = Array.isArray(item.expert) ? item.expert : [item.expert || "Mateus"];
            
            grupos[nomeEq] = {
                statusEquipe: item.statusEquipe || "Disponível",
                experts: expertsArray,
                numeros: []
            };
        }
        grupos[nomeEq].numeros.push(item);
    });

    if (Object.keys(grupos).length === 0) {
        container.innerHTML = `<p style="color: var(--texto-muted); text-align: center; padding: 20px;">Nenhum número ou equipe cadastrado no sistema.</p>`;
        return;
    }

    for (const nomeEquipe in grupos) {
        const eqData = grupos[nomeEquipe];
        const qtdAtual = eqData.numeros.length;
        const card = document.createElement('div');
        card.className = 'equipe-card aberto';
        
        const stringExperts = eqData.experts.join(", ");

        let htmlTabela = `
            <div class="equipe-titulo-area" style="cursor: default;">
                <div class="equipe-titulo-esq">
                    <h3>${nomeEquipe}</h3>
                    <span style="font-size: 12px; color: ${qtdAtual > 6 ? '#f87171' : 'var(--texto-muted)'}; font-weight: normal;">
                        (${qtdAtual}/6 números alocados)
                    </span>
                </div>
                <div class="equipe-meta" style="display: flex; align-items: center; gap: 10px;">
                    <span class="badge bg-status-eq">${eqData.statusEquipe}</span>
                    <span class="badge bg-expert">Experts: ${stringExperts}</span>
                    <button class="btn-icon" title="Editar Equipe" onclick="abrirModalEquipe('${nomeEquipe}')">
                        <span class="material-icons-round">edit</span>
                    </button>
                </div>
            </div>
        `;

        htmlTabela += `<div class="tabela-wrapper" style="display: block;"><table>
            <thead>
                <tr>
                    <th>NOME (C/OP)</th>
                    <th>NÚMERO</th>
                    <th style="text-align:center;">ATIVIDADE</th>
                    <th style="text-align:center;">FUNÇÃO</th>
                </tr>
            </thead>
            <tbody>
        `;

        // ORDENAÇÃO: Capitão em primeiro!
        eqData.numeros.sort((a, b) => {
            if (a.isCapitao) return -1;
            if (b.isCapitao) return 1;
            return 0;
        });

        eqData.numeros.forEach(item => {
            let classAtiv = item.atividade === 'Em Uso' ? 'bg-ativ-uso' : (item.atividade === 'Banido' ? 'bg-ativ-banido' : 'bg-ativ-reconectar');
            let classFunc = item.funcao === 'Envios' ? 'bg-func-envios' : (item.funcao === 'Criador' ? 'bg-func-criador' : 'bg-func-reserva');
            let iconeCapitao = item.isCapitao ? '<span title="Capitão da Equipe" style="font-size: 14px; margin-right: 6px;">👑</span>' : '';

            htmlTabela += `
                <tr>
                    <td style="font-weight: 500;">${iconeCapitao}${item.nome}</td>
                    <td>${item.numero}</td>
                    <td style="text-align:center;"><span class="badge ${classAtiv}">${item.atividade}</span></td>
                    <td style="text-align:center;"><span class="badge ${classFunc}">${item.funcao}</span></td>
                </tr>
            `;
        });

        htmlTabela += `</tbody></table></div>`;
        card.innerHTML = htmlTabela;
        container.appendChild(card);
    }
}

function filtrarEquipes() {
    const termo = document.getElementById('input-filtro-equipes').value.toLowerCase();
    const filtrados = listaNumerosGeral.filter(item => {
        let stringExperts = Array.isArray(item.expert) ? item.expert.join(" ") : (item.expert || "");
        return (item.equipe && item.equipe.toLowerCase().includes(termo)) ||
               (stringExperts.toLowerCase().includes(termo)) ||
               (item.nome && item.nome.toLowerCase().includes(termo));
    });
    renderizarEquipes(filtrados);
}

// Função para habilitar/desabilitar a escolha do Capitão dinamicamente
window.toggleCapitao = function(checkbox) {
    const labelMain = checkbox.closest('label');
    const radio = labelMain.querySelector('.radio-capitao');
    const labelRadio = radio.closest('label');
    
    if (checkbox.checked) {
        radio.disabled = false;
        labelRadio.style.opacity = '1';
        // Se for o primeiro/único a ser marcado, já vira capitão automaticamente
        const marcados = document.querySelectorAll('input[name="nums-equipe"]:checked');
        if (marcados.length === 1) radio.checked = true;
    } else {
        radio.disabled = true;
        radio.checked = false;
        labelRadio.style.opacity = '0.4';
    }
};

async function abrirModalEquipe(nomeEquipeParaEditar = null) {
    try {
        listaNumerosGeral = await DB.numerosControle.listar();
        const containerCheckboxes = document.getElementById('lista-checkbox-numeros');
        containerCheckboxes.innerHTML = '';

        let numerosDaEquipeAtual = [];
        let expertsAtuais = [];
        const inputNome = document.getElementById('edit-eq-nome');
        const selectStatus = document.getElementById('edit-eq-status');

        if (nomeEquipeParaEditar) {
            inputNome.value = nomeEquipeParaEditar;
            inputNome.disabled = true; 
            document.getElementById('modal-titulo-eq').innerText = 'Editar Equipe';

            const itemExemplo = listaNumerosGeral.find(n => n.equipe === nomeEquipeParaEditar);
            if (itemExemplo) {
                expertsAtuais = Array.isArray(itemExemplo.expert) ? itemExemplo.expert : [itemExemplo.expert || 'Mateus'];
                selectStatus.value = itemExemplo.statusEquipe || 'Disponível';
            }

            numerosDaEquipeAtual = listaNumerosGeral.filter(n => n.equipe === nomeEquipeParaEditar).map(n => n.id);
        } else {
            inputNome.value = '';
            inputNome.disabled = false;
            document.getElementById('modal-titulo-eq').innerText = 'Criar Nova Equipe';
            expertsAtuais = ['Mateus']; // Padrão
            selectStatus.value = 'Disponível';
        }

        // Marca os checkboxes dos Experts corretos
        document.querySelectorAll('input[name="eq-experts"]').forEach(cb => {
            cb.checked = expertsAtuais.includes(cb.value);
        });

        // Preenche os checkboxes dos Números + Radio do Capitão
        listaNumerosGeral.forEach(num => {
            const jaMarcado = numerosDaEquipeAtual.includes(num.id);
            const outroAlocado = num.equipe && num.equipe !== nomeEquipeParaEditar && num.equipe !== "📌 SEM EQUIPE";

            const label = document.createElement('label');
            label.style.cssText = "display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 6px; border-radius: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);";
            
            label.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" name="nums-equipe" value="${num.id}" ${jaMarcado ? 'checked' : ''} onchange="toggleCapitao(this)">
                    <span style="color: var(--texto-claro); font-weight: 500;">${num.nome}</span>
                    <span style="color: var(--texto-muted);">(${num.numero})</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <label style="font-size: 12px; color: var(--laranja-brabo); display: flex; align-items: center; gap: 4px; cursor: pointer; opacity: ${jaMarcado ? '1' : '0.4'};">
                        <input type="radio" name="capitao-equipe" class="radio-capitao" value="${num.id}" ${num.isCapitao && jaMarcado ? 'checked' : ''} ${!jaMarcado ? 'disabled' : ''}>
                        👑 Capitão
                    </label>
                    <span style="font-size: 11px; color: ${outroAlocado ? '#fbbf24' : 'var(--texto-muted)'}; width: 110px; text-align: right;">
                        ${outroAlocado ? `Já está em: ${num.equipe}` : 'Disponível'}
                    </span>
                </div>
            `;
            containerCheckboxes.appendChild(label);
        });

        document.getElementById('modal-equipe').style.display = 'flex';
    } catch (e) {
        console.error("Erro no modal:", e);
    }
}

function fecharModalEquipe() {
    document.getElementById('modal-equipe').style.display = 'none';
}

document.getElementById('form-equipe').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nomeEquipe = document.getElementById('edit-eq-nome').value.trim();
    const statusEquipe = document.getElementById('edit-eq-status').value;

    const cbExperts = document.querySelectorAll('input[name="eq-experts"]:checked');
    const expertsSelecionados = Array.from(cbExperts).map(cb => cb.value);

    const cbNumeros = document.querySelectorAll('input[name="nums-equipe"]:checked');
    const idsSelecionados = Array.from(cbNumeros).map(cb => parseInt(cb.value));

    const idCapitaoSelecionado = document.querySelector('input[name="capitao-equipe"]:checked')?.value;

    if (expertsSelecionados.length === 0) {
        alert("⚠️ Selecione pelo menos 1 Expert para supervisionar a equipe.");
        return;
    }
    if (idsSelecionados.length === 0) {
        alert("⚠️ Você precisa selecionar pelo menos 1 número para criar ou manter esta equipe.");
        return;
    }
    if (idsSelecionados.length > 6) {
        alert(`❌ Erro: Uma equipe pode ter no máximo 6 números! Você selecionou ${idsSelecionados.length}.`);
        return;
    }
    if (!idCapitaoSelecionado) {
        alert("⚠️ Por favor, marque quem será o 👑 Capitão desta equipe!");
        return;
    }

    fecharModalEquipe(); 

    // Atualiza o banco número por número
    for (let num of listaNumerosGeral) {
        if (idsSelecionados.includes(num.id)) {
            num.equipe = nomeEquipe;
            num.expert = expertsSelecionados; // Salva o array de experts
            num.statusEquipe = statusEquipe;
            num.isCapitao = (num.id === parseInt(idCapitaoSelecionado)); // Marca verdadeiro se for o capitão
            await DB.numerosControle.salvar(num);
        } else if (num.equipe === nomeEquipe) {
            num.equipe = "📌 SEM EQUIPE";
            num.isCapitao = false; // Remove a patente se sair da equipe
            await DB.numerosControle.salvar(num);
        }
    }

    await carregarDadosEquipes();
});

carregarDadosEquipes();
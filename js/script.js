// js/script.js

let dadosNumeros = [];

async function carregarDashboard() {
    // Puxa direto da tabela unificada do Mini Banco
    dadosNumeros = await DB.numerosControle.listar();
    atualizarKpis();
    renderizarEquipes();
}

function atualizarKpis() {
    document.getElementById('kpi-total').innerText = dadosNumeros.length;
    document.getElementById('kpi-uso').innerText = dadosNumeros.filter(n => n.atividade === "Em Uso").length;
    document.getElementById('kpi-banidos').innerText = dadosNumeros.filter(n => n.atividade === "Banido").length;
    document.getElementById('kpi-analise').innerText = dadosNumeros.filter(n => n.atividade === "Reconectar").length;
}

function filtrarDados() {
    const termo = document.getElementById('input-filtro').value.toLowerCase();
    
    const dadosFiltrados = dadosNumeros.filter(item => {
        return item.equipe.toLowerCase().includes(termo) ||
               item.nome.toLowerCase().includes(termo) ||
               item.numero.toLowerCase().includes(termo) ||
               item.atividade.toLowerCase().includes(termo) ||
               item.funcao.toLowerCase().includes(termo) ||
               item.expert.toLowerCase().includes(termo);
    });

    renderizarEquipes(dadosFiltrados);
}

function alternarCard(element) {
    const card = element.parentElement;
    card.classList.toggle("aberto");
}

function renderizarEquipes(dadosParaRenderizar = dadosNumeros) {
    const container = document.getElementById('equipes-container');
    container.innerHTML = ''; 

    const grupos = {};
    dadosParaRenderizar.forEach(item => {
        if (!grupos[item.equipe]) {
            grupos[item.equipe] = { numeros: [], statusEquipe: item.statusEquipe || "Disponível", expert: item.expert || "Mateus" };
        }
        grupos[item.equipe].numeros.push(item);
    });

    for (const nomeEquipe in grupos) {
        const equipeData = grupos[nomeEquipe];
        const equipeCard = document.createElement('div');
        equipeCard.className = 'equipe-card aberto';

        equipeCard.innerHTML = `
            <div class="equipe-titulo-area" onclick="alternarCard(this)">
                <div class="equipe-titulo-esq">
                    <span class="material-icons-round seta-toggle">expand_more</span>
                    <h3>${nomeEquipe}</h3>
                </div>
                <div class="equipe-meta">
                    <span class="badge bg-status-eq"><span class="material-icons-round" style="font-size: 12px; vertical-align: middle;">verified</span> ${equipeData.statusEquipe}</span>
                    <span class="badge bg-expert"><span class="material-icons-round" style="font-size: 12px; vertical-align: middle;">person</span> Expert: ${equipeData.expert}</span>
                </div>
            </div>
        `;

        let htmlTabela = `<div class="tabela-wrapper"><table>
                <thead>
                    <tr>
                        <th>NOME (C/OP)</th>
                        <th>NÚMEROS</th>
                        <th style="text-align:center;">ATIVIDADE</th>
                        <th style="text-align:center;">FUNÇÃO</th>
                        <th style="text-align:center;">BANS</th>
                        <th style="text-align:center;">QUALIDADE</th>
                        <th>JUÍZO FINAL</th>
                    </tr>
                </thead>
                <tbody>
        `;

        equipeData.numeros.forEach(item => {
            let classAtiv = item.atividade === 'Em Uso' ? 'bg-ativ-uso' : (item.atividade === 'Banido' ? 'bg-ativ-banido' : 'bg-ativ-reconectar');
            let classFunc = item.funcao === 'Envios' ? 'bg-func-envios' : (item.funcao === 'Criador' ? 'bg-func-criador' : 'bg-func-reserva');
            let classQual = item.qualidade === 'Alta' ? 'bg-qual-alta' : (item.qualidade === 'Média' ? 'bg-qual-media' : 'bg-qual-baixa');

            htmlTabela += `
                <tr>
                    <td style="font-weight: 500;">${item.nome}</td>
                    <td>${item.numero}</td>
                    <td style="text-align:center;"><span class="badge ${classAtiv}">${item.atividade}</span></td>
                    <td style="text-align:center;"><span class="badge ${classFunc}">${item.funcao}</span></td>
                    <td style="text-align:center;">${item.bans}</td>
                    <td style="text-align:center;"><span class="badge ${classQual}">${item.qualidade}</span></td>
                    <td style="color: var(--texto-muted); font-style: italic;">${item.juizo || '-'}</td>
                </tr>
            `;
        });

        htmlTabela += `</tbody></table></div>`;
        equipeCard.innerHTML += htmlTabela;
        container.appendChild(equipeCard);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDashboard();
});
// webhook-server.js
// Servidor Webhook para receber eventos do Sendflow (Sendhook) e atualizar os chips no Supabase

const http = require('http');
const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env manualmente para não depender de pacotes externos
function carregarEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const conteudo = fs.readFileSync(envPath, 'utf8');
        conteudo.split('\n').forEach(linha => {
            const trim = linha.trim();
            if (trim && !trim.startsWith('#') && trim.includes('=')) {
                const [chave, ...resto] = trim.split('=');
                const valor = resto.join('=').trim().replace(/^["']|["']$/g, '');
                if (!process.env[chave.trim()]) {
                    process.env[chave.trim()] = valor;
                }
            }
        });
    }
}

carregarEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjfapsvlhojiouarbzap.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const PORT = process.env.PORT || 3000;

// Helper para chamadas REST ao Supabase
async function supabaseFetch(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation',
        ...options.headers
    };

    const res = await fetch(url, {
        ...options,
        headers
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro Supabase (${res.status}): ${text}`);
    }

    return await res.json();
}

// Normaliza números de telefone (apenas dígitos)
function limparDigitos(str) {
    return String(str || '').replace(/\D/g, '');
}

// Processador do Webhook Sendflow
async function processarSendflowWebhook(payload) {
    const dataObj = payload?.data || payload || {};
    const accountName = (dataObj.name || payload.name || '').trim();
    const accountNumber = String(dataObj.number || payload.number || '').trim();
    const reason = (dataObj.reason || dataObj.reasonMessage || payload.reason || payload.reasonMessage || '').toLowerCase();
    const event = payload?.event || '';

    console.log(`\n📥 [Sendflow Webhook] Recebido evento: "${event}"`);
    console.log(`   Nome da Conta: "${accountName}" | Número: "${accountNumber}" | Motivo: "${reason}"`);

    if (!accountName && !accountNumber) {
        return {
            status: 400,
            body: { success: false, error: 'Nome (name) ou número (number) da conta não foi informado no payload.' }
        };
    }

    // Buscar lista de chips do banco
    const chips = await supabaseFetch('cnc_numeros_controle?select=*');

    if (!chips || chips.length === 0) {
        return {
            status: 404,
            body: { success: false, error: 'Nenhum chip encontrado no banco de dados.' }
        };
    }

    const targetDigitos = limparDigitos(accountNumber);

    // 1. Buscar por nome da conta (exato ou sem espaços extras)
    let chipEncontrado = chips.find(c => c.nome && c.nome.trim().toLowerCase() === accountName.toLowerCase());

    // 2. Fallback: Buscar por número
    if (!chipEncontrado && targetDigitos) {
        chipEncontrado = chips.find(c => {
            const digitosChip = limparDigitos(c.numero);
            return digitosChip === targetDigitos ||
                   (targetDigitos.length >= 8 && digitosChip.endsWith(targetDigitos.slice(-8))) ||
                   (digitosChip.length >= 8 && targetDigitos.endsWith(digitosChip.slice(-8)));
        });
    }

    if (!chipEncontrado) {
        console.warn(`⚠️ [Sendflow Webhook] Chip não localizado no banco: Nome="${accountName}" Num="${accountNumber}"`);
        return {
            status: 200, // Retornamos 200 para o Sendflow não ficar tentando infinitamente
            body: {
                success: false,
                warning: 'Chip não encontrado na base de dados.',
                received: { name: accountName, number: accountNumber, reason, event }
            }
        };
    }

    // Verifica se a conta foi banida
    const isBanido = reason.includes('ban') || reason === 'account-banned';
    const novaAtividade = isBanido ? 'Banido' : 'Reconectar';

    // Incrementa contagem de bans se foi banido agora
    let totalBans = Number(chipEncontrado.bans) || 0;
    if (isBanido && chipEncontrado.atividade !== 'Banido') {
        totalBans += 1;
    }

    // Atualiza o registro no Supabase
    const atualizado = await supabaseFetch(`cnc_numeros_controle?id=eq.${chipEncontrado.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            atividade: novaAtividade,
            bans: totalBans
        })
    });

    console.log(`✅ [Sendflow Webhook] Chip "${chipEncontrado.nome}" atualizado: Status: "${chipEncontrado.atividade}" ➡️ "${novaAtividade}" | Bans: ${totalBans}`);

    return {
        status: 200,
        body: {
            success: true,
            message: `Chip "${chipEncontrado.nome}" atualizado para "${novaAtividade}".`,
            chip: {
                id: chipEncontrado.id,
                nome: chipEncontrado.nome,
                numero: chipEncontrado.numero,
                statusAnterior: chipEncontrado.atividade,
                novoStatus: novaAtividade,
                isBanido,
                bans: totalBans
            },
            event,
            reason
        }
    };
}

// Criação do Servidor HTTP
const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // Rota GET de Verificação de Saúde
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/webhook/sendflow')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            service: 'Controle de Numeros - Sendflow Webhook Receiver',
            time: new Date().toISOString(),
            endpoints: {
                sendflowWebhook: 'POST /webhook/sendflow'
            }
        }));
        return;
    }

    // Rota POST do Webhook Sendflow
    if (req.method === 'POST' && (url.pathname === '/webhook/sendflow' || url.pathname === '/api/sendhook' || url.pathname === '/')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const resultado = await processarSendflowWebhook(payload);
                res.writeHead(resultado.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(resultado.body));
            } catch (err) {
                console.error('❌ [Sendflow Webhook] Erro ao processar payload:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor Webhook Sendflow ativo na porta ${PORT}`);
    console.log(`📡 URL do Webhook: http://localhost:${PORT}/webhook/sendflow`);
    console.log(`🔗 Conectado ao Supabase: ${SUPABASE_URL}`);
    console.log(`====================================================\n`);
});

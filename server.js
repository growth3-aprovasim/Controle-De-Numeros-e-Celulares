// server.js
// Servidor Node.js Express para Easypanel / Docker
// Serve os arquivos estáticos do frontend e processa os Webhooks do Sendflow (Sendhook)

try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Essencial para o Easypanel / Docker expor a porta corretamente

// Configuração do Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
    });
} else {
    console.warn('⚠️ AVISO: SUPABASE_URL ou SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente (.env)!');
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Normaliza números de telefone (mantém apenas dígitos)
function limparDigitos(str) {
    return String(str || '').replace(/\D/g, '');
}

// -------------------------------------------------------------
// 1. ROTA DINÂMICA DE CONFIGURAÇÃO DO FRONTEND (/js/env.js)
// Injeta as credenciais do Supabase diretamente nas páginas HTML
// -------------------------------------------------------------
app.get('/js/env.js', (req, res) => {
    res.type('application/javascript');
    res.send(`// js/env.js - Gerado dinamicamente pelo servidor Node.js
window.SUPABASE_CONFIG = {
    URL: "${process.env.SUPABASE_URL || ''}",
    ANON_KEY: "${process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || ''}"
};`);
});

// -------------------------------------------------------------
// 2. SERVIÇO DE ARQUIVOS ESTÁTICOS DO FRONTEND (HTML, CSS, JS, IMG)
// -------------------------------------------------------------
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Rota raiz para o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// -------------------------------------------------------------
// 3. HEALTH CHECK & STATUS
// -------------------------------------------------------------
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'Controle de Numeros e Celulares - Sendflow Webhook Receiver',
        timestamp: new Date().toISOString(),
        supabaseConnected: !!supabase
    });
});

// -------------------------------------------------------------
// 4. LÓGICA DO WEBHOOK DO SENDFLOW (SENDHOOK)
// Endpoint: POST /webhook/sendflow (e alias POST /api/sendhook)
// -------------------------------------------------------------
async function processarWebhookSendflow(req, res) {
    try {
        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Servidor sem credenciais do Supabase configuradas nas variáveis de ambiente.'
            });
        }

        const payload = req.body || {};
        const dataObj = payload.data || payload || {};
        const accountName = (dataObj.name || payload.name || '').trim();
        const accountNumber = String(dataObj.number || payload.number || '').trim();
        const reason = (dataObj.reason || dataObj.reasonMessage || payload.reason || payload.reasonMessage || '').toLowerCase();
        const event = payload.event || '';

        console.log(`\n📥 [Sendflow Webhook] Evento recebido: "${event || 'N/A'}"`);
        console.log(`   Nome da Conta: "${accountName}" | Número: "${accountNumber}" | Motivo: "${reason}"`);

        if (!accountName && !accountNumber) {
            return res.status(400).json({
                success: false,
                error: 'Nome (name) ou número (number) da conta não foi informado no payload.'
            });
        }

        // Buscar todos os chips na tabela cnc_numeros_controle
        const { data: chips, error: listError } = await supabase
            .from('cnc_numeros_controle')
            .select('*');

        if (listError || !chips) {
            console.error('❌ Erro ao consultar cnc_numeros_controle no Supabase:', listError);
            return res.status(500).json({
                success: false,
                error: listError?.message || 'Erro ao consultar chips no banco de dados.'
            });
        }

        const targetDigitos = limparDigitos(accountNumber);

        // 1. Busca prioritária: por Nome do Chip (case-insensitive)
        let chipEncontrado = chips.find(c => c.nome && c.nome.trim().toLowerCase() === accountName.toLowerCase());

        // 2. Busca fallback: pelos últimos 8 dígitos do telefone
        if (!chipEncontrado && targetDigitos) {
            chipEncontrado = chips.find(c => {
                const digitosChip = limparDigitos(c.numero || '');
                return digitosChip === targetDigitos ||
                       (targetDigitos.length >= 8 && digitosChip.endsWith(targetDigitos.slice(-8))) ||
                       (digitosChip.length >= 8 && targetDigitos.endsWith(digitosChip.slice(-8)));
            });
        }

        if (!chipEncontrado) {
            console.warn(`⚠️ [Sendflow Webhook] Chip não localizado: Nome="${accountName}" | Número="${accountNumber}"`);
            // Retorna 200 para evitar que o Sendflow fique repetindo a requisição em loop
            return res.status(200).json({
                success: false,
                warning: 'Chip não localizado na base de dados.',
                received: { name: accountName, number: accountNumber, reason, event }
            });
        }

        // Verificar se a conta foi banida
        const isBanido = reason.includes('ban') || reason === 'account-banned';
        const novaAtividade = isBanido ? 'Banido' : 'Reconectar';

        // Somar +1 no contador de bans se foi banido agora e antes não estava com status 'Banido'
        let totalBans = Number(chipEncontrado.bans) || 0;
        if (isBanido && chipEncontrado.atividade !== 'Banido') {
            totalBans += 1;
        }

        // Atualizar no Supabase
        const { error: updateError } = await supabase
            .from('cnc_numeros_controle')
            .update({
                atividade: novaAtividade,
                bans: totalBans
            })
            .eq('id', chipEncontrado.id);

        if (updateError) {
            console.error(`❌ Erro ao atualizar chip ID ${chipEncontrado.id}:`, updateError);
            return res.status(500).json({
                success: false,
                error: updateError.message
            });
        }

        console.log(`✅ [Sendflow Webhook] Chip "${chipEncontrado.nome}" atualizado: "${chipEncontrado.atividade}" ➡️ "${novaAtividade}" | Bans: ${totalBans}`);

        return res.status(200).json({
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
        });

    } catch (err) {
        console.error('❌ Erro inesperado no processamento do webhook:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Erro interno do servidor.'
        });
    }
}

// Endpoints do Webhook
app.post('/webhook/sendflow', processarWebhookSendflow);
app.post('/api/sendhook', processarWebhookSendflow);
app.post('/webhook', processarWebhookSendflow);

// Iniciar o Servidor no HOST 0.0.0.0 (Obrigatório no Easypanel)
app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor Express online em http://${HOST}:${PORT}`);
    console.log(`🌐 Painel Web: http://${HOST}:${PORT}/`);
    console.log(`📡 Webhook Sendflow: http://${HOST}:${PORT}/webhook/sendflow`);
    console.log(`🔗 Supabase URL: ${SUPABASE_URL || 'NÃO CONFIGURADO'}`);
    console.log(`====================================================\n`);
});

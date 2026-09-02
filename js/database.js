// js/database.js
// CONEXÃO COM O SUPABASE (TABELAS COM PREFIXO cnc_)

if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = null;
}

// Credenciais dinâmicas protegidas (lidas de js/env.js, gerado em runtime pelo Docker)
const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.URL) || '';
const SUPABASE_ANON_KEY = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.ANON_KEY) || '';

async function getSupabase() {
    if (window.supabaseClient) return window.supabaseClient;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error("⚠️ Configurações do Supabase não encontradas! Verifique as variáveis de ambiente do servidor (.env).");
        return null;
    }

    let tentativas = 0;
    while (!window.supabase && tentativas < 30) {
        await new Promise(r => setTimeout(r, 100));
        tentativas++;
    }

    if (window.supabase) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });
        return window.supabaseClient;
    } else {
        console.error("⚠️ Biblioteca do Supabase não foi carregada a tempo!");
        return null;
    }
}

// MÓDULOS DE COMUNICAÇÃO COM O BANCO EM NUVEM
window.DB = {
    chips: {
        listar: async function() {
            const sb = await getSupabase();
            if (!sb) return [];
            const { data, error } = await sb.from('cnc_numeros_controle').select('*');
            if (error || !data) { console.error("Erro ao listar chips:", error); return []; }
            return data.map(item => ({
                id: item.id,
                nome: item.nome,
                numero: item.numero
            }));
        },
        salvar: async function(chip) {
            const sb = await getSupabase();
            if (!sb) return;
            if (chip.id) {
                await sb.from('cnc_numeros_controle').update({ nome: chip.nome, numero: chip.numero }).eq('id', chip.id);
            } else {
                await sb.from('cnc_numeros_controle').insert([{
                    equipe: "📌 GERAL",
                    nome: chip.nome,
                    numero: chip.numero,
                    atividade: "Disponível",
                    funcao: "Reserva",
                    bans: 0,
                    qualidade: "Alta",
                    status_equipe: "Disponível",
                    expert: ["Mateus"],
                    is_capitao: false
                }]);
            }
            return true;
        },
        deletar: async function(id) {
            const sb = await getSupabase();
            if (!sb) return;
            await sb.from('cnc_numeros_controle').delete().eq('id', id);
            return true;
        }
    },

    numerosControle: {
        listar: async function() {
            const sb = await getSupabase();
            if (!sb) return [];
            const { data, error } = await sb.from('cnc_numeros_controle').select('*').order('id', { ascending: true });
            if (error || !data) { console.error("Erro ao listar números:", error); return []; }
            
            return data.map(item => {
                let bm = item.bm || "";
                let target = item.target || "";
                
                // Fallback inteligente para recuperar BM e Target caso não estejam em colunas separadas
                if ((!bm || !target) && item.juizo && typeof item.juizo === 'string') {
                    try {
                        const parsed = JSON.parse(item.juizo);
                        if (parsed && typeof parsed === 'object') {
                            if (!bm && parsed.bm) bm = parsed.bm;
                            if (!target && parsed.target) target = parsed.target;
                        }
                    } catch (e) {}
                }

                const isUnnichat = item.plataforma === "Unnichat" || item.equipe === "UNNICHAT" || item.equipe === "Unnichat" || (item.juizo && item.juizo.includes('"bm"'));

                return {
                    id: item.id,
                    equipe: item.equipe || (isUnnichat ? "UNNICHAT" : "SENDFLOW"),
                    plataforma: item.plataforma || (isUnnichat ? "Unnichat" : "Sendflow"),
                    nome: item.nome || "",
                    numero: item.numero || "",
                    atividade: item.atividade || "Disponível",
                    funcao: item.funcao || "Reserva",
                    bans: item.bans !== undefined && item.bans !== null ? item.bans : 0,
                    qualidade: item.qualidade || "Média",
                    juizo: item.juizo || "",
                    statusEquipe: item.status_equipe || "Disponível",
                    expert: item.expert || ["Mateus"],
                    isCapitao: !!item.is_capitao,
                    bm: bm,
                    target: target,
                    data_inicio_aquecimento: item.data_inicio_aquecimento || null
                };
            });
        },
        salvar: async function(item) {
            const sb = await getSupabase();
            if (!sb) return;
            
            const plataforma = item.plataforma || (item.equipe === "UNNICHAT" ? "Unnichat" : "Sendflow");
            
            // Se for Unnichat, empacota BM e Target no juizo como garantia de persistência
            let juizoFinal = item.juizo || "";
            if (plataforma === "Unnichat") {
                juizoFinal = JSON.stringify({ bm: item.bm || "", target: item.target || "" });
            }

            const payload = {
                equipe: item.equipe || (plataforma === "Unnichat" ? "UNNICHAT" : "SENDFLOW"),
                plataforma: plataforma,
                nome: item.nome,
                numero: item.numero,
                atividade: item.atividade || "Disponível",
                funcao: item.funcao || "Reserva",
                bans: item.bans !== undefined && item.bans !== null ? item.bans : 0,
                qualidade: item.qualidade || "Média",
                juizo: juizoFinal,
                status_equipe: item.statusEquipe || "Disponível",
                expert: Array.isArray(item.expert) ? item.expert : [item.expert || "Mateus"],
                is_capitao: !!item.isCapitao,
                bm: item.bm || "",
                target: item.target || "",
                data_inicio_aquecimento: item.data_inicio_aquecimento || null
            };

            if (!item.id) {
                const { data, error } = await sb.from('cnc_numeros_controle').insert([payload]).select();
                if (error) {
                    console.error("Tentando inserção com fallback:", error);
                    // Fallback caso as colunas bm/target/plataforma/data_inicio_aquecimento ainda não existam no Supabase
                    delete payload.bm;
                    delete payload.target;
                    delete payload.plataforma;
                    delete payload.data_inicio_aquecimento;
                    const { data: d2, error: err2 } = await sb.from('cnc_numeros_controle').insert([payload]).select();
                    if (err2) console.error("Erro no fallback de inserção:", err2);
                    return d2 && d2[0] ? { ...item, id: d2[0].id } : item;
                }
                return data && data[0] ? { ...item, id: data[0].id } : item;
            } else {
                const { error } = await sb.from('cnc_numeros_controle').update(payload).eq('id', item.id);
                if (error) {
                    console.error("Tentando atualização com fallback:", error);
                    // Fallback caso as colunas ainda não existam no Supabase
                    delete payload.bm;
                    delete payload.target;
                    delete payload.plataforma;
                    delete payload.data_inicio_aquecimento;
                    await sb.from('cnc_numeros_controle').update(payload).eq('id', item.id);
                }
                return item;
            }
        },
        deletar: async function(id) {
            const sb = await getSupabase();
            if (!sb) return false;
            const { error } = await sb.from('cnc_numeros_controle').delete().eq('id', id);
            if (error) {
                console.error("Erro ao deletar número:", error);
                return false;
            }
            return true;
        },
        atualizarAtividade: async function(ids, novaAtividade) {
            const sb = await getSupabase();
            if (!sb || !ids || ids.length === 0) return;
            const { error } = await sb.from('cnc_numeros_controle').update({ atividade: novaAtividade }).in('id', ids);
            if (error) console.error("Erro ao atualizar atividade em massa:", error);
            return !error;
        },
        processarWebhookSendflow: async function(payload) {
            const sb = await getSupabase();
            if (!sb) return { success: false, error: "Supabase não conectado." };

            const dataObj = payload?.data || payload || {};
            const accountName = (dataObj.name || payload.name || '').trim();
            const accountNumber = String(dataObj.number || payload.number || '').trim();
            const reason = (dataObj.reason || dataObj.reasonMessage || payload.reason || payload.reasonMessage || '').toLowerCase();
            const event = payload?.event || '';

            if (!accountName && !accountNumber) {
                return { success: false, error: "Nome ou número da conta não fornecido no webhook." };
            }

            // Buscar todos os chips para encontrar correspondência
            const chips = await this.listar();
            if (!chips || chips.length === 0) {
                return { success: false, error: "Nenhum chip cadastrado no sistema." };
            }

            // Normalização de números (somente dígitos)
            const limparDigitos = (str) => String(str || '').replace(/\D/g, '');
            const targetDigitos = limparDigitos(accountNumber);

            // 1. Prioridade: Buscar por Nome do Chip
            let chipEncontrado = chips.find(c => c.nome && c.nome.trim().toLowerCase() === accountName.toLowerCase());

            // 2. Fallback: Buscar por Número
            if (!chipEncontrado && targetDigitos) {
                chipEncontrado = chips.find(c => {
                    const digitosChip = limparDigitos(c.numero);
                    return digitosChip === targetDigitos || 
                           (targetDigitos.length >= 8 && digitosChip.endsWith(targetDigitos.slice(-8))) ||
                           (digitosChip.length >= 8 && targetDigitos.endsWith(digitosChip.slice(-8)));
                });
            }

            if (!chipEncontrado) {
                return {
                    success: false,
                    error: `Chip "${accountName || accountNumber}" não encontrado na base de dados.`,
                    data: { name: accountName, number: accountNumber, reason, event }
                };
            }

            // Verificar se a conta foi banida
            const isBanido = reason.includes('ban') || reason === 'account-banned';
            const novaAtividade = isBanido ? 'Banido' : 'Reconectar';

            // Incrementar bans caso passe para Banido e não estivesse banido antes
            let totalBans = Number(chipEncontrado.bans) || 0;
            if (isBanido && chipEncontrado.atividade !== 'Banido') {
                totalBans += 1;
            }

            const { error: updateError } = await sb.from('cnc_numeros_controle').update({
                atividade: novaAtividade,
                bans: totalBans
            }).eq('id', chipEncontrado.id);

            if (updateError) {
                console.error("Erro ao atualizar chip via webhook:", updateError);
                return { success: false, error: updateError.message };
            }

            return {
                success: true,
                chipId: chipEncontrado.id,
                chipNome: chipEncontrado.nome,
                chipNumero: chipEncontrado.numero,
                statusAnterior: chipEncontrado.atividade,
                novoStatus: novaAtividade,
                isBanido: isBanido,
                totalBans: totalBans,
                reason: reason || 'Nenhum motivo informado'
            };
        }
    },
    
    campanhas: {
        listar: async function() {
            const sb = await getSupabase();
            if (!sb) return [];
            const { data, error } = await sb.from('cnc_campanhas').select('*').order('id', { ascending: false });
            if (error || !data) { console.error("Erro ao listar campanhas:", error); return []; }
            return data;
        },
        salvar: async function(item) {
            const sb = await getSupabase();
            if (!sb) return;
            
            const payload = {
                nome: item.nome,
                status: item.status,
                data: item.data,
                expert: item.expert,
                equipes: item.equipes || []
            };

            if (!item.id) {
                const { data, error } = await sb.from('cnc_campanhas').insert([payload]).select();
                return data && data[0] ? { ...item, id: data[0].id } : item;
            } else {
                await sb.from('cnc_campanhas').update(payload).eq('id', item.id);
                return item;
            }
        },
        deletar: async function(id) {
            const sb = await getSupabase();
            if (!sb) return;
            await sb.from('cnc_campanhas').delete().eq('id', id);
            return true;
        }
    },

    apiNumeros: {
        listar: async function() {
            const sb = await getSupabase();
            if (!sb) return [];
            const { data, error } = await sb.from('cnc_api_numeros').select('*').order('id', { ascending: true });
            if (error || !data) { console.error("Erro ao listar API:", error); return []; }
            return data;
        },
        salvar: async function(item) {
            const sb = await getSupabase();
            if (!sb) return;
            
            const payload = { numero: item.numero, descricao: item.descricao };

            if (!item.id) {
                const { data, error } = await sb.from('cnc_api_numeros').insert([payload]).select();
                return data && data[0] ? { ...item, id: data[0].id } : item;
            } else {
                await sb.from('cnc_api_numeros').update(payload).eq('id', item.id);
                return item;
            }
        },
        deletar: async function(id) {
            const sb = await getSupabase();
            if (!sb) return;
            await sb.from('cnc_api_numeros').delete().eq('id', id);
            return true;
        }
    },

    mapaAparelhos: {
        listar: async function() {
            const sb = await getSupabase();
            if (!sb) return [];
            const { data, error } = await sb.from('cnc_mapa_aparelhos').select('*').order('linha', { ascending: true });
            if (error || !data) { console.error("Erro ao listar mapa:", error); return []; }
            return data.map(item => ({
                id: item.id,
                coluna: item.coluna,
                linha: item.linha,
                maxSlots: item.max_slots,
                chips: item.chips || []
            }));
        },
        salvar: async function(item) {
            const sb = await getSupabase();
            if (!sb) return;
            
            const payload = {
                coluna: item.coluna,
                linha: item.linha,
                max_slots: item.maxSlots,
                chips: item.chips
            };

            if (!item.id) {
                const { data, error } = await sb.from('cnc_mapa_aparelhos').insert([payload]).select();
                return data && data[0] ? { ...item, id: data[0].id } : item;
            } else {
                await sb.from('cnc_mapa_aparelhos').update(payload).eq('id', item.id);
                return item;
            }
        },
        deletar: async function(id) {
            const sb = await getSupabase();
            if (!sb) return;
            await sb.from('cnc_mapa_aparelhos').delete().eq('id', id);
            return true;
        }
    },

    assinarMudancas: async function(tabela, callback) {
        const sb = await getSupabase();
        if (!sb || !sb.channel) return;
        try {
            const canal = sb.channel(`realtime_${tabela}_${Math.random()}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: tabela }, payload => {
                    if (callback) callback(payload);
                })
                .subscribe();
            return canal;
        } catch (e) {
            console.warn("Realtime não pôde ser inicializado:", e);
        }
    }
};
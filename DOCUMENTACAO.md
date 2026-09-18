# 📘 Documentação Completa — Controle de Números e Celulares

> **Projeto:** Controle de Números e Celulares  
> **Cliente / Marca:** Brabo Concursos  
> **Stack:** Node.js (Express) + HTML/CSS/JS + Supabase (PostgreSQL em nuvem)  
> **Deploy:** Docker / Easypanel  
> **Última atualização da documentação:** Setembro 2026

---

## 📑 Índice

1. [Visão Geral do Projeto](#1--visão-geral-do-projeto)
2. [Arquitetura do Sistema](#2--arquitetura-do-sistema)
3. [Estrutura de Arquivos](#3--estrutura-de-arquivos)
4. [Banco de Dados (Supabase)](#4--banco-de-dados-supabase)
5. [Backend — Servidor Node.js](#5--backend--servidor-nodejs)
6. [Frontend — Módulos e Páginas](#6--frontend--módulos-e-páginas)
7. [Webhook Sendflow — Automação de Bans](#7--webhook-sendflow--automação-de-bans)
8. [Instalação e Configuração](#8--instalação-e-configuração)
9. [Deploy com Docker / Easypanel](#9--deploy-com-docker--easypanel)
10. [Guia de Uso do Sistema (Passo a Passo)](#10--guia-de-uso-do-sistema-passo-a-passo)

---

## 1 — Visão Geral do Projeto

O **Controle de Números e Celulares** é um sistema web interno desenvolvido para gerenciar **chips de celular (números de WhatsApp)** usados em operações de marketing digital da **Brabo Concursos**.

### Principais funcionalidades:
- **Cadastro e gestão de chips/números** — organizados por plataforma (Sendflow, Unnichat, Vagos, Aquecimento)
- **Gestão de campanhas** — criação de campanhas com alocação de números em grupos VIP, Normal e Ambos
- **Dashboard em tempo real** — visão geral com métricas de status, bans, funções e campanhas ativas
- **Webhook automático** — integração com o Sendflow para detectar bans e desconexões automaticamente
- **Mapa de aparelhos físicos** — controle visual de quais chips estão em quais celulares
- **Métricas e gráficos comparativos** — painel analítico com Chart.js para comparar campanhas
- **Atualização em tempo real** — via Supabase Realtime (WebSocket), a interface atualiza automaticamente quando dados mudam

---

## 2 — Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────┐
│                    USUÁRIO (Browser)                 │
│                                                      │
│   index.html ── campanhas.html ── celulares.html     │
│   analytics.html ── mapa.html ── api.html            │
│         │                                            │
│     js/env.js (credenciais dinâmicas)                │
│     js/database.js (camada de dados Supabase)        │
│     js/menu.js (navegação lateral)                   │
│     js/script-*.js (lógica de cada página)           │
└───────────────┬──────────────────────────────────────┘
                │ HTTP / Supabase JS Client
                ▼
┌──────────────────────────────────────────────────────┐
│              SUPABASE (Banco em Nuvem)                │
│                                                      │
│   Tabelas:                                           │
│     cnc_numeros_controle  (chips/números)            │
│     cnc_campanhas         (campanhas)                │
│     cnc_mapa_aparelhos    (mapa de celulares)        │
│     cnc_api_numeros       (números de API)           │
│                                                      │
│   Realtime: WebSocket para atualizações ao vivo      │
└───────────────┬──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│            SERVIDOR NODE.JS (Express)                │
│                                                      │
│   • Serve os arquivos estáticos do frontend          │
│   • Gera /js/env.js dinamicamente (credenciais)      │
│   • Recebe webhooks do Sendflow (POST)               │
│   • Atualiza status de chips no Supabase             │
│   • Health check em /health                          │
│                                                      │
│   Porta: 3000  |  Host: 0.0.0.0                     │
└───────────────┬──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│         SENDFLOW (Serviço Externo)                   │
│                                                      │
│   Envia POST para /webhook/sendflow quando:          │
│   • Uma conta é banida (account-banned)              │
│   • Uma conta desconecta (user-logout, etc.)         │
└──────────────────────────────────────────────────────┘
```

**Fluxo resumido:**
1. O frontend carrega no browser do usuário e se conecta diretamente ao **Supabase** (via `@supabase/supabase-js`) para ler/escrever dados.
2. O servidor **Express** serve os arquivos estáticos e injeta as credenciais do Supabase via `/js/env.js`.
3. O **Sendflow** envia webhooks para o servidor Express, que processa os eventos e atualiza os chips no Supabase.
4. O Supabase Realtime notifica o frontend sobre mudanças, fazendo a interface atualizar automaticamente.

---

## 3 — Estrutura de Arquivos

```
Projeto Controle de Numeros e Celulares/
│
├── index.html                  # Página principal (Dashboard)
├── server.js                   # Servidor Express (principal)
├── webhook-server.js           # Servidor webhook alternativo (standalone HTTP)
├── package.json                # Dependências e scripts npm
├── Dockerfile                  # Configuração Docker para deploy
├── docker-entrypoint.sh        # Script de entrada do Docker (gera env.js)
├── .env                        # Variáveis de ambiente (NÃO commitar)
├── .env.example                # Exemplo de variáveis de ambiente
├── .gitignore                  # Arquivos ignorados pelo Git
├── .dockerignore               # Arquivos ignorados pelo Docker
│
├── css/
│   ├── global.css              # Estilos globais, variáveis CSS, menu lateral, modais
│   ├── dashboard.css           # Estilos do dashboard, cards, tabelas, badges
│   └── celulares.css           # Estilos específicos da página de chips
│
├── js/
│   ├── env.js                  # Credenciais Supabase (gerado em runtime)
│   ├── database.js             # Módulo de acesso ao banco (CRUD completo)
│   ├── menu.js                 # Menu lateral dinâmico + favicon + título global
│   ├── script-index.js         # Lógica do Dashboard
│   ├── script-celulares.js     # Lógica da gestão de chips/números
│   ├── script-campanhas.js     # Lógica do gerenciamento de campanhas
│   ├── script-analytics.js     # Lógica dos gráficos e métricas (Chart.js)
│   ├── script-mapa.js          # Lógica do mapa de aparelhos físicos
│   ├── script-api.js           # Lógica da página de webhook/simulador
│   └── script.js               # Script auxiliar legado
│
├── pages/
│   ├── celulares.html          # Página de gerenciamento de chips
│   ├── campanhas.html          # Página de gerenciamento de campanhas
│   ├── analytics.html          # Página de métricas e gráficos
│   ├── mapa.html               # Página do mapa de aparelhos físicos
│   ├── api.html                # Página de webhook e simulador
│   └── equipes.html            # Página de equipes (legado)
│
└── img/
    ├── logo.png                # Logo da Brabo Concursos
    └── icon.png                # Favicon do sistema
```

---

## 4 — Banco de Dados (Supabase)

O projeto utiliza **Supabase** como banco de dados em nuvem (PostgreSQL). Todas as tabelas usam o prefixo `cnc_`.

### 4.1 — Tabela `cnc_numeros_controle`

Tabela principal que armazena todos os **chips/números de telefone**.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int (PK, auto) | Identificador único |
| `equipe` | text | Grupo do número (ex: SENDFLOW, UNNICHAT, AQUECIMENTO, VAGOS) |
| `plataforma` | text | Plataforma associada (Sendflow, Unnichat, Aquecimento, Vagos) |
| `nome` | text | Nome de identificação do chip (ex: "MKT 90 (C)") |
| `numero` | text | Número do celular formatado |
| `atividade` | text | Status atual: Disponível, Em Uso, Em Análise, Reconectar, Banido |
| `funcao` | text | Função do número: Envios, Criador, Espião, Reserva |
| `bans` | int | Contador acumulado de bans |
| `qualidade` | text | Classificação de qualidade: Alta, Média, Baixa |
| `juizo` | text | Observações livres ou JSON com dados extras (BM, target, data aquecimento) |
| `status_equipe` | text | Status dentro da equipe |
| `expert` | text[] (array) | Lista de experts responsáveis |
| `is_capitao` | boolean | Indica se é capitão da equipe |
| `bm` | text | Business Manager (específico para Unnichat) |
| `target` | text | Target/Alvo (específico para Unnichat) |
| `data_inicio_aquecimento` | text | Data de início do aquecimento |

### 4.2 — Tabela `cnc_campanhas`

Armazena as **campanhas de marketing**.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int (PK, auto) | Identificador único |
| `nome` | text | Nome da campanha (ex: "Black Friday 2026") |
| `status` | text | Status: Em Andamento, Agendada, Encerrada |
| `data` | text | Data alvo/início (formato YYYY-MM-DD) |
| `expert` | text | Expert responsável (Mateus, Ivan, Graton, Black, Geral) |
| `equipes` | text[] (array) | Lista de números alocados no formato `"id:GRUPO"` (ex: `"42:VIP"`, `"15:NORMAL"`) |

### 4.3 — Tabela `cnc_mapa_aparelhos`

Controla o **mapa visual de aparelhos físicos (celulares)**.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int (PK, auto) | Identificador único |
| `coluna` | text | Posição: Esquerda, Centro, Direita |
| `linha` | int | Ordem na fila (de cima para baixo) |
| `max_slots` | int | Capacidade total do aparelho (padrão: 6) |
| `chips` | text[] (array) | Lista de chips alocados (posições vazias = "x") |

### 4.4 — Tabela `cnc_api_numeros`

Números auxiliares para API/integrações externas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int (PK, auto) | Identificador único |
| `numero` | text | Número do telefone |
| `descricao` | text | Descrição do uso (ex: "IA ChatGPT") |

---

## 5 — Backend — Servidor Node.js

### Arquivo principal: `server.js`

O servidor Express é responsável por:

1. **Servir arquivos estáticos** — HTML, CSS, JS, imagens do frontend
2. **Gerar `/js/env.js` dinamicamente** — injeta as credenciais do Supabase (URL e ANON_KEY) a partir das variáveis de ambiente
3. **Receber webhooks do Sendflow** — processa eventos de ban/desconexão automaticamente
4. **Health check** — endpoint `GET /health` para verificar se o servidor está online

### Endpoints principais:

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Serve `index.html` (Dashboard) |
| `GET` | `/js/env.js` | Gera dinamicamente as credenciais do Supabase |
| `GET` | `/health` | Status de saúde do servidor |
| `POST` | `/webhook/sendflow` | Endpoint principal do webhook Sendflow |
| `POST` | `/api/sendhook` | Alias do endpoint de webhook |
| `POST` | `/webhook` | Alias do endpoint de webhook |

### Variáveis de ambiente (`.env`):

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### Arquivo alternativo: `webhook-server.js`

Versão standalone (sem Express) do servidor webhook, usando apenas o módulo `http` nativo do Node.js. Faz as mesmas operações de webhook via chamadas REST diretas ao Supabase. Pode ser utilizado como microserviço dedicado exclusivamente ao recebimento de webhooks.

---

## 6 — Frontend — Módulos e Páginas

### Módulos compartilhados

- **`js/env.js`** — Armazena `window.SUPABASE_CONFIG` com URL e ANON_KEY. Gerado automaticamente pelo servidor ou pelo Docker.
- **`js/database.js`** — Camada de abstração do banco. Expõe o objeto global `window.DB` com submódulos:
  - `DB.numerosControle` — CRUD de chips (listar, salvar, deletar, atualizarAtividade, processarWebhookSendflow)
  - `DB.campanhas` — CRUD de campanhas
  - `DB.mapaAparelhos` — CRUD do mapa de aparelhos
  - `DB.apiNumeros` — CRUD de números de API
  - `DB.assinarMudancas(tabela, callback)` — Assina eventos do Supabase Realtime para atualizar a UI em tempo real
- **`js/menu.js`** — Gera o menu lateral (sidebar) dinamicamente, injeta favicon e título global em todas as páginas

### Menu lateral — Navegação

| Ícone | Página | Descrição |
|-------|--------|-----------|
| 📊 Dashboard | `index.html` | Visão geral da operação |
| 📢 Campanhas | `pages/campanhas.html` | Gerenciamento de campanhas |
| 📱 Chips | `pages/celulares.html` | Gerenciamento de chips e números |
| 📈 Métricas | `pages/analytics.html` | Gráficos e análises comparativas |
| 🗺️ Mapa | `pages/mapa.html` | Mapa de aparelhos físicos |
| 🔗 Webhook | `pages/api.html` | Configuração de webhook e simulador |

---

### 6.1 — Dashboard (Visão Geral)

**Arquivo:** `index.html` + `js/script-index.js`

A página principal exibe:

- **6 cards de métricas** no topo: Total de Números, Em Uso, Em Análise, Banidos, A Reconectar, Campanhas Ativas
- **Campanhas em andamento** — cada campanha ativa é exibida com o volume de números, contagem por função (**Envio**, **Criador**, **Espião** com detalhamento no VIP e no Normal, onde Ambos soma para os dois) e todos os seus chips em formato de cards visuais, separados por grupo:
  - ⭐ **VIP** — Números no grupo VIP
  - 👑 **Ambos** — Números que operam em VIP + Normal
  - 📱 **Normal** — Números no grupo Normal
- **Insights da operação:**
  - Status dos aparelhos físicos (com/sem vagas)
  - Distribuição por função (Envios, Criador, Espião, Reserva)
  - Números por expert

**Comportamento automático:** Se um número está alocado em uma campanha ativa e com status "Disponível", o sistema automaticamente altera para "Em Uso".

**Realtime:** A página assina as tabelas `cnc_numeros_controle` e `cnc_campanhas` via Supabase Realtime, recarregando automaticamente quando qualquer dado muda.

---

### 6.2 — Chips & Números

**Arquivo:** `pages/celulares.html` + `js/script-celulares.js`

Gerenciamento completo de todos os chips/números do sistema, separados em **4 tabelas colapsáveis**:

1. **📡 Sendflow** — Números usados na plataforma Sendflow. Colunas: Nome, Número, Atividade, Função, Campanhas vinculadas, Bans, Ações.
2. **💬 Unnichat** — Números usados no Unnichat. Colunas: Nome, Número, BM (Business Manager), Target, Ações.
3. **⚪ Vagos** — Números sem uso definido. Colunas: Nome, Número, Atividade, Observações, Ações.
4. **🔥 Aquecimento** — Números em período de aquecimento. Colunas: Nome, Número, Atividade, Função, Dias Aquecendo, Observações, Ações.

**Funcionalidades:**
- Busca global em todas as tabelas
- Filtros por Status, Função e Qualidade (Sendflow) e por BM e Target (Unnichat)
- Ordenação por coluna (clicando no cabeçalho)
- Modal de cadastro/edição com campos dinâmicos por plataforma
- Modal de histórico do chip (mostra campanhas em que participou)
- Edição inline rápida via botões de ação
- Exclusão com confirmação

---

### 6.3 — Campanhas

**Arquivo:** `pages/campanhas.html` + `js/script-campanhas.js`

Gerenciamento de campanhas de marketing. Cada campanha agrupa um conjunto de números/chips.

**Funcionalidades:**
- Criar, editar e excluir campanhas
- Definir: Nome, Expert responsável, Status (Em Andamento, Agendada, Encerrada), Data alvo
- Alocar números à campanha com seleção por checkbox (com busca e filtro dentro do modal)
- Classificar cada número no grupo: ⭐ VIP, 📱 Normal ou 👑 Ambos
- Visualização expandida com tabela de números por campanha
- Edição de grupo e função do número diretamente dentro da campanha
- Filtros por Expert e Status
- Expandir/colapsar campanhas individualmente

---

### 6.4 — Métricas & Gráficos (Analytics)

**Arquivo:** `pages/analytics.html` + `js/script-analytics.js`

Painel analítico completo com **Chart.js**:

- **9 KPIs no topo:** Base Total, Em Uso, Disponíveis, Em Análise, A Reconectar, Banidos, Total de Bans, Números no VIP, Taxa de Operação (%)
- **Filtro por campanha específica** ou visão geral
- **Gráfico 1** — Comparativo por campanha (barras agrupadas: VIP vs Normal vs Ambos)
- **Gráfico 2** — Números alocados vs em uso por função (Envios, Criador, Espião, Reserva)
- **Gráfico 3** — Distribuição de status (donut chart) com amostras numéricas visíveis
- **Tabela comparativa detalhada** — Lista todas as campanhas com Total Alocados, Em Operação, VIP, Ambos, Normal, Bans Acumulados

---

### 6.5 — Mapa de Aparelhos

**Arquivo:** `pages/mapa.html` + `js/script-mapa.js`

Mapa visual dos **celulares físicos** onde os chips estão conectados.

- Layout em **3 colunas** (Esquerda, Centro, Direita) representando posições físicas
- Cada card mostra os slots do aparelho (ex: `130 // 90 // x // x`)
- **Cores indicam status:**
  - 🟡 **Amarelo** — Tem espaço para mais chips
  - ⚪ **Cinza** — Aparelho cheio (sem vagas)
  - 🔴 **Vermelho** — Aparelho com capacidade reduzida (menos de 6 slots)
- Botões de editar e excluir aparecem ao passar o mouse
- Modal para adicionar/editar aparelho (coluna, linha, capacidade, chips alocados)
- Preenchimento automático de slots vazios com "x"

---

### 6.6 — Webhook (Integração Sendflow)

**Arquivo:** `pages/api.html` + `js/script-api.js`

Página para configurar e testar a integração com o **Sendflow Sendhook**.

- **URLs de webhook** — exibe e permite copiar as URLs configuradas (servidor local e Supabase Edge Function)
- **Regras de automação documentadas na tela:**
  - Busca o chip pelo `name` (nome da conta) ou `number` (telefone)
  - Se motivo for `account-banned` → muda para "Banido" e soma +1 no contador de bans
  - Se motivo for desconexão normal → muda para "Reconectar"
- **Simulador interativo** — permite testar o webhook sem precisar do Sendflow:
  - Seleciona um chip cadastrado (preenche automaticamente nome e número)
  - Escolhe o motivo (account-banned, user-logout, network-error, session-expired)
  - Visualiza o JSON do payload que será enviado
  - Dispara o teste e vê o resultado na tela

---

## 7 — Webhook Sendflow — Automação de Bans

O **Sendflow** envia eventos (webhooks) quando uma conta do WhatsApp é banida ou desconectada. O sistema processa esses eventos automaticamente.

### Fluxo do Webhook:

```
SENDFLOW envia POST para /webhook/sendflow
    │
    ▼
Servidor recebe o payload JSON
    │
    ├── Extrai: name, number, reason, event
    │
    ├── Busca o chip no banco:
    │   1º) Pelo nome (case-insensitive)
    │   2º) Pelo número (comparação dos últimos 8 dígitos)
    │
    ├── Se NÃO encontrou → retorna 200 com aviso (evita loop do Sendflow)
    │
    ├── Se encontrou:
    │   ├── Motivo contém "ban" → atividade = "Banido", bans += 1
    │   └── Qualquer outro motivo → atividade = "Reconectar"
    │
    └── Atualiza o chip no Supabase e retorna o resultado
```

### Exemplo de payload recebido:

```json
{
  "event": "account.logged-out",
  "data": {
    "name": "MKT 90 (C)",
    "number": "5516991876538",
    "reason": "account-banned",
    "reasonMessage": "account-banned"
  }
}
```

### Exemplo de resposta:

```json
{
  "success": true,
  "message": "Chip \"MKT 90 (C)\" atualizado para \"Banido\".",
  "chip": {
    "id": 42,
    "nome": "MKT 90 (C)",
    "numero": "(16) 99187-6538",
    "statusAnterior": "Em Uso",
    "novoStatus": "Banido",
    "isBanido": true,
    "bans": 3
  }
}
```

---

## 8 — Instalação e Configuração

### Pré-requisitos:
- **Node.js** versão 18 ou superior
- Conta no **Supabase** com as tabelas criadas (ver [seção 4](#4--banco-de-dados-supabase))

### Passos:

**1. Clone o repositório:**
```bash
git clone <URL-do-repositório>
cd Controle-De-Numeros-e-Celulares
```

**2. Instale as dependências:**
```bash
npm install
```

**3. Configure as variáveis de ambiente:**

Crie um arquivo `.env` na raiz com base no `.env.example`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**4. Crie as tabelas no Supabase:**

No painel do Supabase (SQL Editor), crie as tabelas conforme descrito na [seção 4](#4--banco-de-dados-supabase). As principais tabelas são:
- `cnc_numeros_controle`
- `cnc_campanhas`
- `cnc_mapa_aparelhos`
- `cnc_api_numeros`

> **Importante:** Habilite o **Realtime** nas tabelas `cnc_numeros_controle` e `cnc_campanhas` para que o dashboard atualize em tempo real.

**5. Inicie o servidor:**
```bash
npm start
```

O sistema estará disponível em: `http://localhost:3000`

---

## 9 — Deploy com Docker / Easypanel

O projeto já vem configurado com Dockerfile para deploy em plataformas como **Easypanel**.

### Dockerfile:
- Base: `node:22-alpine`
- Porta exposta: `3000`
- Instala dependências em modo produção
- Inicia com `npm start`

### Passos para deploy no Easypanel:

1. Crie um novo serviço no Easypanel apontando para o repositório Git
2. Configure as variáveis de ambiente no Easypanel:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. O Easypanel fará o build do Docker automaticamente
4. Configure o domínio/URL no Easypanel
5. Cadastre a URL do webhook no Sendflow:
   ```
   https://seu-dominio.easypanel.host/webhook/sendflow
   ```

---

## 10 — Guia de Uso do Sistema (Passo a Passo)

---

### 10.1 — Acessando o Sistema

1. Abra o navegador e acesse a URL do sistema (local: `http://localhost:3000` ou a URL do Easypanel)
2. O **Dashboard** é a primeira tela exibida, mostrando a visão geral da operação

[TIRAR PRINT DO DASHBOARD DA TELA PRINCIPAL (index.html)]

---

### 10.2 — Cadastrando um Novo Número/Chip

1. No **menu lateral**, clique em **"Chips"**

[TIRAR PRINT DO BOTÃO "Chips" DO MENU LATERAL]

2. Na página de Chips, clique no botão **"+ ADICIONAR NÚMERO"** no canto superior direito

[TIRAR PRINT DO BOTÃO "+ ADICIONAR NÚMERO" DA TELA DE CHIPS]

3. No modal que abrir, selecione a **Plataforma do Chip**:
   - 📡 Sendflow — para números do Sendflow
   - 💬 Unnichat — para números do Unnichat
   - ⚪ Números Vagos — para números sem uso
   - 🔥 Números em Aquecimento — para números em aquecimento

[TIRAR PRINT DO CAMPO "Plataforma do Chip" DO MODAL DE ADICIONAR NÚMERO]

4. Preencha os campos obrigatórios:
   - **Nome (Identificação)** — ex: "MKT 90 (C)"
   - **Número do Celular** — ex: "(16) 99187-6538" (máscara automática)

5. Para **Sendflow**, preencha também:
   - Atividade/Status (Disponível, Em Análise, Reconectar, Banido)
   - Função (Envios, Criador, Espião, Reserva)
   - Qualidade (Alta, Média, Baixa)
   - Juízo Final (opcional)

6. Para **Unnichat**, preencha também:
   - BM (Business Manager)
   - Target/Alvo

7. Para **Aquecimento**, preencha também:
   - Dia de início do aquecimento (campo de data)

8. Clique em **"Salvar"**

[TIRAR PRINT DO BOTÃO "Salvar" DO MODAL DE ADICIONAR NÚMERO]

---

### 10.3 — Editando um Número/Chip Existente

1. Na tabela correspondente (Sendflow, Unnichat, Vagos ou Aquecimento), localize o número desejado
2. Na coluna **"AÇÕES"**, clique no **ícone de lápis (editar)**

[TIRAR PRINT DO BOTÃO DE EDITAR (ÍCONE LÁPIS) NA COLUNA AÇÕES DA TABELA DE CHIPS]

3. O modal abrirá preenchido com os dados atuais do número
4. Altere os campos desejados e clique em **"Salvar"**

---

### 10.4 — Excluindo um Número/Chip

1. Na coluna **"AÇÕES"** da tabela, clique no **ícone de lixeira (excluir)**

[TIRAR PRINT DO BOTÃO DE EXCLUIR (ÍCONE LIXEIRA) NA COLUNA AÇÕES DA TABELA DE CHIPS]

2. Confirme a exclusão na caixa de diálogo

---

### 10.5 — Usando os Filtros de Chips

1. **Busca global:** digite no campo de busca no topo da página para filtrar por nome, número, BM, target ou status

[TIRAR PRINT DO CAMPO DE BUSCA DA TELA DE CHIPS]

2. **Filtros Sendflow (barra amarela):** use os selects de Status, Função e Qualidade para filtrar a tabela Sendflow

[TIRAR PRINT DA BARRA DE FILTROS SENDFLOW (NEON AMARELO) DA TELA DE CHIPS]

3. **Filtros Unnichat (barra verde):** use os selects de BM e Target para filtrar a tabela Unnichat

[TIRAR PRINT DA BARRA DE FILTROS UNNICHAT (NEON VERDE) DA TELA DE CHIPS]

4. Para limpar filtros, clique no botão **"Limpar"** dentro da respectiva barra

---

### 10.6 — Expandir e Recolher Tabelas

1. Cada tabela (Sendflow, Unnichat, Vagos, Aquecimento) pode ser **expandida ou recolhida** clicando no **cabeçalho** da tabela

[TIRAR PRINT DO CABEÇALHO CLICÁVEL DA TABELA SENDFLOW PARA EXPANDIR/RECOLHER]

---

### 10.7 — Visualizando o Histórico de um Chip

1. Na coluna **"AÇÕES"** da tabela Sendflow, clique no **ícone de relógio (histórico)**

[TIRAR PRINT DO BOTÃO DE HISTÓRICO (ÍCONE RELÓGIO) NA COLUNA AÇÕES DA TABELA SENDFLOW]

2. O modal exibirá:
   - Resumo do chip (nome, número, status, bans, função)
   - Lista de todas as campanhas em que o chip participou ou participa

---

### 10.8 — Criando uma Nova Campanha

1. No menu lateral, clique em **"Campanhas"**

[TIRAR PRINT DO BOTÃO "Campanhas" DO MENU LATERAL]

2. Clique no botão **"+ NOVA CAMPANHA"** no canto superior direito

[TIRAR PRINT DO BOTÃO "+ NOVA CAMPANHA" DA TELA DE CAMPANHAS]

3. Preencha os campos:
   - **Nome da Campanha** — ex: "Black Friday 2026"
   - **Expert da Campanha** — selecione o expert responsável
   - **Status** — Em Andamento, Agendada ou Encerrada
   - **Data Alvo/Início** — selecione a data

[TIRAR PRINT DOS CAMPOS DO MODAL DE NOVA CAMPANHA]

4. **Selecionar Números para a Campanha:**
   - Use o campo de busca dentro do modal para encontrar números
   - Filtre por função ou status usando os dropdowns
   - Marque os checkboxes dos números desejados
   - Para cada número marcado, selecione o **grupo**: ⭐ VIP, 📱 Normal ou 👑 Ambos
   - Use "Marcar visíveis" para selecionar todos os números filtrados de uma vez

[TIRAR PRINT DA LISTA DE CHECKBOXES DE NÚMEROS NO MODAL DE CAMPANHA]

5. Clique em **"Salvar Campanha"**

[TIRAR PRINT DO BOTÃO "Salvar Campanha" DO MODAL DE CAMPANHA]

---

### 10.9 — Editando o Grupo de um Número Dentro da Campanha

1. Na tela de Campanhas, expanda a campanha desejada
2. Na tabela de números da campanha, clique no **ícone de editar** ao lado do número

[TIRAR PRINT DO BOTÃO DE EDITAR GRUPO DO NÚMERO DENTRO DA CAMPANHA]

3. No modal, altere:
   - **Grupo na Campanha** — Normal, VIP ou Ambos
   - **Função do Número** — Envios, Criador, Espião ou Reserva

4. Clique em **"Salvar Alterações"**

---

### 10.10 — Usando Filtros de Campanhas

1. Filtre por **Expert** usando o dropdown correspondente

[TIRAR PRINT DO FILTRO "Expert" DA BARRA DE FILTROS DE CAMPANHAS]

2. Filtre por **Status** usando o dropdown correspondente

[TIRAR PRINT DO FILTRO "Status" DA BARRA DE FILTROS DE CAMPANHAS]

3. Use o campo de busca para procurar campanhas pelo nome

[TIRAR PRINT DO CAMPO DE BUSCA DA TELA DE CAMPANHAS]

---

### 10.11 — Visualizando Métricas e Gráficos

1. No menu lateral, clique em **"Métricas & Gráficos"**

[TIRAR PRINT DO BOTÃO "Métricas & Gráficos" DO MENU LATERAL]

2. Os **KPIs** no topo mostram os totais gerais da base

[TIRAR PRINT DOS CARDS DE KPIs DA TELA DE ANALYTICS]

3. Use o **filtro de campanha** para analisar uma campanha específica ou a visão geral

[TIRAR PRINT DO FILTRO "Filtrar Métricas" DA TELA DE ANALYTICS]

4. Analise os **gráficos**:
   - Gráfico de barras comparativo por campanha (VIP vs Normal vs Ambos)
   - Gráfico de comparação de funções (Alocados vs Em Uso)
   - Gráfico donut de distribuição de status

[TIRAR PRINT DOS GRÁFICOS DA TELA DE ANALYTICS]

5. Role a página para ver a **tabela comparativa detalhada** com todas as campanhas

[TIRAR PRINT DA TABELA COMPARATIVA DA TELA DE ANALYTICS]

6. Clique em **"Atualizar Dados"** para recarregar as métricas manualmente

[TIRAR PRINT DO BOTÃO "Atualizar Dados" DA TELA DE ANALYTICS]

---

### 10.12 — Gerenciando o Mapa de Aparelhos

1. No menu lateral, clique em **"Mapa de Aparelhos"**

[TIRAR PRINT DO BOTÃO "Mapa de Aparelhos" DO MENU LATERAL]

2. O mapa mostra 3 colunas (Esquerda, Centro, Direita) com os aparelhos posicionados

[TIRAR PRINT DO MAPA VISUAL DE APARELHOS]

3. Para **adicionar um novo aparelho**, clique em **"+ ADICIONAR APARELHO"**

[TIRAR PRINT DO BOTÃO "+ ADICIONAR APARELHO" DA TELA DE MAPA]

4. No modal, preencha:
   - **Posição (Coluna)** — Esquerda, Centro ou Direita
   - **Ordem na Fila (Linha)** — posição vertical do aparelho
   - **Capacidade Total** — número de slots (padrão: 6)
   - **Números inseridos** — separe por espaço ou vírgula (ex: "130 90 91 92")

[TIRAR PRINT DOS CAMPOS DO MODAL DE ADICIONAR APARELHO]

5. Clique em **"Salvar Aparelho"**

6. Para **editar um aparelho**, passe o mouse sobre o card do aparelho e clique no **ícone de editar**

[TIRAR PRINT DOS BOTÕES FLUTUANTES (EDITAR/EXCLUIR) AO PASSAR O MOUSE NO CARD DO APARELHO]

7. Para **excluir um aparelho**, passe o mouse sobre o card e clique no **botão vermelho (X)**

---

### 10.13 — Configurando o Webhook do Sendflow

1. No menu lateral, clique em **"Webhook"**

[TIRAR PRINT DO BOTÃO "Webhook" DO MENU LATERAL]

2. Copie a **URL do Webhook** exibida na tela clicando no botão **"Copiar"**

[TIRAR PRINT DO BOTÃO "Copiar" AO LADO DA URL DO WEBHOOK]

3. No painel do **Sendflow**, configure a URL copiada como endpoint de **Sendhook**

---

### 10.14 — Testando o Webhook com o Simulador

1. Na página de Webhook, na seção **"Simulador de Webhook Sendflow"**:

2. Selecione um chip cadastrado no dropdown **"Selecione um Chip Cadastrado"** (os campos de nome e número serão preenchidos automaticamente)

[TIRAR PRINT DO DROPDOWN DE SELEÇÃO DE CHIP NO SIMULADOR]

3. Escolha o **Motivo da Desconexão**:
   - `account-banned` — simula um banimento (altera para Banido + soma ban)
   - `user-logout` — simula desconexão normal (altera para Reconectar)
   - `network-error` — simula erro de rede
   - `session-expired` — simula sessão expirada

[TIRAR PRINT DO DROPDOWN "Motivo da Desconexão" NO SIMULADOR]

4. Visualize o **JSON do payload** no painel ao lado para conferir os dados que serão enviados

[TIRAR PRINT DO PAINEL JSON DO SIMULADOR]

5. Clique em **"Disparar Teste do Webhook"**

[TIRAR PRINT DO BOTÃO "Disparar Teste do Webhook" NO SIMULADOR]

6. O resultado do teste será exibido abaixo, mostrando se o chip foi encontrado e atualizado com sucesso

[TIRAR PRINT DO RESULTADO DA SIMULAÇÃO DO WEBHOOK]

---

### 10.15 — Entendendo a Legenda de Cores

| Cor | Significado no Sistema |
|-----|----------------------|
| 🟢 Verde (`#10b981`) | Em Uso / Operacional |
| 🔵 Azul (`#60a5fa`) | Disponível |
| 🟡 Amarelo (`#f59e0b`) | Em Análise |
| 🔴 Vermelho (`#ef4444`) | Banido |
| 🟣 Roxo (`#a855f7`) | A Reconectar |
| 🟠 Laranja (`--laranja-brabo`) | Destaque / Brabo Concursos |

---

### 10.16 — Entendendo os Grupos de Campanha

| Badge | Grupo | Descrição |
|-------|-------|-----------|
| ⭐ VIP | VIP | Número enviando apenas para lista VIP |
| 📱 Normal | NORMAL | Número enviando apenas para lista Normal |
| 👑 Ambos | AMBOS | Número enviando para VIP e Normal simultaneamente |

---

### 10.17 — Entendendo as Funções dos Números

| Função | Descrição |
|--------|-----------|
| **Envios** | Número dedicado ao envio de mensagens |
| **Criador** | Número usado para criar contas/grupos |
| **Espião** | Número usado para monitorar concorrentes |
| **Reserva** | Número reserva, ainda não alocado para ação |

---

> **Fim da documentação.** Para dúvidas ou atualizações, consulte o código-fonte ou entre em contato com a equipe de desenvolvimento.

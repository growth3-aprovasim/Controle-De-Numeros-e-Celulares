#!/bin/sh
set -e

# Gera js/env.js com as variaveis de ambiente do container
cat > /usr/share/nginx/html/js/env.js << EOF
// js/env.js - Gerado automaticamente em runtime
// NAO edite manualmente. Configure as variaveis no .env do servidor.
window.SUPABASE_CONFIG = {
    URL: "${SUPABASE_URL}",
    ANON_KEY: "${SUPABASE_ANON_KEY}"
};
EOF

echo "[entrypoint] js/env.js gerado com sucesso."

# Inicia o nginx
exec nginx -g "daemon off;"

FROM nginx:alpine

COPY . /usr/share/nginx/html

# Copia e prepara o entrypoint que injeta as variaveis de ambiente em runtime
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

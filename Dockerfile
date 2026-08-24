# Dockerfile para Easypanel / Node.js
FROM node:22-alpine

# Diretório de trabalho
WORKDIR /app

# Copia os manifestos de dependências
COPY package*.json ./

# Instala dependências em modo de produção
RUN npm install --omit=dev

# Copia todos os arquivos do projeto (código, front-end estático, etc.)
COPY . .

# Expõe a porta 3000
EXPOSE 3000

# Variáveis padrão
ENV NODE_ENV=production
ENV PORT=3000

# Inicia o servidor Node.js
CMD ["npm", "start"]

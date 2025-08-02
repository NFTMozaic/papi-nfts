FROM node:22-alpine

WORKDIR /app

COPY .papi ./.papi
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

RUN npm install -g @acala-network/chopsticks@1.2.1

COPY . .

# Expose chopsticks port
EXPOSE 8000

CMD ["pnpm", "test"]
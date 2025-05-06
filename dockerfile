FROM node:22-alpine AS deps
WORKDIR /app

# Install openssl, python, g++, and make for native modules
RUN apk update && apk add nodejs npm openssl python3 g++ make py3-setuptools && rm -rf /var/cache/apk/*

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* prisma cabinet.config.schema.json ./

RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN \
  if [ -f package-lock.json ]; then npm run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  else echo "Lockfile not found." && exit 1; \
  fi

ENV NODE_ENV=production

RUN \
  if [ -f package-lock.json ]; then npm ci --only=production && npm cache clean --force; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile --production && yarn cache clean; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --prod; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/cabinet.config.schema.json ./
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

USER node

CMD ["npm", "run", "start"]

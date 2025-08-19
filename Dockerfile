# --- deps (빌드 의존성 설치) ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- build (프로덕션 빌드 산출) ---
FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build  # next build

# --- runtime (프로덕션 실행) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next 서버 포트/바인딩
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

# 1) 런타임 의존성 설치(한 번만!)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# 2) 빌드 산출물 복사
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# package.json 과 package-lock.json 둘 다 복사
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

# 프로덕션 서버 실행
CMD ["npx","next","start","-p","3000","-H","0.0.0.0"]

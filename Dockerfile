# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# 빌드 시점에 삽입될 퍼블릭 환경변수
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# deps 설치
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 복사 및 빌드
COPY . .
RUN npm run build  # next build

# --- Runtime stage ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 런타임에 필요한 파일만
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next

# package.json 과 package-lock.json 둘 다 복사
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

# prod deps만 설치
RUN npm ci --omit=dev

# Next 서버 포트/바인딩
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

# 프로덕션 서버 실행
CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]

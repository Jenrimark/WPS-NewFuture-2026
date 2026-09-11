# 自签名证书（仅供本地 / 内网演示；公网请换正式证书）
FROM alpine:3.19 AS certs
RUN apk add --no-cache openssl && \
  mkdir -p /certs && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
    -keyout /certs/key.pem -out /certs/cert.pem \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# 多阶段：Vite 构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=certs /certs /etc/nginx/certs
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443

# ---- Stage 1: Build frontend ----
FROM node:22-alpine AS frontend
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---- Stage 2: Build backend ----
FROM golang:1.23-alpine AS backend
RUN apk add --no-cache gcc musl-dev
WORKDIR /app/server
COPY server/go.mod server/go.sum* ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -o /poster-server .

# ---- Stage 3: Final image ----
FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY --from=backend /poster-server .
COPY --from=frontend /app/client/dist ./static
EXPOSE 8080
CMD ["./poster-server"]

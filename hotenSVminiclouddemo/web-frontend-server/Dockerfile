FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY metrics.prom /usr/share/nginx/html/metrics.prom
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

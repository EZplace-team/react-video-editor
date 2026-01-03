# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖定义
COPY package*.json ./

# 配置 npm 使用淘宝镜像源
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm ci

# 复制源码
COPY . .

# 构建项目
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 复制 standalone 输出
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]


# newFoot Monorepo

项目使用 pnpm workspace 管理，固定使用 pnpm 9.15.9。工作区包含两个前端、两个业务服务和一个杯赛爬虫服务。

## 环境要求

- Node.js >= 20.19.0
- pnpm 9.15.9
- MongoDB 8.x（运行 `manager-server` 时需要）

```bash
nvm install
nvm use
npm install -g pnpm@9.15.9
pnpm --version
pnpm install --frozen-lockfile
```

依赖统一在仓库根目录安装，仓库只维护根目录的 `pnpm-lock.yaml`。

## 工作区

| 项目 | 用途 | 默认端口 |
|------|------|----------|
| `front-server/huangguang` | 用户端 Vue 前端 | 8080 |
| `front-server/admin` | 管理端 Vue 前端 | 8082 |
| `manager-server` | Koa 管理及用户 API | 3000 |
| `backend-server` | Express 数据服务 | 5000 |
| `cup-analyzer/crawler-server` | Koa 杯赛爬虫服务 | 5001 |

## 常用命令

```bash
# 启动两个前端和 manager-server
pnpm dev

# 启动全部工作区项目
pnpm dev:all

# 顺序构建两个前端，避免同时启动两个 webpack 进程
pnpm build

# 单独运行项目
pnpm dev:admin
pnpm dev:huangguang
pnpm dev:manager
pnpm dev:backend
pnpm dev:crawler
```

生产服务可分别通过 `pnpm start:manager`、`pnpm start:backend` 和 `pnpm start:crawler` 启动。manager-server 的数据库初始化是显式操作：

```bash
pnpm init-db
```

初始化脚本可能重置业务数据，只应在确认目标数据库后手动执行。VPS 部署步骤见 [`VPS部署方案.md`](./VPS部署方案.md)。

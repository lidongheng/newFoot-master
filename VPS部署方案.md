# newFoot VPS 部署方案

## 1. 部署目标

本方案将以下项目部署到 Ubuntu 22.04/24.04 VPS：

- `front-server/huangguang`：用户端前端，访问地址为 `/huangguang/`
- `front-server/admin`：管理端前端，访问地址为 `/admin/`
- `manager-server`：Koa 后端，监听 `3000` 端口，由防火墙禁止公网直接访问
- MongoDB：部署在 VPS 本机，仅监听 `127.0.0.1:27017`

方案不使用 Docker，公网只通过 Nginx 提供 HTTP 80 端口。

最终访问结构：

```text
http://35.212.225.24/huangguang/
http://35.212.225.24/admin/
http://35.212.225.24/api/...
```

当前直接使用 VPS 公网 IP `35.212.225.24`。以后绑定域名时，再同步修改 Nginx 的 `server_name`。

> 当前方案按要求使用 HTTP。HTTP 会明文传输登录信息和业务数据，正式环境建议后续增加 HTTPS。

## 2. 部署架构

```text
浏览器
  |
  | HTTP :80
  v
Nginx
  |-- /huangguang/ -> /var/www/newfoot-frontend/huangguang/
  |-- /admin/      -> /var/www/newfoot-frontend/admin/
  |-- /api/        -> http://127.0.0.1:3000
  v
manager-server
  |
  v
MongoDB 127.0.0.1:27017
```

公网防火墙只开放 SSH 和 HTTP：

- `22/tcp`：SSH
- `80/tcp`：HTTP
- 不开放 `3000/tcp`
- 不开放 `27017/tcp`

## 3. 代码配置要求

两个前端通过子路径部署，因此需要设置生产资源路径。

`front-server/admin/vue.config.js`：

```js
module.exports = defineConfig({
  publicPath: '/admin/',
  // 其他现有配置保持不变
})
```

`front-server/huangguang/vue.config.js`：

```js
module.exports = defineConfig({
  publicPath: '/huangguang/',
  // 其他现有配置保持不变
})
```

两个项目使用 Vue Router Hash History，Nginx 不需要为前端路由额外配置 history fallback。

`manager-server` 运行时会加载 `log4js`，因此 `log4js` 必须位于 `dependencies`，不能只放在 `devDependencies`。当前项目配置已经按此要求调整。

## 4. VPS 基础环境

以下命令在 Ubuntu VPS 上执行。建议使用普通部署用户并通过 `sudo` 执行系统级操作。

安装基础工具：

```bash
sudo apt update
sudo apt install -y git nginx rsync curl ca-certificates gnupg
```

建议安装 Node.js 20 LTS。当前 VPS 使用 NVM 安装 Node.js，因此还需要记录 Node 可执行文件的绝对路径：

```bash
node --version
npm --version
command -v node
```

systemd 不会自动加载交互式 Shell 中的 NVM 环境。后面配置 `ExecStart` 时，必须使用 `command -v node` 输出的绝对路径，不能直接假定 Node 位于 `/usr/bin/node`。

安装 pnpm：

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

安装 MongoDB 时，使用 MongoDB 官方针对当前 Ubuntu 版本的 APT 仓库，不建议直接混用其他 Ubuntu 版本的 MongoDB 仓库。

确认 MongoDB 服务并启动：

```bash
sudo systemctl enable --now mongod
sudo systemctl --no-pager status mongod
```

检查 MongoDB 仅监听本机地址：

```bash
ss -lntp | grep 27017
```

结果应为 `127.0.0.1:27017`，不要出现 `0.0.0.0:27017`。

## 5. 拉取 main 分支代码

部署目录统一使用实际存在的 `/var/www/newFoot-master`，注意 Linux 路径区分大小写：

```bash
sudo mkdir -p /var/www
sudo git clone -b main git@github.com:lidongheng/newFoot-master.git /var/www/newFoot-master
```

后续更新只使用 `main` 分支：

```bash
cd /var/www/newFoot-master
git fetch origin
git pull --ff-only origin main
```

拉取后必须确认两个前端源码存在：

```bash
test -f /var/www/newFoot-master/front-server/admin/package.json
test -f /var/www/newFoot-master/front-server/huangguang/package.json
```

当前父仓库把这两个前端目录记录为 gitlink，但没有 `.gitmodules`。全新 clone 如果缺少上述文件，不能继续构建；需要先在主仓库中把前端目录整理为普通目录，或者补齐可用的子模块地址。已有完整前端源码的 VPS 目录可以继续使用。

## 6. 构建两个前端

管理端：

```bash
cd /var/www/newFoot-master/front-server/admin
pnpm install --frozen-lockfile
pnpm run build
```

如果安装出现 `ERR_PNPM_IGNORED_BUILDS`，应先在本地审核并通过 `pnpm approve-builds` 明确允许需要执行脚本的依赖，再把生成的 `pnpm-workspace.yaml` 提交到对应前端仓库。不要只在 VPS 上临时批准，否则下次全新部署仍会遇到同一问题。

用户端：

```bash
cd /var/www/newFoot-master/front-server/huangguang
pnpm install --frozen-lockfile
pnpm run build
```

准备静态文件目录：

```bash
sudo mkdir -p /var/www/newfoot-frontend/admin
sudo mkdir -p /var/www/newfoot-frontend/huangguang
```

复制构建产物：

```bash
sudo rsync -a --delete \
  /var/www/newFoot-master/front-server/admin/dist/ \
  /var/www/newfoot-frontend/admin/

sudo rsync -a --delete \
  /var/www/newFoot-master/front-server/huangguang/dist/ \
  /var/www/newfoot-frontend/huangguang/
```

设置 Nginx 可读权限：

```bash
sudo chown -R www-data:www-data /var/www/newfoot-frontend
sudo find /var/www/newfoot-frontend -type d -exec chmod 755 {} \;
sudo find /var/www/newfoot-frontend -type f -exec chmod 644 {} \;
```

## 7. 初始化和配置 manager-server

安装后端依赖：

```bash
cd /var/www/newFoot-master/manager-server
pnpm install --prod --frozen-lockfile
```

生产环境使用 `--prod`，不会安装仅用于开发的 `nodemon`，因此不需要在 VPS 上授权 `nodemon` 的安装脚本。

创建环境变量文件：

```bash
sudo mkdir -p /etc/newfoot
sudo vim /etc/newfoot/manager-server.env
```

文件内容：

```env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/football
```

限制配置文件权限：

```bash
sudo chmod 600 /etc/newfoot/manager-server.env
```

首次部署初始化数据库：

```bash
cd /var/www/newFoot-master/manager-server
MONGO_URI=mongodb://127.0.0.1:27017/football pnpm run init-db
```

## 8. 使用 systemd 管理后端

创建服务文件：

```bash
sudo vim /etc/systemd/system/newfoot-manager.service
```

先执行 `command -v node`。当前 VPS 的输出为 `/root/.nvm/versions/node/v24.7.0/bin/node`，因此服务文件写入：

```ini
[Unit]
Description=newFoot manager server
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
WorkingDirectory=/var/www/newFoot-master/manager-server
EnvironmentFile=/etc/newfoot/manager-server.env
ExecStart=/root/.nvm/versions/node/v24.7.0/bin/node /var/www/newFoot-master/manager-server/bin/www
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

不要再在 service 中重复写 `Environment=NODE_ENV=...`、`Environment=PORT=...` 或 `Environment=MONGO_URI=...`；这些变量统一由 `EnvironmentFile` 提供。

当前 Node 安装在 `/root/.nvm/`，所以本配置没有设置 `User=www-data`，也不应把整个源码目录递归 `chown` 给 `www-data`。如果以后升级或切换 NVM 中的 Node 版本，需要同步修改 `ExecStart` 的绝对路径。

启动并设置开机自启：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now newfoot-manager
sudo systemctl --no-pager status newfoot-manager
```

查看后端日志：

```bash
sudo journalctl -u newfoot-manager -f
```

本机接口验证：

```bash
curl http://127.0.0.1:3000/api/v1/system/time
```

## 9. 配置 Nginx

创建站点配置：

```bash
sudo vim /etc/nginx/sites-available/newFoot
```

当前通过公网 IP `35.212.225.24` 访问，写入：

```nginx
server {
    listen 80 default_server;
    server_name 35.212.225.24 _;

    root /var/www/newfoot-frontend;

    location = / {
        return 302 /huangguang/;
    }

    location = /admin {
        return 301 /admin/;
    }

    location /admin/ {
        try_files $uri $uri/ /admin/index.html;
    }

    location = /huangguang {
        return 301 /huangguang/;
    }

    location /huangguang/ {
        try_files $uri $uri/ /huangguang/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置前先检查文件名。Linux 区分 `newFoot` 和 `newfoot`，本方案统一使用 `newFoot`：

```bash
sudo ls -la /etc/nginx/sites-available/
sudo ls -la /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

只有 `/etc/nginx/sites-enabled/newFoot` 不存在时，才创建软链接：

```bash
sudo ln -s /etc/nginx/sites-available/newFoot /etc/nginx/sites-enabled/newFoot
sudo nginx -t
sudo systemctl reload nginx
```

如果 `nginx -t` 报错找不到 `/etc/nginx/sites-enabled/newfoot`，说明存在一个大小写错误的失效软链接。确认 `newFoot` 配置正确后删除错误链接：

```bash
sudo rm -f /etc/nginx/sites-enabled/newfoot
sudo nginx -t
sudo systemctl reload nginx
```

如果创建软链接时提示 `File exists`，说明 `/etc/nginx/sites-enabled/newFoot` 已经存在，不要重复执行 `ln -s`。

## 10. 防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
sudo ufw status
```

确认公网没有暴露后端和数据库端口：

```bash
ss -lntp | grep -E ':80|:3000|:27017'
```

理想结果是：

- Nginx 对外监听 `0.0.0.0:80`
- 当前 Node 服务可能监听所有网卡的 `3000` 端口，因此必须同时通过 UFW 和 VPS 云防火墙禁止公网访问 `3000`
- MongoDB 只监听 `127.0.0.1:27017`

## 11. 发布更新流程

每次发布 `main` 分支的新版本：

```bash
cd /var/www/newFoot-master
git fetch origin
git pull --ff-only origin main

cd front-server/admin
pnpm install --frozen-lockfile
pnpm run build
sudo rsync -a --delete dist/ /var/www/newfoot-frontend/admin/

cd ../huangguang
pnpm install --frozen-lockfile
pnpm run build
sudo rsync -a --delete dist/ /var/www/newfoot-frontend/huangguang/

cd ../../manager-server
pnpm install --prod --frozen-lockfile
sudo systemctl restart newfoot-manager
sudo systemctl reload nginx
```

如果后端依赖或环境变量发生变化，重启后端前先确认 `pnpm install --frozen-lockfile` 和环境变量文件正确。

## 12. 验收清单

服务状态：

```bash
sudo systemctl is-active mongod
sudo systemctl is-active newfoot-manager
sudo systemctl is-active nginx
```

HTTP 验证：

```bash
curl -I http://35.212.225.24/
curl -I http://35.212.225.24/huangguang/
curl -I http://35.212.225.24/admin/
curl http://35.212.225.24/api/v1/system/time
```

浏览器验证：

1. `/huangguang/` 可以加载页面、JS、CSS 和图片。
2. `/admin/` 可以加载管理页面和 Element Plus 资源。
3. 用户端请求 `/api/v1/...` 正常。
4. 管理端请求 `/api/v1/admin/...` 正常。
5. Hash Router 页面刷新后不出现 404。
6. VPS 重启后 MongoDB、Node 后端和 Nginx 自动恢复。

故障排查：

```bash
sudo journalctl -u newfoot-manager -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/error.log
sudo nginx -t
curl http://127.0.0.1:3000/api/v1/system/time
```

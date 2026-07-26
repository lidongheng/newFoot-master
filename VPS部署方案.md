# newFoot VPS 部署方案

## 1. 部署目标

本方案将以下项目部署到 Ubuntu 22.04/24.04 VPS：

- `front-server/huangguang`：用户端前端，访问地址为 `/huangguang/`
- `front-server/admin`：管理端前端，访问地址为 `/admin/`
- `manager-server`：Koa 后端，内部监听 `127.0.0.1:3000`
- MongoDB：部署在 VPS 本机，仅监听 `127.0.0.1:27017`

方案不使用 Docker，公网只通过 Nginx 提供 HTTP 80 端口。

最终访问结构：

```text
http://your-domain.com/huangguang/
http://your-domain.com/admin/
http://your-domain.com/api/...
```

将 `your-domain.com` 替换为实际域名。没有域名时可以将其替换为 VPS 公网 IP。

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

安装 Node.js 20 LTS，并确认版本：

```bash
node --version
npm --version
```

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
sudo systemctl status mongod
```

检查 MongoDB 仅监听本机地址：

```bash
ss -lntp | grep 27017
```

结果应为 `127.0.0.1:27017`，不要出现 `0.0.0.0:27017`。

## 5. 拉取 main 分支代码

部署目录使用 `/var/www/newfoot-master`：

```bash
sudo mkdir -p /var/www
sudo git clone -b main git@github.com:lidongheng/newFoot-master.git /var/www/newfoot-master
sudo chown -R "$USER":"$USER" /var/www/newfoot-master
```

后续更新只使用 `main` 分支：

```bash
cd /var/www/newfoot-master
git fetch origin
git reset --hard origin/main
```

## 6. 构建两个前端

管理端：

```bash
cd /var/www/newfoot-master/front-server/admin
pnpm install --frozen-lockfile
pnpm run build
```

用户端：

```bash
cd /var/www/newfoot-master/front-server/huangguang
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
  /var/www/newfoot-master/front-server/admin/dist/ \
  /var/www/newfoot-frontend/admin/

sudo rsync -a --delete \
  /var/www/newfoot-master/front-server/huangguang/dist/ \
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
cd /var/www/newfoot-master/manager-server
pnpm install --frozen-lockfile
```

创建环境变量文件：

```bash
sudo mkdir -p /etc/newfoot
sudo nano /etc/newfoot/manager-server.env
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
cd /var/www/newfoot-master/manager-server
MONGO_URI=mongodb://127.0.0.1:27017/football pnpm run init-db
```

## 8. 使用 systemd 管理后端

创建服务文件：

```bash
sudo nano /etc/systemd/system/newfoot-manager.service
```

写入：

```ini
[Unit]
Description=newFoot manager server
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/newfoot-master/manager-server
EnvironmentFile=/etc/newfoot/manager-server.env
ExecStart=/usr/bin/node /var/www/newfoot-master/manager-server/bin/www
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

确保后端目录可被 `www-data` 读取：

```bash
sudo chown -R www-data:www-data /var/www/newfoot-master/manager-server
```

启动并设置开机自启：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now newfoot-manager
sudo systemctl status newfoot-manager
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
sudo nano /etc/nginx/sites-available/newfoot
```

写入以下内容，并替换 `your-domain.com`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/newfoot /etc/nginx/sites-enabled/newfoot
sudo nginx -t
sudo systemctl reload nginx
```

如果默认站点占用访问入口，可以删除默认站点链接：

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

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
- Node 只监听本机 `127.0.0.1:3000` 或由本机端口提供服务
- MongoDB 只监听 `127.0.0.1:27017`

## 11. 发布更新流程

每次发布 `main` 分支的新版本：

```bash
cd /var/www/newfoot-master
git fetch origin
git reset --hard origin/main

cd front-server/admin
pnpm install --frozen-lockfile
pnpm run build
sudo rsync -a --delete dist/ /var/www/newfoot-frontend/admin/

cd ../huangguang
pnpm install --frozen-lockfile
pnpm run build
sudo rsync -a --delete dist/ /var/www/newfoot-frontend/huangguang/

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
curl -I http://your-domain.com/
curl -I http://your-domain.com/huangguang/
curl -I http://your-domain.com/admin/
curl http://your-domain.com/api/v1/system/time
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

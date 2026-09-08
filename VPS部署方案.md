# newFoot Oracle Cloud VPS 部署方案

## 1. 部署目标

本方案用于全新安装 Oracle Cloud 弹性云服务器，配置如下：

- 公网 IP：`129.225.166.130`
- 操作系统：Ubuntu 24.04 LTS
- 配置：2 核 CPU、12G 内存
- Node.js：22.x，由 NVM 管理
- pnpm：固定 `9.15.9`
- MongoDB：8.0 Community Edition，只监听本机
- Web 服务：Nginx + systemd

线上运行以下项目：

- `front-server/huangguang`：用户端前端，访问 `/huangguang/`
- `front-server/admin`：管理端前端，访问 `/admin/`
- `manager-server`：Koa API，监听 3000 端口，由两层防火墙禁止公网访问

`backend-server` 和 `cup-analyzer/crawler-server` 继续属于 pnpm workspace，但本方案不启动它们。

最终访问地址：

```text
http://129.225.166.130/huangguang/
http://129.225.166.130/admin/
http://129.225.166.130/api/...
```

## 2. 部署结构

```text
Internet :80
    |
    v
Nginx
    |-- /huangguang/ -> /var/www/newfoot-frontend/huangguang/
    |-- /admin/      -> /var/www/newfoot-frontend/admin/
    |-- /api/        -> http://127.0.0.1:3000
                              |
                              v
                        manager-server
                              |
                              v
                    MongoDB 127.0.0.1:27017
```

Oracle Cloud 和 Ubuntu 两层防火墙只开放：

- `22/tcp`：SSH，建议仅允许自己的固定公网 IP
- `80/tcp`：HTTP，来源 `0.0.0.0/0`

不要开放 `3000`、`5000`、`5001` 和 `27017`。

## 3. 重装系统与 Oracle Cloud 网络

在 Oracle Cloud 控制台为实例重新安装 Ubuntu 24.04 LTS 镜像，并保留或重新绑定公网 IP `129.225.166.130`。重装会清空系统盘，执行前应确认旧实例没有需要保留的数据库或配置。

在实例所在子网的 [Security List](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm) 或关联的 Network Security Group 中添加入站规则：

| 来源 | 协议 | 端口 | 用途 |
|------|------|------|------|
| 自己的公网 IP `/32` | TCP | 22 | SSH |
| `0.0.0.0/0` | TCP | 80 | HTTP |

Windows 使用 MobaXterm 连接。Ubuntu 镜像默认 SSH 用户名通常为 `ubuntu`：

1. 打开 MobaXterm，点击 `Session`，选择 `SSH`。
2. `Remote host` 填写 `129.225.166.130`，端口保持 `22`。
3. 勾选 `Specify username`，填写 `ubuntu`。
4. 打开 `Advanced SSH settings`，勾选 `Use private key`，选择创建 Oracle Cloud 实例时保存到 Windows 的私钥文件。
5. 点击 `OK`。首次连接时核对并接受服务器主机指纹。
6. 进入终端后执行 `sudo -i`，提示符应从普通用户切换为 root。

后续所有服务器命令均在 root Shell 中执行，不再重复添加 `sudo`。

登录后确认系统和架构：

```bash
cat /etc/os-release
uname -m
dpkg --print-architecture
free -h
nproc
```

系统应为 Ubuntu 24.04，架构应为 `amd64` 或 `arm64`，内存约 12G，CPU 为 2 核。

## 4. 系统初始化

更新系统并安装基础工具：

```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg git nginx rsync ufw build-essential
timedatectl set-timezone Asia/Shanghai
```

创建部署目录和仓库外的运行日志目录：

```bash
mkdir -p /var/www/newFoot-master
mkdir -p /var/www/newfoot-frontend/admin
mkdir -p /var/www/newfoot-frontend/huangguang
mkdir -p /var/lib/newfoot/logs
```

应用代码、NVM、Node.js、pnpm 和 manager-server 均由 root 用户管理。Nginx 静态目录在发布后设置为 `www-data` 所有。

## 5. 使用 NVM 安装 Node.js 22 和 pnpm 9.15.9

按照 [NVM 官方说明](https://github.com/nvm-sh/nvm)为 root 用户安装 NVM 0.40.7：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
```

安装 Node.js 22，并设置为 root 用户的默认版本：

```bash
nvm install 22
nvm alias default 22
nvm use 22
npm install -g pnpm@9.15.9
node --version
npm --version
pnpm --version
command -v node
command -v pnpm
```

Node 路径应位于 `/root/.nvm/versions/node/`。`pnpm --version` 必须输出 `9.15.9`。仓库根目录的 `.nvmrc` 固定 Node.js 22；不要安装其他 pnpm 版本，也不要执行 `pnpm self-update`。

## 6. 安装 MongoDB 8.0

按照 [MongoDB 8.0 官方 Ubuntu 安装说明](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-ubuntu/)导入签名密钥，并添加 Ubuntu 24.04 Noble 仓库：

```bash
curl -fsSL https://pgp.mongodb.com/server-8.0.asc | \
  gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

echo 'deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse' | \
  tee /etc/apt/sources.list.d/mongodb-org-8.0.list

apt update
apt install -y mongodb-org
systemctl enable --now mongod
systemctl --no-pager status mongod
```

确认 MongoDB 只监听本机：

```bash
ss -lntp | grep 27017
```

结果必须包含 `127.0.0.1:27017`，不能出现 `0.0.0.0:27017`。如果监听地址不正确，检查 `/etc/mongod.conf` 中的 `net.bindIp`，修改为 `127.0.0.1` 后重启：

```bash
systemctl restart mongod
```

## 7. 使用 MobaXterm SFTP 上传并恢复 MongoDB 备份

### 7.1 打开 SFTP 面板

MobaXterm 建立 SSH 会话后，左侧通常会自动显示同一连接的 SFTP 文件浏览器。如果没有显示，在菜单中开启 SFTP browser，然后重新连接该 SSH Session。

SFTP 面板仍使用 SSH 登录用户 `ubuntu`，不会因为终端执行了 `sudo -i` 而获得 root 权限，因此不能直接上传到 `/root` 或 `/tmp`。先在 root 终端准备上传目录：

```bash
mkdir -p /home/ubuntu/upload
chown ubuntu:ubuntu /home/ubuntu/upload
chmod 700 /home/ubuntu/upload
```

先在 macOS 本机导出 `football` 数据库。你当前使用的命令保持不变：

```bash
mongodump \
  --uri='mongodb://127.0.0.1:27017/football' \
  --archive="$HOME/Desktop/football.archive.gz" \
  --gzip
```

导出完成后，macOS 桌面应出现 `football.archive.gz`。先在 macOS 终端记录原文件的 SHA-256：

```bash
shasum -a 256 "$HOME/Desktop/football.archive.gz"
```

然后按以下路径传输文件：

1. 在 macOS 微信中把 `football.archive.gz` **作为文件**发送给 Windows 上登录的微信。
2. 在 Windows 微信中下载该文件，并在资源管理器中确认文件名仍为 `football.archive.gz`。
3. 在 Windows PowerShell 中输入 `Get-FileHash -Algorithm SHA256 `，再把下载后的文件拖入 PowerShell 窗口，让系统自动填入实际路径，然后按回车。
4. 确认 Windows 输出的哈希值与 macOS 的 `shasum` 结果一致。
5. 打开已经连接 VPS 的 MobaXterm，在左侧 SFTP 地址栏输入 `/home/ubuntu/upload`。
6. 把 Windows 上的 `football.archive.gz` 拖入 SFTP 面板，等待传输进度结束。

Windows PowerShell 最终执行的命令形式如下，路径以微信的实际下载位置为准：

```powershell
Get-FileHash -Algorithm SHA256 'C:\实际下载目录\football.archive.gz'
```

### 7.2 移动备份并校验

在 root 终端把上传文件移动到恢复命令使用的固定路径，并限制文件权限：

```bash
mv /home/ubuntu/upload/football.archive.gz /tmp/football.archive.gz
chown root:root /tmp/football.archive.gz
chmod 600 /tmp/football.archive.gz
ls -lh /tmp/football.archive.gz
file /tmp/football.archive.gz
```

服务器计算上传后文件的校验值：

```bash
sha256sum /tmp/football.archive.gz
```

macOS、Windows 和 VPS 三处的 SHA-256 必须完全一致。接着确认 MongoDB 正常运行，且服务器已安装 `mongorestore`：

```bash
systemctl is-active mongod
mongorestore --version
```

### 7.3 先预检，再正式导入

全新服务器此时还没有启动 manager-server，可以直接恢复。以后需要重新导入备份时，应先停止后端，避免恢复过程中继续写入数据库：

```bash
systemctl stop newfoot-manager
```

先执行 dry run，确认 archive 能读取且内容属于预期数据库：

```bash
mongorestore \
  --uri='mongodb://127.0.0.1:27017' \
  --archive=/tmp/football.archive.gz \
  --gzip \
  --dryRun \
  --verbose
```

检查输出没有读取错误，并确认列出的命名空间均为预期的 `football` 集合。然后使用你的正式导入命令：

```bash
mongorestore \
  --uri='mongodb://127.0.0.1:27017' \
  --archive=/tmp/football.archive.gz \
  --gzip \
  --drop
```

按照 [MongoDB 官方 `mongorestore` 说明](https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-examples/)，`--drop` 会在恢复前删除备份中存在的目标集合。命令结束时确认恢复失败数为 `0`，再进行数据检查。

### 7.4 验证恢复结果

```bash
mongosh 'mongodb://127.0.0.1:27017/football' --quiet --eval 'db.getCollectionNames()'
mongosh 'mongodb://127.0.0.1:27017/football' --quiet --eval 'db.getCollectionNames().map(name => ({ name, count: db.getCollection(name).countDocuments({}) }))'
```

确认主要集合存在且记录数符合备份预期。已经从备份恢复数据后，必须跳过后文的 `pnpm init-db`，否则初始化脚本可能覆盖恢复的数据。`/tmp/football.archive.gz` 暂时保留到整套部署验收完成。

## 8. 配置 GitHub SSH 并拉取代码

为 root 用户生成只用于部署的 SSH 密钥：

```bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
ssh-keygen -q -t ed25519 -N '' -C 'newfoot-oracle-deploy' -f /root/.ssh/id_ed25519
cat /root/.ssh/id_ed25519.pub
```

将输出的公钥添加到 GitHub 仓库 `lidongheng/newFoot-master` 的 Deploy keys，并授予只读权限。随后验证连接并接受 GitHub 主机指纹：

```bash
ssh -T git@github.com
```

首次拉取：

```bash
rmdir /var/www/newFoot-master
git clone -b main git@github.com:lidongheng/newFoot-master.git /var/www/newFoot-master
cd /var/www/newFoot-master
git status --short --branch
```

确认工作区配置和三个线上项目存在：

```bash
test -f package.json
test -f pnpm-workspace.yaml
test -f front-server/admin/package.json
test -f front-server/huangguang/package.json
test -f manager-server/package.json
```

## 9. 安装依赖并构建前端

2 核 12G 内存可以在 VPS 构建。项目根 `build` 已设置 `workspace-concurrency=1`，两个前端仍会顺序构建，降低峰值资源占用：

```bash
cd /var/www/newFoot-master
nvm use
pnpm install --frozen-lockfile --prod=false
pnpm build
```

只有两个前端都构建成功后才发布静态文件：

```bash
rsync -a --delete front-server/admin/dist/ /var/www/newfoot-frontend/admin/
rsync -a --delete front-server/huangguang/dist/ /var/www/newfoot-frontend/huangguang/
chown -R www-data:www-data /var/www/newfoot-frontend
find /var/www/newfoot-frontend -type d -exec chmod 755 {} \;
find /var/www/newfoot-frontend -type f -exec chmod 644 {} \;
```

## 10. 配置 manager-server

创建生产环境变量文件：

```bash
mkdir -p /etc/newfoot
vim /etc/newfoot/manager-server.env
```

写入：

```env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/football
```

限制权限并让服务用户可读：

```bash
chown root:root /etc/newfoot/manager-server.env
chmod 600 /etc/newfoot/manager-server.env
```

仅在没有恢复 MongoDB 备份、且确认目标是全新空数据库时，才手动初始化一次：

```bash
cd /var/www/newFoot-master
nvm use
MONGO_URI=mongodb://127.0.0.1:27017/football pnpm init-db
```

`init-db` 可能重置目标数据库。服务器投入使用后，不要在日常发布流程中再次执行。

## 11. 使用 systemd 管理后端

创建 `/etc/systemd/system/newfoot-manager.service`：

```ini
[Unit]
Description=newFoot manager server
After=network-online.target mongod.service
Wants=network-online.target mongod.service

[Service]
Type=simple
WorkingDirectory=/var/lib/newfoot
EnvironmentFile=/etc/newfoot/manager-server.env
Environment=HOME=/root
Environment=NVM_DIR=/root/.nvm
ExecStart=/bin/bash -c '. /root/.nvm/nvm.sh && nvm use 22 >/dev/null && exec node /var/www/newFoot-master/manager-server/bin/www'
KillSignal=SIGINT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

加载并启动服务：

```bash
systemctl daemon-reload
systemctl enable --now newfoot-manager
systemctl --no-pager status newfoot-manager
curl http://127.0.0.1:3000/api/v1/system/time
```

systemd 使用 `/var/lib/newfoot` 作为工作目录，应用文件日志会写入 `/var/lib/newfoot/logs`，不会修改 Git 仓库中的已跟踪日志文件。

查看日志：

```bash
journalctl -u newfoot-manager -f
```

## 12. 配置 Nginx

创建 `/etc/nginx/sites-available/newFoot`：

```nginx
server {
    listen 80 default_server;
    server_name 129.225.166.130 _;

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
rm -f /etc/nginx/sites-enabled/default
test -L /etc/nginx/sites-enabled/newFoot || ln -s /etc/nginx/sites-available/newFoot /etc/nginx/sites-enabled/newFoot
nginx -t
systemctl enable nginx
systemctl reload nginx
```

如果软链接已存在，不要重复创建；直接执行 `nginx -t` 和 reload。

## 13. 配置 Ubuntu 防火墙

先确保 SSH 规则存在，再启用 UFW：

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw enable
ufw status verbose
```

确认监听端口：

```bash
ss -lntp | grep -E ':80|:3000|:27017'
```

预期结果：

- Nginx 对外监听 `0.0.0.0:80`
- manager-server 监听 3000，但 Oracle Cloud 和 UFW 均未开放该端口
- MongoDB 只监听 `127.0.0.1:27017`

## 14. 日常发布流程

在 VPS 上执行：

```bash
cd /var/www/newFoot-master
git fetch origin
git pull --ff-only origin main
nvm use
pnpm install --frozen-lockfile --prod=false
pnpm build
```

如果安装或构建失败，到此停止，继续使用当前线上静态文件和正在运行的后端。全部成功后再发布：

```bash
rsync -a --delete front-server/admin/dist/ /var/www/newfoot-frontend/admin/
rsync -a --delete front-server/huangguang/dist/ /var/www/newfoot-frontend/huangguang/
chown -R www-data:www-data /var/www/newfoot-frontend
systemctl restart newfoot-manager
nginx -t
systemctl reload nginx
```

数据库初始化不属于日常发布步骤。

## 15. 验收清单

检查服务：

```bash
systemctl is-active mongod
systemctl is-active newfoot-manager
systemctl is-active nginx
```

检查本机和公网接口：

```bash
curl http://127.0.0.1:3000/api/v1/system/time
curl -I http://129.225.166.130/
curl -I http://129.225.166.130/huangguang/
curl -I http://129.225.166.130/admin/
curl http://129.225.166.130/api/v1/system/time
```

浏览器验收：

1. `/huangguang/` 能加载页面、JS、CSS 和图片。
2. `/admin/` 能加载管理页面和 Element Plus、Vant 资源。
3. 用户端 `/api/v1/...` 请求正常。
4. 管理端 `/api/v1/admin/...` 请求正常。
5. Hash Router 页面刷新不出现 404。
6. 重启 VPS 后 MongoDB、manager-server 和 Nginx 自动恢复。
7. 公网无法直接访问 3000 和 27017 端口。

## 16. 故障排查

```bash
journalctl -u newfoot-manager -n 100 --no-pager
journalctl -u mongod -n 100 --no-pager
tail -n 100 /var/log/nginx/error.log
nginx -t
curl http://127.0.0.1:3000/api/v1/system/time
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
node --version
pnpm --version
```

如果公网无法访问但本机 `curl` 正常，依次检查：

1. Oracle Cloud Security List 或 Network Security Group 是否允许 TCP 80。
2. `ufw status verbose` 是否允许 TCP 80。
3. Nginx 是否监听 80。
4. 公网 IP 是否仍为 `129.225.166.130`。

绑定域名后，将 Nginx `server_name` 改为域名，再配置 HTTPS；在此之前保持 HTTP 部署。

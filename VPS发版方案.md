# newFoot VPS 发版方案

## 1. 适用范围

本方案用于 VPS 环境已经安装完成后的日常更新，发布以下三个线上项目：

- `front-server/admin`：管理端，访问 `/admin/`；
- `front-server/huangguang`：用户端，访问 `/huangguang/`；
- `manager-server`：Koa API，由 `newfoot-manager.service` 管理，监听 `127.0.0.1:4000`。

服务器源码目录为 `/var/www/newFoot-master`，前端静态目录为 `/var/www/newfoot-frontend`。前端继续在 Windows 构建，VPS 只拉取相同 Git 提交、安装后端生产依赖并发布构建包。

本流程不会执行 `pnpm init-db`、`mongorestore` 或数据库迁移，不会启动 `backend-server` 和 `cup-analyzer/crawler-server`。如果某次更新包含数据库结构或数据迁移，需要为该次发布单独编写迁移及回滚步骤。

## 2. 发版前检查

确认准备发布的代码已经提交并推送到 `origin/main`，并确认本次提交包含全部预期修改。不要从存在未提交文件的工作区构建发布包。

在 Windows PowerShell 中进入项目根目录：

```powershell
cd 'D:\workspace\newFoot-master'
git switch main
git pull --ff-only origin main
git status --short
node --version
pnpm --version
```

检查结果必须满足：

- `git status --short` 没有输出；
- Node.js 为 22.x；
- pnpm 必须为 `9.15.9`；
- 当前提交已经推送到 `origin/main`。

在 VPS 的 root Shell 中检查当前线上状态：

```bash
systemctl is-active mongod
systemctl is-active newfoot-manager
systemctl is-active nginx
curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/system/time
cd /var/www/newFoot-master
git status --short
```

前三项必须输出 `active`，接口必须返回成功。VPS 仓库的 `git status --short` 必须没有输出；如果存在修改，停止发版，先查明文件来源，不要覆盖或清理未知改动。

## 3. Windows 构建发布包

仍在 Windows 项目根目录执行：

```powershell
pnpm install --frozen-lockfile --prod=false
pnpm build
Test-Path '.\front-server\admin\dist\index.html'
Test-Path '.\front-server\huangguang\dist\index.html'
```

构建必须成功，两个 `Test-Path` 都必须输出 `True`。随后生成发布目录、两个前端压缩包、提交标识和校验文件：

```powershell
$releaseDir = Join-Path $env:USERPROFILE 'Desktop\newfoot-release'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
Remove-Item -Path (Join-Path $releaseDir '*') -Recurse -Force -ErrorAction SilentlyContinue

Compress-Archive -Path '.\front-server\admin\dist\*' -DestinationPath (Join-Path $releaseDir 'admin-dist.zip')
Compress-Archive -Path '.\front-server\huangguang\dist\*' -DestinationPath (Join-Path $releaseDir 'huangguang-dist.zip')
git rev-parse HEAD | Set-Content -NoNewline -Encoding ascii (Join-Path $releaseDir 'release-commit.txt')

$adminHash = (Get-FileHash -Algorithm SHA256 (Join-Path $releaseDir 'admin-dist.zip')).Hash.ToLower()
$huangguangHash = (Get-FileHash -Algorithm SHA256 (Join-Path $releaseDir 'huangguang-dist.zip')).Hash.ToLower()
"$adminHash  admin-dist.zip" | Set-Content -Encoding ascii (Join-Path $releaseDir 'SHA256SUMS')
"$huangguangHash  huangguang-dist.zip" | Add-Content -Encoding ascii (Join-Path $releaseDir 'SHA256SUMS')

Get-Content (Join-Path $releaseDir 'release-commit.txt')
Get-Content (Join-Path $releaseDir 'SHA256SUMS')
```

使用 MobaXterm SFTP 将以下四个文件上传到 VPS 的 `/home/ubuntu/upload/`：

- `admin-dist.zip`；
- `huangguang-dist.zip`；
- `release-commit.txt`；
- `SHA256SUMS`。

## 4. VPS 预检与备份

以下命令应在同一个 root Shell 中连续执行，避免丢失本次发版变量。

先校验上传文件：

```bash
cd /home/ubuntu/upload
sha256sum -c SHA256SUMS
```

两个文件都必须显示 `OK`。然后读取目标提交并准备本次发布目录：

```bash
TARGET_COMMIT="$(tr -d '\r\n' < /home/ubuntu/upload/release-commit.txt)"
RELEASE_ID="$(date '+%Y%m%d-%H%M%S')-${TARGET_COMMIT}"
STAGE_DIR="$(mktemp -d /tmp/newfoot-release.XXXXXX)"
BACKUP_DIR="/var/lib/newfoot/releases/${RELEASE_ID}"

mkdir -p "${STAGE_DIR}/admin"
mkdir -p "${STAGE_DIR}/huangguang"
unzip -q /home/ubuntu/upload/admin-dist.zip -d "${STAGE_DIR}/admin"
unzip -q /home/ubuntu/upload/huangguang-dist.zip -d "${STAGE_DIR}/huangguang"
test -f "${STAGE_DIR}/admin/index.html"
test -f "${STAGE_DIR}/huangguang/index.html"
```

确认目标提交存在于远端 `main`，并且只能从当前线上提交快进：

```bash
cd /var/www/newFoot-master
git status --porcelain
OLD_COMMIT="$(git rev-parse HEAD)"
git fetch origin main
git rev-parse --verify "${TARGET_COMMIT}^{commit}"
test "$(git rev-parse origin/main)" = "${TARGET_COMMIT}"
git merge-base --is-ancestor "${OLD_COMMIT}" "${TARGET_COMMIT}"
```

以上命令必须全部成功，`git status --porcelain` 必须没有输出。接着备份当前静态文件和线上提交：

```bash
mkdir -p "${BACKUP_DIR}/admin"
mkdir -p "${BACKUP_DIR}/huangguang"
cp -a /var/www/newfoot-frontend/admin/. "${BACKUP_DIR}/admin/"
cp -a /var/www/newfoot-frontend/huangguang/. "${BACKUP_DIR}/huangguang/"
printf '%s\n' "${OLD_COMMIT}" > "${BACKUP_DIR}/source-commit.txt"
printf '%s\n' "${TARGET_COMMIT}" > "${BACKUP_DIR}/release-commit.txt"
```

`BACKUP_DIR` 是本次回滚目录。发布完成前不要删除该目录和上传包。

## 5. 更新后端并发布前端

先把 VPS 源码切换到与前端构建包完全一致的提交：

```bash
cd /var/www/newFoot-master
git switch main
git merge --ff-only "${TARGET_COMMIT}"
nvm use
pnpm --version
pnpm --filter manager-server install --frozen-lockfile --prod
```

`pnpm --version` 必须为 `9.15.9`。依赖安装失败时停止发布，此时不要替换前端文件，也不要重启后端。

依赖安装成功后重启并检查后端：

```bash
systemctl restart newfoot-manager
systemctl is-active newfoot-manager
curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/system/time
journalctl -u newfoot-manager -n 30 --no-pager
```

服务必须为 `active`，本机接口必须成功，并且最近日志不能出现启动失败、MongoDB 连接失败或端口占用。后端检查失败时直接执行第 7 节回滚，不要继续发布前端。

后端正常后替换两个前端静态目录：

```bash
rsync -a --delete "${STAGE_DIR}/admin/" /var/www/newfoot-frontend/admin/
rsync -a --delete "${STAGE_DIR}/huangguang/" /var/www/newfoot-frontend/huangguang/
chown -R www-data:www-data /var/www/newfoot-frontend
find /var/www/newfoot-frontend -type d -exec chmod 755 {} \;
find /var/www/newfoot-frontend -type f -exec chmod 644 {} \;
nginx -t
```

本次只替换静态文件，不需要 reload Nginx；`nginx -t` 用于确认既有配置仍然有效。

## 6. 发版验收

先从 VPS 检查服务、接口和静态入口：

```bash
systemctl is-active mongod
systemctl is-active newfoot-manager
systemctl is-active nginx
curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/system/time
curl --fail --silent --show-error http://129.225.166.130/api/v1/system/time
curl --fail --silent --show-error --output /dev/null http://129.225.166.130/admin/
curl --fail --silent --show-error --output /dev/null http://129.225.166.130/huangguang/
test "$(git -C /var/www/newFoot-master rev-parse HEAD)" = "${TARGET_COMMIT}"
```

随后在浏览器中验收：

1. `/admin/` 可以登录，比赛列表和编辑弹窗正常；录入的比赛时间按北京时间显示。
2. `/huangguang/` 页面、JS、CSS 和图片正常加载，比赛与交易时间显示为固定 GMT-4。
3. 用户端额度、今日赛事、早盘、滚球和投注记录接口正常。
4. 管理端比赛新增、编辑和列表查询正常。
5. 在北京时间 12:00 前后确认额度日按固定 GMT-4 零点切换，不跟随美国冬令时变化。
6. 浏览器强制刷新一次，确认没有旧缓存导致的资源加载错误。

全部通过后记录本次版本：

```bash
printf 'release=%s\ncommit=%s\nfinished_at=%s\n' \
  "${RELEASE_ID}" \
  "${TARGET_COMMIT}" \
  "$(date --iso-8601=seconds)" \
  > /var/lib/newfoot/current-release.txt
cat /var/lib/newfoot/current-release.txt
```

## 7. 回滚

如果后端启动失败、接口异常或前端出现严重问题，使用本次第 4 节输出的准确备份目录。不要猜测目录名称：

```bash
ROLLBACK_DIR='/var/lib/newfoot/releases/填写本次RELEASE_ID'
test -f "${ROLLBACK_DIR}/source-commit.txt"
test -f "${ROLLBACK_DIR}/admin/index.html"
test -f "${ROLLBACK_DIR}/huangguang/index.html"
OLD_COMMIT="$(cat "${ROLLBACK_DIR}/source-commit.txt")"
```

先恢复后端源码和生产依赖：

```bash
cd /var/www/newFoot-master
git status --porcelain
git switch --detach "${OLD_COMMIT}"
nvm use
pnpm --filter manager-server install --frozen-lockfile --prod
systemctl restart newfoot-manager
systemctl is-active newfoot-manager
curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/system/time
```

执行 `git switch` 前，`git status --porcelain` 必须没有输出。随后恢复前端：

```bash
rsync -a --delete "${ROLLBACK_DIR}/admin/" /var/www/newfoot-frontend/admin/
rsync -a --delete "${ROLLBACK_DIR}/huangguang/" /var/www/newfoot-frontend/huangguang/
chown -R www-data:www-data /var/www/newfoot-frontend
find /var/www/newfoot-frontend -type d -exec chmod 755 {} \;
find /var/www/newfoot-frontend -type f -exec chmod 644 {} \;
nginx -t
```

再次执行第 6 节验收。回滚后仓库处于 detached HEAD 是预期状态；下次发版开始时执行 `git switch main`，再按本方案发布新的 `origin/main` 提交。

## 8. 常见失败处理

后端重启失败时：

```bash
systemctl --no-pager status newfoot-manager
journalctl -u newfoot-manager -n 100 --no-pager
ss -lntp '( sport = :4000 )'
systemctl is-active mongod
```

公网前端异常但 VPS 静态文件存在时：

```bash
nginx -t
systemctl is-active nginx
tail -n 100 /var/log/nginx/error.log
ls -l /var/www/newfoot-frontend/admin/index.html
ls -l /var/www/newfoot-frontend/huangguang/index.html
```

公网 API 异常但本机 API 正常时，检查 Nginx `/api/` 代理、Ubuntu UFW 和 Oracle Cloud 入站规则。不要开放 4000 或 27017 端口，也不要通过重新执行 `pnpm init-db` 解决发布故障。

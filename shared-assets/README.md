# Workspace 共享静态资源

所有项目共同使用此目录中的第三方静态资源，不在每个项目或每个报告里复制一份。

```text
shared-assets/
├── vue/                 # Vue 3.5.46 浏览器生产版及许可证
├── element-plus/        # Element Plus 2.14.8 完整构建、样式、中文语言包及许可证
├── ranking-table/       # 排行榜表格的 composable、入口和样式
└── echarts/
    ├── echarts.min.js
    ├── LICENSE
    ├── NOTICE
    ├── licenses/
    └── version.json
```

ECharts 的固定版本在根 package.json 管理。安装 workspace 依赖后，在仓库根目录执行：

```bash
node scripts/syncSharedAssets.js
# 或 pnpm assets:sync
```

需要图表的离线 HTML 可使用相对于 HTML 文件的路径引用 shared-assets/echarts/echarts.min.js，不在各项目复制第三方库。analysis-cli 当前指标 HTML 使用本地 Element Plus 表格，不加载 ECharts。

## 无需安装依赖的 Element Plus 表格

在 workspace 根目录执行 `node scripts/syncTableAssets.js`，从 Vue、Element Plus 官方 npm 包下载浏览器成品，并验证固定 SHA-512。这是下载静态文件，不会安装依赖或修改 package.json、pnpm-lock.yaml。脚本不使用 CDN，生成页面运行时也不联网。

浏览器按顺序加载 vue/vue.global.prod.js、element-plus/index.full.min.js 和 element-plus/zh-cn.min.js，并引入 element-plus/index.css。所有项目都可以引用同一份文件。版本与来源见各目录 version.json。

Web 项目可将 workspace 的 shared-assets 映射为静态目录，例如映射到 `/shared-assets/` 后使用：

```html
<script src="/shared-assets/echarts/echarts.min.js"></script>
```

文件服务器映射应指向 workspace 根目录下的 shared-assets，而非子项目自己的目录。本次没有改动其他项目的服务配置；各项目按其框架静态目录机制映射即可。

离线分享报告时保留 workspace 相对目录结构，同时携带 shared-assets。只有 leagueRanking 文件夹不再包含完整的第三方图表依赖。

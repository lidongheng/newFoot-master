1、东恒精通足球，本项目名为cup-analyzer是专门为了杯赛而创建的项目，由于每个杯赛的规则不同，理论上需要为每个杯赛创建一个文件夹，专门去分析这个杯赛的比赛。

2、AI助手的目标就是带着更充分的信息帮东恒做更好的判断。

3、项目结构说明：

```
cup-analyzer/
├── README.md                          # 本文件
├── theWorldCup/                       # 2026世界杯分析
│   ├── workflow.md                    # 工作流程说明
│   ├── rule/                          # 赛事规则
│   │   ├── group-stage-rule.md        # 小组赛规则（48队12组）
│   │   └── 16th-finals-rule.md        # 32强对阵规则
│   ├── data/                          # 赛程和基础数据
│   │   ├── c75.js                     # 赛程数据（球探体育格式）
│   │   ├── 冠军赔率.md                # 冠军赔率
│   │   └── 球队与序号对照表.md        # 球队ID对照
│   ├── squad/                         # 48队26人大名单
│   │   └── group-{A~L}/              # 按小组分类
│   ├── teamProfile/                   # 球队画像（自动生成）
│   ├── report/                        # 赛前分析报告
│   │   ├── group-stage/round-{1~3}/   # 小组赛
│   │   ├── round-of-32/              # 32强
│   │   ├── round-of-16/              # 16强
│   │   ├── quarter-finals/            # 8强
│   │   ├── semi-finals/              # 半决赛
│   │   └── final/                     # 决赛
│   ├── postMatchSummary/              # 赛后复盘
│   ├── strategy/                      # 世界杯独特策略分析
│   │   ├── group-path-analysis.md     # 小组出线路径
│   │   ├── opponent-selection.md      # 挑对手策略
│   │   ├── tacit-match-detection.md   # 默契球风险识别
│   │   └── fatigue-schedule.md        # 赛程疲劳度
│   ├── description/                   # 球队简介（AI只读，东恒编辑）
│   └── news/                          # 比赛素材
└── crawler-server/                    # Koa2爬虫服务
    ├── app.js                         # 服务入口
    ├── config/                        # 配置
    ├── routes/                        # API路由
    ├── crawlers/                      # 爬虫核心
    │   ├── base.js                    # 爬虫基类
    │   ├── squadCrawler.js            # 大名单爬虫
    │   ├── matchDataCrawler.js        # 赛后数据爬虫
    │   ├── oddsCrawler.js             # 赔率爬虫
    │   └── scheduleCrawler.js         # 赛程更新爬虫
    ├── processors/                    # 数据处理
    │   ├── squadProcessor.js          # 大名单清洗 → Markdown
    │   ├── teamProfileGenerator.js    # 球队画像生成
    │   └── strategyAnalyzer.js        # 策略分析报告生成
    └── utils/                         # 工具函数
```

4、爬虫服务使用方式：

```bash
cd cup-analyzer/crawler-server

# 启动HTTP服务
npm run dev

# CLI模式（无需启动服务）
node crawlers/squadCrawler.js              # 批量爬取48队大名单
node crawlers/squadCrawler.js --team 772   # 爬取西班牙大名单
node processors/squadProcessor.js          # 生成大名单Markdown
node processors/teamProfileGenerator.js    # 生成球队画像
node processors/strategyAnalyzer.js        # 生成策略分析报告
node crawlers/matchDataCrawler.js --match 2906701  # 爬取单场赛后数据
node crawlers/oddsCrawler.js 2906701       # 爬取单场赔率
node crawlers/scheduleCrawler.js           # 更新赛程数据
```

5、三个分析阶段：

- **阶段一（赛前）**：收集48队大名单 → 生成球队画像 → 评估小组实力 → 分析出线路径
- **阶段二（赛中）**：逐场赛前分析 → 赛后复盘总结（复用league-analyzer的分析模式）
- **阶段三（策略）**：挑对手分析 → 默契球识别 → 赛程疲劳度 → 保留实力识别

6、AI分析技能文件位于 `.cursor/rules/dh-worldcup-analysis/SKILL.md`

10、介绍一些足球场上的位置缩写：
GK 守门员
RB 右后卫
CB 中后卫
RCB 右中后卫
LCB 左中后卫
LB 左后卫
RWB 右翼卫
LWB 左翼卫
CDM 后腰
LDM 左边后腰
RDM 右边后腰
CAM 前腰
RAM 右前腰
LAM 左前腰
RM 右中场
LM 左中场
CM 中前卫
ST 中锋
LW 左边锋
RW 右边锋
CF 影锋

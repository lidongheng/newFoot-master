# 48队初选大名单（自动生成）

> 由 `squadProcessor.js` 从 `player_center` JSON **全量**生成，人数常多于正式26人。正式名单请编辑 **`squad-final/`**（见 `../squad-final/README.md`）。

## 数据来源

球探体育(titan007) teamDetail API，通过 `crawler-server/crawlers/squadCrawler.js` 爬取。

## 文件结构

按12个小组分类，每个球队一个 Markdown 文件：

```
squad/
├── group-A/  墨西哥、南非、韩国、欧洲附加D胜者
├── group-B/  加拿大、卡塔尔、瑞士、欧洲附加A胜者
├── group-C/  巴西、摩洛哥、海地、苏格兰
├── group-D/  美国、巴拉圭、澳大利亚、欧洲附加C胜者
├── group-E/  德国、科特迪瓦、厄瓜多尔、库拉索
├── group-F/  荷兰、日本、突尼斯、欧洲附加B胜者
├── group-G/  比利时、埃及、伊朗、新西兰
├── group-H/  西班牙、沙特阿拉伯、乌拉圭、佛得角
├── group-I/  法国、塞内加尔、挪威、附加赛2胜者
├── group-J/  阿根廷、奥地利、约旦、阿尔及利亚
├── group-K/  葡萄牙、哥伦比亚、乌兹别克斯坦、附加赛1胜者
└── group-L/  英格兰、克罗地亚、加纳、巴拿马
```

## 每个球员包含的字段

| 字段 | 说明 |
|------|------|
| 球衣号 | 球衣号码 |
| 姓名 | 中文名 |
| 年龄 | 根据出生年份计算 |
| 身高 | cm |
| 位置 | 具体位置（如CB、CDM、LW等） |
| 身价 | 万（欧元/英镑） |
| 国籍 | 国籍 |

## 生成方式

```bash
cd cup-analyzer/crawler-server
node crawlers/squadCrawler.js        # 先爬取JSON数据
node processors/squadProcessor.js    # 再生成Markdown
```

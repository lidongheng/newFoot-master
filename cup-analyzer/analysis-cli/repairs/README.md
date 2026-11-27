# 用户资料驱动的数据修正

此目录存放已登记联赛的修正脚本、待应用补丁和历史。第一版只修正 lineup.json 的六个字段：homeFormation、guestFormation、homeStarting、guestStarting、homeSubs、guestSubs。不会顺带修改比分、伤停、技术统计或球员统计。以下以西甲为例，其他联赛需在补丁中填写对应 league、season 和已核验比赛 ID。

你提供资料后，由助手整理补丁并展示差异；实际写入使用明确的 apply 命令，不由 build 自动触发。本仓库没有为 3013698 编造阵容，也没有为该场生成待执行的真实补丁。

## 命令

工作目录 `cup-analyzer/analysis-cli`：

```bash
node bin/cli.js repair preview --patch repairs/patches/laLiga/26-27/3013698-lineup.json
node bin/cli.js repair apply --patch repairs/patches/laLiga/26-27/3013698-lineup.json
```

上述路径是将来收到资料后的存放位置，文件尚未提供时命令会报错。

## 补丁格式

以下仅说明格式，不是任何真实比赛的修正内容：

```json
{
  "league": "laLiga",
  "season": "2026-2027",
  "matchId": "已核验的比赛ID",
  "kind": "lineup",
  "source": "用户提供的原始资料说明；不得标成已独立核实",
  "changes": [
    {
      "field": "homeFormation",
      "beforeExists": true,
      "before": "",
      "after": "4-3-3",
      "mode": "replace"
    },
    {
      "field": "homeSubs",
      "beforeExists": true,
      "before": [],
      "after": [{ "name": "用户提供的姓名", "number": "用户提供的号码" }],
      "mode": "append"
    }
  ]
}
```

- beforeExists 表示旧字段是否存在；为 true 必须提供 before。字段原来不存在时填 false，不写 before。
- 阵型采用明确连字符格式，例如 4-3-3；脚本不推断阵型。
- 部分名单补充用 append，before 为原完整数组，after 为用户提供的新增人员。
- 覆盖整个名单用 replace，并明确 complete: true。替换完整首发必须有 11 人；部分资料不能伪装为完整名单。
- 球员对象允许 id、number、name、captainType、injuryReason；只填写有资料支持的字段，不补造队长、伤病等空值。number 使用字符串。
- 未提供 ID 时只在同赛季、本队 playerStats 中按姓名及已提供号码唯一匹配。多个 ID 则停止，请用户确认；找不到时保留缺 ID 状态并在预览中列出，不生成 ID。
- 同队首发、替补不能有重复人员或已知重复号码；首发不能超过 11 人。

## 写入与历史

预览会核验球队配置、赛程和比赛身份，展示双方文件中的字段差异和 ID 匹配决定，不产生历史或写入文件。

apply 同时核验双方预期旧值、备份原文件，然后同步写入。原文件缺失时，只创建赛程核验的 matchId/homeName/awayName 及用户提供字段，不创建其他空数组。旧值冲突、预览后文件变化时拒绝覆盖；当前值已经等于新值时跳过。

history 每次修正记录 patch.json、双方 before-N.json、record.json，包含来源、差异、时间、修改前后哈希和状态。双方写入失败时恢复原文件，并记录 rolledBack；恢复也失败时记录 rollbackFailed 及具体文件，不声称已恢复。

原文件起初不存在时没有 before-N.json，失败恢复会移除本次新建文件。已成功应用的补丁再次执行显示 unchanged，不重复创建历史。已存在的源文件未知字段保留，用户未指定的伤停等字段保持原样。

重新抓取会改变文件内容时，历史不会自动强制覆盖新数据。分析报告会区分修正哈希是否仍匹配当前副本。

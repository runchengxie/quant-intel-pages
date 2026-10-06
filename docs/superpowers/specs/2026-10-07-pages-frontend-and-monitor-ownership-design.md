# Pages 前端与日报监控职责设计

日期：2026-10-07

## 目标

让三个仓库各自拥有与其发布周期相符的能力，同时避免对同一份公开日报运行两套定时新鲜度检查：

- `quant-intel-platform` 生成报告、审核数据和公开快照。
- `quant-intel-deploy` 负责生产发布、调度以及用已校验的本地输入核对线上报告。
- `quant-intel-pages` 负责 Astro 网站、静态站点构建和与网站构建直接相关的检查。

Pages 不是纯静态文件仓库。Astro 页面、前端构建适配器、浏览器和组件测试仍属于网站产品本身，应留在 Pages。`artifacts/public/` 中已审核的报告快照是网站构建输入，也继续留在 Pages。

## 当前情况

Platform 的 Astro 日报前端已退役，首页跳转至 Pages；Platform 文档继续位于 `/docs/`。Pages 的浏览器测试整理和 `sharp` 安全更新已通过 [PR #95](https://github.com/runchengxie/quant-intel-pages/pull/95) 合并，主提交为 `473fdec`。PR 将 `sharp` 锁定版从 0.35.4 更新至公告修复版 0.35.5；本地 `npm audit --audit-level=high` 无漏洞，远端完整 Pages 门禁通过。

目前两边都检查公开报告新鲜度：

- Pages 的 `public-site-monitor.yml` 每六小时读取公开报告快照，根据 Pages 自己的日历和生成时间创建或关闭 GitHub Issues；`workflow_run` 事件另负责跟踪网站构建失败。
- Deploy 已有 `public-pages-freshness.timer` 和 `check_public_pages_freshness.py`，按早晚时段以已验证的生产报告为期望值核对线上报告日期，并通过部署侧既有通知通道告警。

Deploy 的公开数据日期检查与生产输入准入规则一致；Pages 另有超过 96 小时的快照年龄复核、长休市提示和亚洲市场日历延期规则。这些不是 Deploy 当前日期比较器覆盖的行为，不能随 Pages 监控一起删除。当前 Deploy timer 处于启用状态。其 2026-10-06 19:35 的上一次服务记录显示亚洲报告尚未发布；目前线上亚洲索引已更新至 2026-10-06。重构不会把这条历史失败记录当成当前服务仍有故障，也不会擅自启动生产服务。

## 方案比较

### 方案 A：两套新鲜度监控都保留

几乎不需要修改，但两边使用不同的期望值和通知途径；同一个延迟可能产生不同判断与重复告警。长期维护边界仍不清晰。

### 方案 B：Deploy 负责日报新鲜度，Pages 只监控自身构建结果（推荐）

将 Pages 的年龄复核和市场休市延期语义补入 Deploy 现有 systemd 新鲜度检查，再移除 Pages 六小时快照检查及其专用日历数据。Deploy 检查同时覆盖已验证本地报告是否落后于线上、公开快照是否超过年龄阈值、市场休市时是否应延期。Pages 保留 `workflow_run` 对自身网站构建成功或失败的 Issue 跟踪。

这保留了两个不同信号：Deploy 判断报告是否按生产输入发布以及公开快照是否需要人工复核；Pages 判断自己的网站构建是否成功。报告新鲜度规则和相应日历只维护在 Deploy。

### 方案 C：把 Pages 构建结果监控也移到 Deploy

这会让 Pages 最接近纯前端仓库，但需要 Deploy 轮询 GitHub Actions，或增加跨仓库事件传递、凭据与失败恢复路径。当前 Deploy 私有仓库的 Actions 不承担常规定时运行；为迁移 Pages 构建告警引入另一套自动化并无足够收益。

## 推荐职责与目录

| 仓库 | 保留职责 | 不负责 |
|---|---|---|
| `quant-intel-platform` | 数据处理、报告生成、审核、schema 和公开快照导出 CLI | Astro 页面与线上发布调度 |
| `quant-intel-deploy` | GitHub PR 发布器、生产定时任务、对比已验证输入与线上报告日期、快照年龄/交易日复核、生产通知 | 报告算法与前端展示 |
| `quant-intel-pages` | Astro 页面/组件/样式、站点构建适配器、构建配置、静态公开报告输入、前端测试、网站构建结果监控 | 日报生成与生产报告新鲜度调度 |

Pages 的 `astro.config.mjs`、`package.json`、lock 文件、`playwright.config.ts`、`tsconfig.json` 和 `pyproject.toml` 留在根目录，保持 Astro、npm、Playwright、TypeScript 与 Python 工具链的常用入口。`.github/workflows/` 保持 GitHub 约定路径。`scripts/` 用于网站构建和站点操作入口；`tools/` 保留 Pages 仓库自己的结构审计器，不与站点构建脚本混成一类。浏览器用例统一放在 `tests/browser/`。

## 变更范围

### Deploy

- 将 `check_public_pages_freshness.py` 与 `public-pages-freshness.timer` 明确记录为生产日报新鲜度检查的唯一 owner。
- 将 Pages 当前的 96 小时年龄复核、亚洲日历的 22:00 发布截止与休市延期、US/Asia 快照元数据检查语义迁入 Deploy。为此确认可复用的 Deploy 市场日历来源覆盖范围；不同市场（SSE/HK/JP/KR）的开市规则不得未经验证地折叠为 SSE 单一日历。
- 覆盖本地输入未就绪时不臆测日期、线上日期落后或缺失时失败、长休市年龄复核、市场日历延期或不可用时失败关闭、网络/API 不可用时告警，以及 US 日报完整性告警。
- 保持 systemd 定时表达式、外部配置、通知通道、生产 release 和当前已启用 timer 不变。若现有测试未覆盖以上语义，只补齐必要的脚本测试和运维文档，不引入第二套检查器。

### Pages

- 删除六小时 schedule 所触发的报告快照新鲜度模式及其独立日历投影，包括不再使用的 `scripts/public_site_freshness.py`、`scripts/public_site_calendar.py`、`configs/asia-calendar.json` 和对应专属测试。
- 将 `scripts/public_site_alerts.py` 收敛为 Pages `Public website` workflow 的完成结果跟踪；保留它对目标分支、仓库身份、完成状态和旧事件乱序的校验，以及对构建失败创建/更新、成功恢复后关闭 GitHub Issue 的行为。
- 将 `public-site-monitor.yml` 收敛为 `workflow_run` 入口和该入口所需的最小权限；移除已不再有用途的 schedule 和只用于快照新鲜度预览的手动 dry-run 入口。
- 保留前端页面、构建脚本、公开数据产物、安全审计器和测试。不得移动或重写公开 URL、报告 schema、发布窗口和页面路由。

## 迁移顺序

1. 已完成 Pages PR #95：浏览器测试归入 `tests/browser/`，受安全公告影响的 `sharp` 锁定依赖已在独立提交中更新。
2. 先在 Deploy 分支迁入并测试 Pages 的年龄/日历复核语义，确认日历来源和覆盖范围后更新 runbook；保持 timer 表达式、部署配置与生产状态不变。完成 Deploy PR 与本地门禁后合并。
3. 在 Pages 分支精简新鲜度检查与工作流，保留网站构建完成/失败告警。迁移期间用固定 fixture 比较原有 Pages 规则与 Deploy 新实现的结果，覆盖常规交易日、长假、亚洲发布截止前后、日历失效和缺失/过期快照。
4. 先确认 Pages 代码变更已合并，再观察 Deploy 现有 timer 的下一次自然运行成功。此步骤只观察既有调度，不改变生产服务、定时器、通知目标或数据路径。

生产数据、报告 URL、`/data/` 与 `/reports/` 浏览器路径、五日报告窗口、发布凭据和消息目标均保持不变。Pages 的 GH Actions 只继续管理 Pages 仓库自身的构建工作流，不获得生产报告凭据。

## 验收标准

- Pages 中不再存在定时读取报告快照并生成新鲜度告警的工作流入口或并行日历实现。
- Deploy 的现有生产检查完整覆盖亚洲、美股报告日期、年龄复核、市场日历延期和发布可用性判断；生产 timer 与配置未被修改。
- Pages 仍能构建原有首页和报告页；静态报告文件、公开 URL 和浏览器路由与调整前相同。
- Pages 对其网站构建失败仍按事件创建或更新告警，成功恢复后关闭对应 Issue；忽略其他仓库、PR 来源或过时事件。
- 两仓库各自的门禁通过；Deploy 的 PR 在 Pages 删除重复监控代码前先合并。
- 仅在确认 Pages 合并版本与线上检查正常后清理各自任务 worktree；不清理其他任务或带有待保留状态的 worktree。

## 不在本次范围内

- 不将 Astro 页面或前端构建适配器迁入 Platform/Deploy。
- 不更改生产 systemd timer、配置、凭据、日报发布时点、GitHub Pages 域名或发布状态。
- 不删除 Pages 网站自身的构建失败跟踪。
- 不顺带重排所有 `.json`、`.mjs`、`.ts` 或工具链配置文件。
- 不把公开快照和历史静态材料从 Git 迁移到另一套存储。

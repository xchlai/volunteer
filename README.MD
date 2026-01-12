# 志愿者活动登记（Cloudflare Pages）

本项目使用 Cloudflare Pages + D1 数据库来管理志愿者活动与登记记录，适配 PC/手机浏览器。

## 功能
- 管理员：新增/编辑/删除志愿者活动（含时长）。
- 用户：提交工号、姓名并一次选择多个活动，重复提交会覆盖该工号的所有登记记录。
- 管理员统计：
  - 每人累计时长
  - 总志愿者人数、总人次数、总时长
  - 导出 CSV（工号、姓名、志愿者活动、时间）
  - 支持删除单条登记

## 本地开发（可选）
1. 安装 [Wrangler](https://developers.cloudflare.com/workers/wrangler/)：
   ```bash
   npm install -g wrangler
   ```
2. 创建 D1 数据库并记下 `database_id`：
   ```bash
   wrangler d1 create volunteer-db
   ```
3. 更新 `wrangler.toml` 中的 `database_id`。
4. 应用迁移：
   ```bash
   wrangler d1 migrations apply volunteer-db
   ```
5. 启动 Pages 开发服务器：
   ```bash
   wrangler pages dev ./public
   ```

## 部署到 Cloudflare Pages
1. 将仓库导入 Cloudflare Pages。
2. 在 Pages 项目中：
   - **构建命令**：留空
   - **输出目录**：`public`
3. 绑定 D1 数据库：
   - 在 Pages 项目设置里添加 **D1 binding**，名称为 `DB`，选择上面创建的数据库。
4. 设置环境变量：
   - `ADMIN_PASSWORD`：管理员固定密码。
5. 在本地执行迁移（或通过 CI）：
   ```bash
   wrangler d1 migrations apply volunteer-db --remote
   ```
6. 触发部署后即可访问：
   - 用户页面：`/`
   - 管理员页面：`/admin.html`

## 使用说明
- 用户可一次提交多个活动，重复提交会覆盖该工号原有记录。
- 管理员后台可删除登记记录或活动（删除活动会同时删除对应登记）。

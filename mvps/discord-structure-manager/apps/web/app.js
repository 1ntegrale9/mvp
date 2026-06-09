const STORAGE_KEY = "discord-structure-manager-state-discord-ids-ja";
const PRESET_KEY = "discord-structure-manager-presets-numeric-ja";
const IMPORTED_GUILDS_URL = "data/discord-guilds.json";

const permissions = [
  ["VIEW_CHANNEL", "チャンネルを見る", "閲覧・参加できるか", "テキスト / ボイス / ステージ"],
  ["SEND_MESSAGES", "メッセージを送信", "テキスト投稿を許可", "テキスト"],
  ["READ_MESSAGE_HISTORY", "メッセージ履歴を見る", "過去ログを読めるか", "テキスト"],
  ["ADD_REACTIONS", "リアクションを追加", "絵文字リアクションを許可", "テキスト"],
  ["ATTACH_FILES", "ファイルを添付", "画像やファイル投稿を許可", "テキスト"],
  ["EMBED_LINKS", "リンクを埋め込み", "URLのプレビュー表示を許可", "テキスト"],
  ["USE_APPLICATION_COMMANDS", "アプリコマンドを使う", "スラッシュコマンドを許可", "テキスト / ボイス"],
  ["MENTION_EVERYONE", "@everyoneを通知", "全体通知の利用を許可", "テキスト"],
  ["CONNECT", "ボイスに接続", "ボイス・ステージへ参加できるか", "ボイス / ステージ"],
  ["SPEAK", "ボイスで発言", "通話で話せるか", "ボイス"],
  ["STREAM", "画面共有・配信", "Go Liveや画面共有を許可", "ボイス"],
  ["MANAGE_MESSAGES", "メッセージを管理", "他人の投稿削除などを許可", "テキスト"],
  ["MANAGE_CHANNELS", "チャンネルを管理", "チャンネル編集を許可", "テキスト / ボイス / ステージ"],
  ["MANAGE_ROLES", "権限を管理", "ロール・権限編集を許可", "テキスト / ボイス / ステージ"],
  ["MANAGE_THREADS", "スレッドを管理", "スレッド整理を許可", "テキスト"],
].map(([id, label, description, scope]) => ({ id, label, description, scope }));

const presetSeeds = [
  {
    id: "1513371079303764001",
    name: "一般チャット",
    description: "メンバーが普通に会話できる標準テキスト権限。",
    source: "common",
    permissions: {
      VIEW_CHANNEL: "allow",
      SEND_MESSAGES: "allow",
      READ_MESSAGE_HISTORY: "allow",
      ADD_REACTIONS: "allow",
      ATTACH_FILES: "allow",
      EMBED_LINKS: "allow",
      USE_APPLICATION_COMMANDS: "allow",
      MENTION_EVERYONE: "deny",
      MANAGE_MESSAGES: "deny",
      MANAGE_CHANNELS: "deny",
      MANAGE_ROLES: "deny",
    },
  },
  {
    id: "1513371079303764002",
    name: "閲覧のみ",
    description: "告知・ルール閲覧向け。投稿は止める。",
    source: "common",
    permissions: {
      VIEW_CHANNEL: "allow",
      READ_MESSAGE_HISTORY: "allow",
      SEND_MESSAGES: "deny",
      ADD_REACTIONS: "deny",
      ATTACH_FILES: "deny",
      MENTION_EVERYONE: "deny",
    },
  },
  {
    id: "1513371079303764003",
    name: "非表示",
    description: "選択ロールからチャンネルを隠す。",
    source: "common",
    permissions: {
      VIEW_CHANNEL: "deny",
    },
  },
  {
    id: "1513371079303764004",
    name: "運営専用",
    description: "スタッフ用カテゴリ向け。閲覧・投稿・管理を許可。",
    source: "common",
    permissions: {
      VIEW_CHANNEL: "allow",
      SEND_MESSAGES: "allow",
      READ_MESSAGE_HISTORY: "allow",
      ADD_REACTIONS: "allow",
      ATTACH_FILES: "allow",
      EMBED_LINKS: "allow",
      USE_APPLICATION_COMMANDS: "allow",
      CONNECT: "allow",
      SPEAK: "allow",
      MANAGE_MESSAGES: "allow",
      MANAGE_CHANNELS: "allow",
      MANAGE_ROLES: "allow",
    },
  },
  {
    id: "1513371079303764005",
    name: "雑談ボイス",
    description: "通常ボイスチャンネル用。接続・発話・配信を許可。",
    source: "common",
    permissions: {
      VIEW_CHANNEL: "allow",
      CONNECT: "allow",
      SPEAK: "allow",
      STREAM: "allow",
      USE_APPLICATION_COMMANDS: "allow",
      MANAGE_CHANNELS: "deny",
      MANAGE_ROLES: "deny",
    },
  },
  {
    id: "1513371079303764006",
    name: "ミュート中",
    description: "荒らし対応や一時制限向け。閲覧以外を抑制。",
    source: "common",
    permissions: {
      VIEW_CHANNEL: "allow",
      READ_MESSAGE_HISTORY: "allow",
      SEND_MESSAGES: "deny",
      ADD_REACTIONS: "deny",
      ATTACH_FILES: "deny",
      CONNECT: "deny",
      SPEAK: "deny",
    },
  },
];

const seedState = {
  id: "1513371079303761001",
  guildName: "MVPラボ コミュニティ",
  channels: [
    { id: "1513371079303762001", type: "category", name: "はじめに" },
    { id: "1513371079303762002", type: "text", name: "ルール", parentId: "1513371079303762001", synced: true },
    { id: "1513371079303762003", type: "announcement", name: "お知らせ", parentId: "1513371079303762001", synced: false },
    { id: "1513371079303762004", type: "category", name: "交流" },
    { id: "1513371079303762005", type: "text", name: "雑談", parentId: "1513371079303762004", synced: true },
    { id: "1513371079303762006", type: "thread", name: "自己紹介スレッド", parentId: "1513371079303762005" },
    { id: "1513371079303762007", type: "thread", name: "おすすめTips", parentId: "1513371079303762005" },
    { id: "1513371079303762008", type: "text", name: "アイデア", parentId: "1513371079303762004", synced: true },
    { id: "1513371079303762009", type: "forum", name: "相談フォーラム", parentId: "1513371079303762004", synced: true },
    { id: "1513371079303762010", type: "thread", name: "Bot相談", parentId: "1513371079303762009" },
    { id: "1513371079303762011", type: "thread", name: "イベント相談", parentId: "1513371079303762009" },
    { id: "1513371079303762012", type: "voice", name: "ラウンジ", parentId: "1513371079303762004", synced: false },
    { id: "1513371079303762013", type: "category", name: "運営" },
    { id: "1513371079303762014", type: "text", name: "運営チャット", parentId: "1513371079303762013", synced: true },
    { id: "1513371079303762015", type: "text", name: "モデレーションログ", parentId: "1513371079303762013", synced: true },
  ],
  roles: [
    { id: "1513371079303763001", name: "管理者", color: "#e54646" },
    { id: "1513371079303763002", name: "モデレーター", color: "#f0a202" },
    { id: "1513371079303763003", name: "運営", color: "#2f8f83" },
    { id: "1513371079303763004", name: "メンバー", color: "#5865f2" },
    { id: "1513371079303763005", name: "ゲスト", color: "#8b8f9a" },
    { id: "1513371079303763006", name: "ミュート中", color: "#30343b" },
  ],
  overrides: {
    "1513371079303762001": {
      "1513371079303763004": { ...presetSeeds.find((p) => p.id === "1513371079303764002").permissions },
      "1513371079303763005": { ...presetSeeds.find((p) => p.id === "1513371079303764002").permissions },
    },
    "1513371079303762003": {
      "1513371079303763004": { ...presetSeeds.find((p) => p.id === "1513371079303764002").permissions },
      "1513371079303763005": { ...presetSeeds.find((p) => p.id === "1513371079303764002").permissions },
    },
    "1513371079303762004": {
      "1513371079303763004": { ...presetSeeds.find((p) => p.id === "1513371079303764001").permissions },
      "1513371079303763006": { ...presetSeeds.find((p) => p.id === "1513371079303764006").permissions },
    },
    "1513371079303762013": {
      "1513371079303763003": { ...presetSeeds.find((p) => p.id === "1513371079303764004").permissions },
      "1513371079303763002": { ...presetSeeds.find((p) => p.id === "1513371079303764004").permissions },
      "1513371079303763004": { ...presetSeeds.find((p) => p.id === "1513371079303764003").permissions },
      "1513371079303763005": { ...presetSeeds.find((p) => p.id === "1513371079303764003").permissions },
    },
    "1513371079303762014": {
      "1513371079303763003": { ...presetSeeds.find((p) => p.id === "1513371079303764004").permissions },
      "1513371079303763004": { ...presetSeeds.find((p) => p.id === "1513371079303764003").permissions },
      "1513371079303763005": { ...presetSeeds.find((p) => p.id === "1513371079303764003").permissions },
    },
    "1513371079303762015": {
      "1513371079303763002": { ...presetSeeds.find((p) => p.id === "1513371079303764004").permissions },
      "1513371079303763004": { ...presetSeeds.find((p) => p.id === "1513371079303764003").permissions },
      "1513371079303763005": { ...presetSeeds.find((p) => p.id === "1513371079303764003").permissions },
    },
    "1513371079303762012": {
      "1513371079303763004": { ...presetSeeds.find((p) => p.id === "1513371079303764005").permissions },
      "1513371079303763006": { ...presetSeeds.find((p) => p.id === "1513371079303764006").permissions },
    },
  },
  lastSavedAt: null,
};

const seedStore = {
  activeGuildId: seedState.id,
  guilds: [seedState],
};

let guildStore = loadGuildStore();
let activeGuildId = guildStore.activeGuildId;
let savedState = clone(activeGuildState());
let draft = clone(savedState);
let presets = [...presetSeeds, ...loadJson(PRESET_KEY, [])];
let editing = false;
let selectedChannels = new Set();
let selectedRoles = new Set();
let activeChannelId = null;
let activeRoleId = null;
let collapsedChannelIds = defaultCollapsedChannelIds(draft);
let rolesCollapsed = true;
let dragged = null;
let pointerDragged = null;
let toastTimer = null;
let threadFetchStatus = new Map();

const app = document.querySelector("#app");
render();
loadImportedGuilds();

function render() {
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="layout">
        <section class="stack">
          ${renderChannels()}
          ${renderRoles()}
        </section>
        <section class="stack">
          ${renderPermissions()}
          ${renderMoveControls()}
        </section>
        <section class="stack">
          ${renderPresets()}
          ${renderInspector()}
        </section>
      </main>
      <div class="toast" id="toast"></div>
    </div>
  `;
  bindEvents();
}

function renderTopbar() {
  const dirty = isDirty();
  const savedLabel = draft.lastSavedAt ? `保存済み ${formatTime(draft.lastSavedAt)}` : "初期状態";
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">D</div>
        <div>
          <h1>Discord構成マネージャー</h1>
          <p>${escapeHtml(draft.guildName)} · ローカル下書き</p>
        </div>
      </div>
      <div class="top-actions">
        <label class="server-switch">
          <span>サーバー</span>
          <select data-action="switch-guild" ${dirty ? "disabled" : ""}>
            ${guildStore.guilds.map((guild) => `<option value="${guild.id}" ${guild.id === activeGuildId ? "selected" : ""}>${escapeHtml(guild.guildName)}</option>`).join("")}
          </select>
        </label>
        <span class="status-pill"><span class="dot ${dirty ? "dirty" : ""}"></span>${dirty ? "未保存の変更あり" : savedLabel}</span>
        <button class="btn ${editing ? "ghost" : "primary"}" data-action="toggle-edit">${editing ? "編集中" : "編集"}</button>
        <button class="btn good" data-action="save" ${dirty ? "" : "disabled"}>保存</button>
        <button class="btn" data-action="discard" ${dirty ? "" : "disabled"}>破棄</button>
        <button class="btn" data-action="reset">初期化</button>
      </div>
    </header>
  `;
}

function renderChannels() {
  const selectedCount = selectedChannels.size;
  const syncable = syncableChannels();
  const syncCount = syncable.filter((channel) => channel.synced).length;
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">チャンネル</h2>
          <p class="panel-subtitle">${selectedCount}件選択中 · 同期 ${syncCount}/${syncable.length}</p>
        </div>
        <button class="btn" data-action="select-all-channels">すべて選択</button>
      </div>
      <div class="panel-body">
        <div class="tree" data-list="channels">
          ${renderVisibleChannelRows()}
        </div>
      </div>
    </section>
  `;
}

function renderVisibleChannelRows() {
  return draft.channels
    .filter(isChannelVisible)
    .map(renderChannelRow)
    .join("");
}

function renderChannelRow(channel) {
  const isCategory = channel.type === "category";
  const categorySelection = isCategory ? categorySelectionState(channel.id) : null;
  const childCount = childChannels(channel.id).length;
  const canCollapse = childCount > 0;
  const collapsed = canCollapse && collapsedChannelIds.has(channel.id);
  const checked = isCategory
    ? categorySelection.allSelected ? "checked" : ""
    : selectedChannels.has(channel.id) ? "checked" : "";
  const active = activeChannelId === channel.id ? "active" : "";
  const depth = channelDepth(channel);
  const indent = depth > 0 ? `style="margin-left: ${depth * 22}px"` : "";
  const syncLabel = syncStatusLabel(channel);
  const checkboxAction = isCategory ? "toggle-category-channels" : "toggle-channel";
  const checkboxDisabled = isCategory && categorySelection.total === 0 ? "disabled" : "";
  const checkboxIndeterminate = categorySelection?.partial ? "data-indeterminate=\"true\"" : "";
  const checkboxLabel = isCategory
    ? `${channel.name}内のチャンネルをまとめて選択`
    : `${channel.name}を選択`;
  return `
    <div class="row channel-row ${isCategory ? "category-row" : ""} ${active}"
      draggable="${editing}"
      data-kind="channel"
      data-id="${channel.id}"
      ${indent}>
      <input type="checkbox"
        data-action="${checkboxAction}"
        data-id="${channel.id}"
        aria-label="${escapeAttr(checkboxLabel)}"
        title="${escapeAttr(checkboxLabel)}"
        ${checked}
        ${checkboxDisabled}
        ${checkboxIndeterminate} />
      <span class="drag-handle" title="ドラッグして移動">::::</span>
      ${canCollapse
        ? `<button class="btn icon collapse-toggle" data-action="toggle-channel-collapse" data-id="${channel.id}" aria-label="${escapeAttr(channel.name)}を${collapsed ? "開く" : "閉じる"}" title="${escapeAttr(channel.name)}を${collapsed ? "開く" : "閉じる"}">${collapsed ? "+" : "-"}</button>`
        : `<span class="collapse-spacer" aria-hidden="true"></span>`}
      <button class="name-line bare" data-action="activate-channel" data-id="${channel.id}">
        <span class="type-badge">${channelIcon(channel.type)}</span>
        <span class="channel-name-stack">
          <strong>${escapeHtml(channel.name)}</strong>
          <small class="channel-id">ID: ${escapeHtml(channel.id)}</small>
        </span>
        ${categorySelection || syncLabel ? `
          <span class="channel-badges">
            ${categorySelection ? `<span class="category-select-count ${categorySelection.partial ? "partial" : ""}">${categorySelection.selectedCount}/${categorySelection.total}選択</span>` : ""}
            ${syncLabel ? `<span class="sync-badge ${channel.synced ? "on" : "off"}">${syncLabel}</span>` : ""}
          </span>
        ` : ""}
      </button>
      <span class="row-actions">
        ${renderThreadFetchButton(channel)}
        ${isCategoryChild(channel) ? `<button class="btn sync-toggle ${channel.synced ? "on" : "off"}" title="カテゴリ同期を切り替え" data-action="toggle-sync" data-id="${channel.id}" ${editing ? "" : "disabled"}>${channel.synced ? "同期ON" : "同期OFF"}</button>` : ""}
        <button class="btn icon" title="上へ移動" data-action="move-channel-up" data-id="${channel.id}" ${editing ? "" : "disabled"}>↑</button>
        <button class="btn icon" title="下へ移動" data-action="move-channel-down" data-id="${channel.id}" ${editing ? "" : "disabled"}>↓</button>
      </span>
    </div>
  `;
}

function renderThreadFetchButton(channel) {
  if (!isThreadContainer(channel)) return "";
  const status = threadFetchStatus.get(channel.id);
  const loading = status?.state === "loading";
  const hasThreads = childChannels(channel.id).some(isThreadChannel);
  const enabled = draft.source === "discord-api-read-only" && !isDirty() && !loading;
  const label = loading ? "取得中" : hasThreads ? "再取得" : "スレッド取得";
  const title = enabled
    ? "active threadsとarchived threadsの一括取得ジョブを追加"
    : draft.source !== "discord-api-read-only"
      ? "Discord読込データで有効"
      : "保存または破棄してから取得";
  return `<button class="btn thread-fetch ${status?.state || ""}" title="${escapeAttr(title)}" data-action="fetch-threads" data-id="${channel.id}" ${enabled ? "" : "disabled"}>${label}</button>`;
}

function renderRoles() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">ロール</h2>
          <p class="panel-subtitle">${selectedRoles.size}件選択中 · 上にあるほど強い権限</p>
        </div>
        <div class="toolbar compact">
          <button class="btn icon collapse-toggle" data-action="toggle-roles-collapse" aria-label="ロール一覧を${rolesCollapsed ? "開く" : "閉じる"}" title="ロール一覧を${rolesCollapsed ? "開く" : "閉じる"}">${rolesCollapsed ? "+" : "-"}</button>
          <button class="btn" data-action="select-all-roles">すべて選択</button>
        </div>
      </div>
      <div class="panel-body ${rolesCollapsed ? "hidden" : ""}">
        <div class="role-list" data-list="roles">
          ${draft.roles.map(renderRoleRow).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderRoleRow(role) {
  const checked = selectedRoles.has(role.id) ? "checked" : "";
  const active = activeRoleId === role.id ? "active" : "";
  return `
    <div class="row role-row ${active}" draggable="${editing}" data-kind="role" data-id="${role.id}">
      <input type="checkbox" data-action="toggle-role" data-id="${role.id}" ${checked} />
      <span class="swatch" style="background:${role.color}"></span>
      <button class="name-line bare" data-action="activate-role" data-id="${role.id}">
        <strong>${escapeHtml(role.name)}</strong>
      </button>
      <span class="row-actions">
        <button class="btn icon" title="上へ移動" data-action="move-role-up" data-id="${role.id}" ${editing ? "" : "disabled"}>↑</button>
        <button class="btn icon" title="下へ移動" data-action="move-role-down" data-id="${role.id}" ${editing ? "" : "disabled"}>↓</button>
      </span>
    </div>
  `;
}

function renderPermissions() {
  const scopeLabel = `${selectedChannels.size}チャンネル × ${selectedRoles.size}ロール`;
  const syncSummary = selectionSyncSummary();
  const hasTargets = hasPermissionTargets();
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">権限エディタ</h2>
          <p class="panel-subtitle">一括反映先: ${scopeLabel} · ${syncSummary.label}</p>
        </div>
        <button class="btn" data-action="clear-permissions" ${editing && hasTargets ? "" : "disabled"}>選択分をクリア</button>
      </div>
      <div class="panel-body">
        <div class="notice ${syncSummary.className}">${syncSummary.help}</div>
        <div class="selection-summary">
          <div class="metric"><span>チャンネル</span><strong>${selectedChannels.size}</strong></div>
          <div class="metric"><span>ロール</span><strong>${selectedRoles.size}</strong></div>
          <div class="metric"><span>組み合わせ</span><strong>${selectedChannels.size * selectedRoles.size}</strong></div>
        </div>
        <table class="permission-table">
          <thead>
            <tr><th>権限</th><th>設定</th></tr>
          </thead>
          <tbody>
            ${permissions.map(renderPermissionRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPermissionRow(permission) {
  const current = aggregatePermission(permission.id);
  return `
    <tr>
      <td>
        <div class="permission-name">
          <strong>${permission.label}</strong>
          <span>${permission.description} · ${permission.scope}</span>
        </div>
      </td>
      <td>
        <div class="segmented" data-permission="${permission.id}">
          ${["allow", "inherit", "deny"].map((value) => `
            <button class="${value} ${current === value ? "active" : ""}"
              data-action="set-permission"
              data-permission="${permission.id}"
              data-value="${value}"
              ${editing && hasPermissionTargets() ? "" : "disabled"}>
              ${labelForValue(value, current)}
            </button>
          `).join("")}
        </div>
      </td>
    </tr>
  `;
}

function renderMoveControls() {
  const categories = draft.channels.filter((channel) => channel.type === "category");
  const roles = draft.roles;
  const hasSelectedChannels = selectedChannels.size > 0;
  const hasSelectedRoles = selectedRoles.size > 0;
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">移動操作</h2>
          <p class="panel-subtitle">ドラッグ、上下ボタン、移動先メニュー</p>
        </div>
      </div>
      <div class="panel-body stack">
        <div class="notice">チェックしたチャンネルはまとめて移動できます。行をドラッグ、各行の↑/↓、または下の移動先メニューを使ってください。</div>
        <div class="two-col">
          <button class="btn primary" data-action="sync-selected" ${editing && hasSelectedChannels ? "" : "disabled"}>選択チャンネルを同期ON</button>
          <button class="btn" data-action="unsync-selected" ${editing && hasSelectedChannels ? "" : "disabled"}>選択チャンネルを同期OFF</button>
        </div>
        <div class="two-col">
          <div class="field">
            <label for="target-category">選択チャンネルの移動先</label>
            <select id="target-category" data-field="target-category" ${editing ? "" : "disabled"}>
              ${categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="target-channel-position">配置</label>
            <select id="target-channel-position" data-field="target-channel-position" ${editing ? "" : "disabled"}>
              <option value="bottom">カテゴリの末尾</option>
              <option value="top">カテゴリの先頭</option>
            </select>
          </div>
        </div>
        <button class="btn primary" data-action="move-selected-channels" ${editing && hasSelectedChannels ? "" : "disabled"}>選択チャンネルを移動</button>
        <div class="field">
          <label for="role-destination">選択ロールの移動先</label>
          <select id="role-destination" data-field="role-destination" ${editing ? "" : "disabled"}>
            <option value="top">最上部</option>
            ${roles.map((role) => `<option value="${role.id}">${escapeHtml(role.name)}</option>`).join("")}
            <option value="bottom">最下部</option>
          </select>
        </div>
        <button class="btn primary" data-action="move-selected-roles" ${editing && hasSelectedRoles ? "" : "disabled"}>選択ロールを移動</button>
      </div>
    </section>
  `;
}

function renderPresets() {
  const hasTargets = hasPermissionTargets();
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">権限プリセット</h2>
          <p class="panel-subtitle">チェック済みのチャンネル/ロールへ一括反映</p>
        </div>
      </div>
      <div class="panel-body stack">
        <div class="two-col">
          <input class="control" type="text" placeholder="プリセット名" data-field="preset-name" ${editing ? "" : "disabled"} />
          <button class="btn" data-action="save-preset" ${editing && hasTargets ? "" : "disabled"}>現在の設定を保存</button>
        </div>
        <div class="preset-list">
          ${presets.map(renderPresetCard).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderPresetCard(preset) {
  const entries = Object.entries(preset.permissions);
  const hasTargets = hasPermissionTargets();
  return `
    <article class="preset-card">
      <header>
        <div>
          <h3>${escapeHtml(preset.name)}</h3>
          <p>${escapeHtml(preset.description)}</p>
        </div>
        ${preset.source === "custom" ? `<button class="btn icon" title="プリセットを削除" data-action="delete-preset" data-id="${preset.id}" ${editing ? "" : "disabled"}>×</button>` : ""}
      </header>
      <div class="chips">
        ${entries.slice(0, 6).map(([permissionId, value]) => `<span class="chip ${value}">${shortPermission(permissionId)} ${valueLabel(value)}</span>`).join("")}
        ${entries.length > 6 ? `<span class="chip">+${entries.length - 6}</span>` : ""}
      </div>
      <button class="btn primary" data-action="apply-preset" data-id="${preset.id}" ${editing && hasTargets ? "" : "disabled"}>チェック済みに反映</button>
    </article>
  `;
}

function renderInspector() {
  const channel = draft.channels.find((item) => item.id === activeChannelId);
  const role = draft.roles.find((item) => item.id === activeRoleId);
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">詳細編集</h2>
          <p class="panel-subtitle">選択中のチャンネル/ロールを編集</p>
        </div>
      </div>
      <div class="panel-body inspector">
        <div class="field">
          <label for="channel-name">選択中のチャンネル</label>
          <input id="channel-name" type="text" value="${escapeAttr(channel?.name || "")}" data-field="channel-name" ${editing && channel ? "" : "disabled"} />
        </div>
        <div class="field">
          <label for="role-name">選択中のロール</label>
          <input id="role-name" type="text" value="${escapeAttr(role?.name || "")}" data-field="role-name" ${editing && role ? "" : "disabled"} />
        </div>
        <div class="field">
          <label for="role-color">ロールカラー</label>
          <input id="role-color" type="text" value="${escapeAttr(role?.color || "")}" data-field="role-color" ${editing && role ? "" : "disabled"} />
        </div>
      </div>
    </section>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-action]").forEach((element) => {
    const eventName = element.matches("input, select") ? "change" : "click";
    element.addEventListener(eventName, handleAction);
  });

  document.querySelectorAll("input[data-indeterminate='true']").forEach((input) => {
    input.indeterminate = true;
  });

  document.querySelectorAll("[data-field='channel-name'], [data-field='role-name'], [data-field='role-color']").forEach((input) => {
    input.addEventListener("input", handleInput);
  });

  document.querySelectorAll("[draggable='true']").forEach((row) => {
    row.addEventListener("dragstart", onDragStart);
    row.addEventListener("dragover", onDragOver);
    row.addEventListener("drop", onDrop);
    row.addEventListener("dragend", onDragEnd);
    row.querySelector(".drag-handle")?.addEventListener("pointerdown", onPointerDragStart);
  });
}

function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;
  if (!action) return;

  const editingRequired = [
    "set-permission",
    "clear-permissions",
    "move-channel-up",
    "move-channel-down",
    "move-role-up",
    "move-role-down",
    "move-selected-channels",
    "move-selected-roles",
    "toggle-sync",
    "sync-selected",
    "unsync-selected",
    "apply-preset",
    "save-preset",
    "delete-preset",
  ];
  if (editingRequired.includes(action) && !editing) return;

  if (action === "toggle-edit") editing = true;
  if (action === "switch-guild") switchGuild(event.currentTarget.value);
  if (action === "fetch-threads") {
    fetchThreadsForChannel(id);
    return;
  }
  if (action === "save") saveDraft();
  if (action === "discard") discardDraft();
  if (action === "reset") resetDraft();
  if (action === "select-all-channels") toggleAllChannels();
  if (action === "select-all-roles") toggleAllRoles();
  if (action === "toggle-category-channels") toggleCategoryChannels(id);
  if (action === "toggle-channel-collapse") toggleChannelCollapse(id);
  if (action === "toggle-roles-collapse") rolesCollapsed = !rolesCollapsed;
  if (action === "toggle-channel") toggleSet(selectedChannels, id);
  if (action === "toggle-role") toggleSet(selectedRoles, id);
  if (action === "activate-channel") activeChannelId = id;
  if (action === "activate-role") activeRoleId = id;
  if (action === "move-channel-up") moveChannel(id, -1);
  if (action === "move-channel-down") moveChannel(id, 1);
  if (action === "move-role-up") moveItem(draft.roles, id, -1);
  if (action === "move-role-down") moveItem(draft.roles, id, 1);
  if (action === "move-selected-channels") moveSelectedChannels();
  if (action === "move-selected-roles") moveSelectedRoles();
  if (action === "toggle-sync") toggleChannelSync(id);
  if (action === "sync-selected") setSelectedSync(true);
  if (action === "unsync-selected") setSelectedSync(false);
  if (action === "set-permission") setPermission(event.currentTarget.dataset.permission, event.currentTarget.dataset.value);
  if (action === "clear-permissions") clearSelectedPermissions();
  if (action === "apply-preset") applyPreset(id);
  if (action === "save-preset") saveCurrentPreset();
  if (action === "delete-preset") deletePreset(id);

  render();
}

async function fetchThreadsForChannel(channelId) {
  const channel = draft.channels.find((item) => item.id === channelId);
  if (!channel || !isThreadContainer(channel) || draft.source !== "discord-api-read-only") return;
  if (isDirty()) {
    showToast("保存または破棄してからスレッドを取得してください");
    return;
  }

  threadFetchStatus.set(channelId, { state: "loading" });
  render();

  try {
    const query = new URLSearchParams({ guildId: activeGuildId, channelId });
    query.set("archived", "true");
    const response = await fetch(`/api/discord/threads?${query}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = response.status === 404
        ? "read-onlyサーバーで起動してください"
        : payload.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    const threads = Array.isArray(payload.threads) ? payload.threads : [];
    applyFetchedThreads(channelId, threads, payload.fetchedAt || new Date().toISOString());
    savedState = clone(draft);
    upsertGuildState(savedState);
    guildStore.activeGuildId = activeGuildId;
    persistGuildStore();
    collapsedChannelIds.delete(channelId);
    threadFetchStatus.set(channelId, {
      state: "ok",
      count: threads.length,
      fetchedAt: payload.fetchedAt || null,
    });
    render();
    showToast(`${threads.length}件のスレッドを一括取得しました`);
  } catch (error) {
    threadFetchStatus.set(channelId, { state: "error", message: error.message });
    render();
    showToast(`スレッド取得に失敗しました: ${error.message}`);
  }
}

function applyFetchedThreads(parentId, threads, fetchedAt) {
  const threadItems = threads
    .map((thread, index) => ({
      id: String(thread.id),
      type: normalizeThreadType(thread.type),
      name: thread.name || `thread-${index + 1}`,
      parentId,
      position: Number.isFinite(Number(thread.position)) ? Number(thread.position) : index,
      archived: Boolean(thread.archived),
      locked: Boolean(thread.locked),
      fetchedAt,
    }))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));

  const removedThreadIds = draft.channels
    .filter((channel) => channel.parentId === parentId && isThreadChannel(channel))
    .map((channel) => channel.id);

  draft.channels = draft.channels.filter((channel) => !(channel.parentId === parentId && isThreadChannel(channel)));
  for (const threadId of removedThreadIds) {
    delete draft.overrides[threadId];
  }

  const parentIndex = draft.channels.findIndex((channel) => channel.id === parentId);
  const insertAt = parentIndex >= 0 ? parentIndex + 1 : draft.channels.length;
  draft.channels.splice(insertAt, 0, ...threadItems);
  normalizeState(draft);
  normalizeSelection();
}

function handleInput(event) {
  if (!editing) return;
  const field = event.currentTarget.dataset.field;
  const value = event.currentTarget.value;
  if (field === "channel-name") {
    const channel = draft.channels.find((item) => item.id === activeChannelId);
    if (channel) channel.name = value;
  }
  if (field === "role-name") {
    const role = draft.roles.find((item) => item.id === activeRoleId);
    if (role) role.name = value;
  }
  if (field === "role-color") {
    const role = draft.roles.find((item) => item.id === activeRoleId);
    if (role) role.color = value;
  }
}

function onDragStart(event) {
  if (!editing) return;
  dragged = {
    kind: event.currentTarget.dataset.kind,
    id: event.currentTarget.dataset.id,
  };
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
}

function onDragOver(event) {
  if (!editing || !dragged) return;
  event.preventDefault();
}

function onDrop(event) {
  if (!editing || !dragged) return;
  event.preventDefault();
  const target = event.currentTarget;
  const targetKind = target.dataset.kind;
  const targetId = target.dataset.id;

  if (dragged.kind !== targetKind || dragged.id === targetId) return;
  if (dragged.kind === "channel") moveBefore(draft.channels, dragged.id, targetId, "channel");
  if (dragged.kind === "role") moveBefore(draft.roles, dragged.id, targetId, "role");
  dragged = null;
  render();
}

function onDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  dragged = null;
}

function onPointerDragStart(event) {
  if (!editing) return;
  const row = event.currentTarget.closest("[data-kind]");
  if (!row) return;
  pointerDragged = {
    kind: row.dataset.kind,
    id: row.dataset.id,
    row,
  };
  row.classList.add("dragging");
  event.preventDefault();
  document.addEventListener("pointerup", onPointerDragEnd, { once: true });
}

function onPointerDragEnd(event) {
  if (!pointerDragged) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-kind]");
  pointerDragged.row.classList.remove("dragging");
  if (target && target.dataset.kind === pointerDragged.kind && target.dataset.id !== pointerDragged.id) {
    if (pointerDragged.kind === "channel") moveBefore(draft.channels, pointerDragged.id, target.dataset.id, "channel");
    if (pointerDragged.kind === "role") moveBefore(draft.roles, pointerDragged.id, target.dataset.id, "role");
    pointerDragged = null;
    render();
    return;
  }
  pointerDragged = null;
}

function setPermission(permissionId, value) {
  for (const channelId of effectiveTargetChannelIds()) {
    for (const roleId of selectedRoles) {
      setOverride(channelId, roleId, permissionId, value);
    }
  }
}

function setOverride(channelId, roleId, permissionId, value) {
  draft.overrides[channelId] ||= {};
  draft.overrides[channelId][roleId] ||= {};
  if (value === "inherit") {
    delete draft.overrides[channelId][roleId][permissionId];
  } else {
    draft.overrides[channelId][roleId][permissionId] = value;
  }
}

function getEffectivePermission(channelId, roleId, permissionId) {
  const channel = draft.channels.find((item) => item.id === channelId);
  const sourceId = permissionSourceId(channel) || channelId;
  return draft.overrides[sourceId]?.[roleId]?.[permissionId] || "inherit";
}

function effectiveTargetChannelIds() {
  return [...new Set([...selectedChannels].map((channelId) => {
    const channel = draft.channels.find((item) => item.id === channelId);
    return permissionSourceId(channel) || channelId;
  }))];
}

function hasPermissionTargets() {
  return selectedChannels.size > 0 && selectedRoles.size > 0;
}

function aggregatePermission(permissionId) {
  if (!hasPermissionTargets()) return "none";
  const values = new Set();
  for (const channelId of selectedChannels) {
    for (const roleId of selectedRoles) {
      values.add(getEffectivePermission(channelId, roleId, permissionId));
    }
  }
  return values.size === 1 ? [...values][0] : "mixed";
}

function syncStatusLabel(channel) {
  if (!isCategoryChild(channel)) return "";
  return channel.synced ? "カテゴリ同期" : "個別権限";
}

function selectionSyncSummary() {
  const selected = [...selectedChannels]
    .map((channelId) => draft.channels.find((channel) => channel.id === channelId))
    .filter(Boolean);
  if (selected.length === 0) {
    return {
      className: "sync-neutral",
      label: "チャンネル未選択",
      help: "権限を編集するには、左のチャンネルにチェックを入れてください。チェックは0件まで外せます。",
    };
  }
  const syncableSelected = selected.filter(isCategoryChild);
  const threadSelected = selected.filter(isThreadChannel);
  if (syncableSelected.length === 0) {
    if (threadSelected.length > 0) {
      return {
        className: "sync-neutral",
        label: "スレッド選択中",
        help: "スレッドは親テキスト/フォーラムチャンネル配下に表示します。権限変更は親チャンネルの有効権限へ反映されます。",
      };
    }
    return {
      className: "sync-neutral",
      label: "カテゴリ選択中",
      help: "カテゴリ行を選択している場合、そのカテゴリ自体の権限を編集します。子チャンネルは同期ONのときだけこの権限を継承します。",
    };
  }

  const synced = syncableSelected.filter((channel) => channel.synced).length;
  if (synced === syncableSelected.length) {
    return {
      className: "sync-on",
      label: "すべて同期ON",
      help: "選択中のチャンネルはカテゴリ権限と同期中です。権限変更は親カテゴリへ反映され、同じカテゴリ内の同期ONチャンネルにも効きます。",
    };
  }

  if (synced === 0) {
    return {
      className: "sync-off",
      label: "すべて同期OFF",
      help: "選択中のチャンネルは個別権限です。権限変更は選択チャンネルだけに反映されます。",
    };
  }

  return {
    className: "sync-mixed",
    label: "同期ON/OFF混在",
    help: "選択中に同期ONと同期OFFが混在しています。同期ONのチャンネルは親カテゴリへ、同期OFFのチャンネルは個別チャンネルへ反映されます。",
  };
}

function toggleChannelSync(channelId) {
  const channel = draft.channels.find((item) => item.id === channelId);
  if (!isCategoryChild(channel)) return;
  channel.synced = !channel.synced;
  if (channel.synced) {
    draft.overrides[channel.id] = {};
  }
  showToast(channel.synced ? "カテゴリ同期をONにしました" : "カテゴリ同期をOFFにしました");
}

function setSelectedSync(value) {
  let changed = 0;
  for (const channelId of selectedChannels) {
    const channel = draft.channels.find((item) => item.id === channelId);
    if (!isCategoryChild(channel)) continue;
    channel.synced = value;
    if (value) draft.overrides[channel.id] = {};
    changed += 1;
  }
  if (changed === 0) {
    showToast("同期できるチャンネルが選択されていません");
    return;
  }
  showToast(value ? "選択チャンネルを同期ONにしました" : "選択チャンネルを同期OFFにしました");
}

function clearSelectedPermissions() {
  for (const channelId of effectiveTargetChannelIds()) {
    for (const roleId of selectedRoles) {
      if (draft.overrides[channelId]?.[roleId]) {
        draft.overrides[channelId][roleId] = {};
      }
    }
  }
  showToast("選択中の権限をクリアしました");
}

function applyPreset(presetId) {
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) return;
  for (const [permissionId, value] of Object.entries(preset.permissions)) {
    setPermission(permissionId, value);
  }
  showToast(`${preset.name}を反映しました`);
}

function saveCurrentPreset() {
  const input = document.querySelector("[data-field='preset-name']");
  const name = input?.value.trim();
  if (!name) {
    showToast("プリセット名を入力してください");
    return;
  }
  const permissionsMap = {};
  for (const permission of permissions) {
    const value = aggregatePermission(permission.id);
    if (value !== "mixed") permissionsMap[permission.id] = value;
  }
  const preset = {
    id: String(Date.now()),
    name,
    description: "現在の権限選択から保存したプリセット。",
    source: "custom",
    permissions: permissionsMap,
  };
  presets = [preset, ...presets];
  persistCustomPresets();
  showToast("プリセットを保存しました");
}

function deletePreset(presetId) {
  presets = presets.filter((preset) => preset.id !== presetId);
  persistCustomPresets();
  showToast("プリセットを削除しました");
}

function moveSelectedChannels() {
  const categoryId = document.querySelector("[data-field='target-category']").value;
  const position = document.querySelector("[data-field='target-channel-position']").value;
  const movingRoots = draft.channels.filter((channel) => (
    selectedChannels.has(channel.id) &&
    channel.type !== "category" &&
    !isThreadChannel(channel)
  ));
  if (movingRoots.length === 0) {
    showToast("移動できるチャンネルが選択されていません");
    return;
  }

  const movingIds = new Set();
  for (const channel of movingRoots) {
    movingIds.add(channel.id);
    descendantChannels(channel.id).forEach((descendant) => movingIds.add(descendant.id));
  }

  const moving = draft.channels.filter((channel) => movingIds.has(channel.id));
  draft.channels = draft.channels.filter((channel) => !movingIds.has(channel.id));
  movingRoots.forEach((channel) => {
    channel.parentId = categoryId;
    channel.synced = true;
  });
  const categoryIndex = draft.channels.findIndex((channel) => channel.id === categoryId);
  const childIndexes = draft.channels
    .map((channel, index) => ({ channel, index }))
    .filter((item) => item.channel.parentId === categoryId)
    .map((item) => item.index);
  const insertAt = position === "top"
    ? categoryIndex + 1
    : childIndexes.length > 0
      ? Math.max(...childIndexes) + 1
      : categoryIndex + 1;
  draft.channels.splice(insertAt, 0, ...moving);
  showToast("チャンネルを移動しました");
}

function moveSelectedRoles() {
  const destination = document.querySelector("[data-field='role-destination']").value;
  const moving = draft.roles.filter((role) => selectedRoles.has(role.id));
  if (moving.length === 0) return;
  draft.roles = draft.roles.filter((role) => !selectedRoles.has(role.id));
  let insertAt = 0;
  if (destination === "bottom") insertAt = draft.roles.length;
  else if (destination !== "top") insertAt = draft.roles.findIndex((role) => role.id === destination);
  if (insertAt < 0) insertAt = draft.roles.length;
  draft.roles.splice(insertAt, 0, ...moving);
  showToast("ロールを移動しました");
}

function moveItem(items, id, direction) {
  const index = items.findIndex((item) => item.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= items.length) return;
  [items[index], items[next]] = [items[next], items[index]];
}

function moveChannel(id, direction) {
  const channel = draft.channels.find((item) => item.id === id);
  if (!channel) return;
  if (channel.type === "category") {
    moveCategoryBlock(id, direction);
    return;
  }

  const siblings = draft.channels.filter((item) => item.parentId === channel.parentId);
  const siblingIndex = siblings.findIndex((item) => item.id === id);
  const target = siblings[siblingIndex + direction];
  if (!target) return;
  moveChannelBlock(id, target.id, direction < 0 ? "before" : "after");
}

function moveChannelBlock(movingId, targetId, placement) {
  const moving = draft.channels.find((item) => item.id === movingId);
  const target = draft.channels.find((item) => item.id === targetId);
  if (!moving || !target) return;

  const movingIds = new Set([moving.id, ...descendantChannels(moving.id).map((channel) => channel.id)]);
  const targetIds = new Set([target.id, ...descendantChannels(target.id).map((channel) => channel.id)]);
  const block = draft.channels.filter((item) => movingIds.has(item.id));
  const remaining = draft.channels.filter((item) => !movingIds.has(item.id));
  const targetIndexes = remaining
    .map((item, index) => targetIds.has(item.id) ? index : -1)
    .filter((index) => index >= 0);
  if (targetIndexes.length === 0) return;

  moving.parentId = target.parentId;
  if (isCategoryChild(moving) && typeof moving.synced !== "boolean") moving.synced = true;
  if (!isCategoryChild(moving)) delete moving.synced;

  const insertAt = placement === "before"
    ? Math.min(...targetIndexes)
    : Math.max(...targetIndexes) + 1;
  remaining.splice(insertAt, 0, ...block);
  draft.channels = remaining;
}

function moveCategoryBlock(id, direction) {
  const blocks = getCategoryBlocks();
  const blockIndex = blocks.findIndex((block) => block.category.id === id);
  const target = blocks[blockIndex + direction];
  if (!target) return;

  const block = blocks[blockIndex];
  const remaining = draft.channels.filter((item) => !block.items.some((blockItem) => blockItem.id === item.id));
  const targetIndex = remaining.findIndex((item) => item.id === target.category.id);
  const insertAt = direction < 0 ? targetIndex : targetIndex + target.items.length;
  remaining.splice(insertAt, 0, ...block.items);
  draft.channels = remaining;
}

function getCategoryBlocks() {
  const blocks = [];
  for (let index = 0; index < draft.channels.length; index += 1) {
    const channel = draft.channels[index];
    if (channel.type !== "category") continue;
    const items = [channel];
    let cursor = index + 1;
    while (cursor < draft.channels.length && draft.channels[cursor].type !== "category") {
      items.push(draft.channels[cursor]);
      cursor += 1;
    }
    blocks.push({ category: channel, items });
  }
  return blocks;
}

function moveBefore(items, movingId, targetId, kind) {
  const movingIndex = items.findIndex((item) => item.id === movingId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (movingIndex < 0 || targetIndex < 0) return;
  const [moving] = items.splice(movingIndex, 1);
  const newTargetIndex = items.findIndex((item) => item.id === targetId);
  if (kind === "channel" && moving.type !== "category") {
    const target = items[newTargetIndex];
    if (target?.type === "category") {
      moving.parentId = target.id;
      items.splice(newTargetIndex + 1, 0, moving);
      return;
    }
    moving.parentId = target?.parentId;
  }
  items.splice(newTargetIndex, 0, moving);
}

function moveAfter(items, movingId, targetId) {
  const movingIndex = items.findIndex((item) => item.id === movingId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (movingIndex < 0 || targetIndex < 0) return;
  const [moving] = items.splice(movingIndex, 1);
  const newTargetIndex = items.findIndex((item) => item.id === targetId);
  moving.parentId = items[newTargetIndex]?.parentId;
  items.splice(newTargetIndex + 1, 0, moving);
}


function saveDraft() {
  draft.lastSavedAt = new Date().toISOString();
  savedState = clone(draft);
  upsertGuildState(savedState);
  guildStore.activeGuildId = activeGuildId;
  persistGuildStore();
  editing = false;
  showToast("保存しました");
}

function discardDraft() {
  draft = clone(savedState);
  editing = false;
  normalizeSelection();
  showToast("変更を破棄しました");
}

function resetDraft() {
  guildStore = clone(seedStore);
  activeGuildId = guildStore.activeGuildId;
  savedState = clone(activeGuildState());
  draft = clone(savedState);
  presets = [...presetSeeds];
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PRESET_KEY);
  editing = false;
  selectedChannels = new Set();
  selectedRoles = new Set();
  activeChannelId = null;
  activeRoleId = null;
  collapsedChannelIds = defaultCollapsedChannelIds(draft);
  rolesCollapsed = true;
  threadFetchStatus = new Map();
  showToast("初期状態に戻しました");
}

function toggleAllChannels() {
  const channels = draft.channels.filter((channel) => channel.type !== "category");
  selectedChannels = selectedChannels.size === channels.length ? new Set() : new Set(channels.map((channel) => channel.id));
}

function toggleCategoryChannels(categoryId) {
  const channels = categoryChannels(categoryId);
  if (channels.length === 0) return;
  const allSelected = channels.every((channel) => selectedChannels.has(channel.id));
  for (const channel of channels) {
    if (allSelected) selectedChannels.delete(channel.id);
    else selectedChannels.add(channel.id);
  }
}

function toggleChannelCollapse(channelId) {
  if (collapsedChannelIds.has(channelId)) {
    collapsedChannelIds.delete(channelId);
    return;
  }

  collapsedChannelIds.add(channelId);
  if (descendantChannels(channelId).some((channel) => channel.id === activeChannelId)) {
    activeChannelId = null;
  }
}

function toggleAllRoles() {
  selectedRoles = selectedRoles.size === draft.roles.length ? new Set() : new Set(draft.roles.map((role) => role.id));
}

function toggleSet(set, id) {
  if (set.has(id)) set.delete(id);
  else set.add(id);
}

function normalizeSelection() {
  const channelIds = new Set(draft.channels.map((channel) => channel.id));
  const roleIds = new Set(draft.roles.map((role) => role.id));
  selectedChannels = new Set([...selectedChannels].filter((id) => channelIds.has(id)));
  selectedRoles = new Set([...selectedRoles].filter((id) => roleIds.has(id)));
  collapsedChannelIds = new Set([...collapsedChannelIds].filter((id) => channelIds.has(id)));
  if (!activeChannelId || !channelIds.has(activeChannelId)) activeChannelId = null;
  if (!activeRoleId || !roleIds.has(activeRoleId)) activeRoleId = null;
}

function switchGuild(guildId) {
  if (guildId === activeGuildId) return;
  if (isDirty()) {
    showToast("未保存の変更があるため、保存または破棄してから切り替えてください");
    return;
  }

  const next = guildStore.guilds.find((guild) => guild.id === guildId);
  if (!next) return;

  activeGuildId = guildId;
  guildStore.activeGuildId = guildId;
  savedState = clone(next);
  draft = clone(savedState);
  editing = false;
  selectedChannels = new Set();
  selectedRoles = new Set();
  activeChannelId = null;
  activeRoleId = null;
  collapsedChannelIds = defaultCollapsedChannelIds(draft);
  rolesCollapsed = true;
  threadFetchStatus = new Map();
  persistGuildStore();
  showToast("サーバーを切り替えました");
}

async function loadImportedGuilds() {
  try {
    const response = await fetch(`${IMPORTED_GUILDS_URL}?t=${Date.now()}`);
    if (!response.ok) return;
    const payload = await response.json();
    const importedGuilds = Array.isArray(payload.guilds) ? payload.guilds : [];
    if (importedGuilds.length === 0 || isDirty()) return;

    const wasSeedOnly = guildStore.guilds.length === 1 && guildStore.guilds[0].id === seedState.id;
    for (const guild of importedGuilds) {
      upsertGuildState(guild);
    }

    if (wasSeedOnly && importedGuilds[0]?.id) {
      activeGuildId = importedGuilds[0].id;
      guildStore.activeGuildId = activeGuildId;
    }

    savedState = clone(activeGuildState());
    draft = clone(savedState);
    selectedChannels = new Set();
    selectedRoles = new Set();
    activeChannelId = null;
    activeRoleId = null;
    collapsedChannelIds = defaultCollapsedChannelIds(draft);
    rolesCollapsed = true;
    threadFetchStatus = new Map();
    persistGuildStore();
    render();
  } catch {
    // Generated guild data is optional in the local MVP.
  }
}

function normalizeState(state) {
  const categoryIds = new Set((state.channels || [])
    .filter((channel) => channel.type === "category")
    .map((channel) => channel.id));

  for (const channel of state.channels || []) {
    if (categoryIds.has(channel.parentId) && typeof channel.synced !== "boolean") {
      channel.synced = true;
    }
    if (channel.parentId && !categoryIds.has(channel.parentId)) {
      delete channel.synced;
    }
  }
  state.overrides ||= {};
}

function loadGuildStore() {
  const loaded = loadJson(STORAGE_KEY, seedStore);
  const store = loaded?.guilds?.length ? loaded : clone(seedStore);
  normalizeGuildStore(store);
  return store;
}

function normalizeGuildStore(store) {
  store.guilds ||= [];
  if (store.guilds.length === 0) store.guilds = [clone(seedState)];
  for (const guild of store.guilds) {
    normalizeState(guild);
  }
  if (!store.activeGuildId || !store.guilds.some((guild) => guild.id === store.activeGuildId)) {
    store.activeGuildId = store.guilds[0].id;
  }
}

function activeGuildState() {
  return guildStore.guilds.find((guild) => guild.id === activeGuildId) || guildStore.guilds[0] || seedState;
}

function upsertGuildState(guildState) {
  const next = clone(guildState);
  normalizeState(next);
  const index = guildStore.guilds.findIndex((guild) => guild.id === next.id);
  if (index >= 0) guildStore.guilds[index] = next;
  else guildStore.guilds.push(next);
}

function persistGuildStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guildStore));
}

function defaultCollapsedChannelIds(state) {
  const parentIds = new Set((state.channels || []).map((channel) => channel.parentId).filter(Boolean));
  return new Set((state.channels || [])
    .filter((channel) => parentIds.has(channel.id))
    .map((channel) => channel.id));
}

function categoryChannels(categoryId) {
  return draft.channels.filter((channel) => channel.type !== "category" && channelCategoryId(channel) === categoryId);
}

function categorySelectionState(categoryId) {
  const channels = categoryChannels(categoryId);
  const selectedCount = channels.filter((channel) => selectedChannels.has(channel.id)).length;
  return {
    total: channels.length,
    selectedCount,
    allSelected: channels.length > 0 && selectedCount === channels.length,
    partial: selectedCount > 0 && selectedCount < channels.length,
  };
}

function syncableChannels() {
  return draft.channels.filter(isCategoryChild);
}

function childChannels(parentId) {
  return draft.channels.filter((channel) => channel.parentId === parentId);
}

function descendantChannels(parentId) {
  const descendants = [];
  const walk = (id) => {
    for (const child of childChannels(id)) {
      descendants.push(child);
      walk(child.id);
    }
  };
  walk(parentId);
  return descendants;
}

function isChannelVisible(channel) {
  let parentId = channel.parentId;
  const visited = new Set();
  while (parentId) {
    if (collapsedChannelIds.has(parentId)) return false;
    if (visited.has(parentId)) return true;
    visited.add(parentId);
    parentId = draft.channels.find((item) => item.id === parentId)?.parentId;
  }
  return true;
}

function channelDepth(channel) {
  let depth = 0;
  let parentId = channel.parentId;
  const visited = new Set();
  while (parentId && depth < 6 && !visited.has(parentId)) {
    visited.add(parentId);
    depth += 1;
    parentId = draft.channels.find((item) => item.id === parentId)?.parentId;
  }
  return depth;
}

function channelCategoryId(channel) {
  let current = channel;
  const visited = new Set();
  while (current?.parentId && !visited.has(current.parentId)) {
    visited.add(current.parentId);
    const parent = draft.channels.find((item) => item.id === current.parentId);
    if (parent?.type === "category") return parent.id;
    current = parent;
  }
  return null;
}

function isCategoryChild(channel) {
  if (!channel?.parentId) return false;
  return draft.channels.find((item) => item.id === channel.parentId)?.type === "category";
}

function isThreadChannel(channel) {
  return [
    "thread",
    "public_thread",
    "private_thread",
    "announcement_thread",
  ].includes(channel?.type);
}

function isThreadContainer(channel) {
  return [
    "text",
    "guild_text",
    "announcement",
    "guild_announcement",
    "guild_news",
    "forum",
    "guild_forum",
    "media",
  ].includes(channel?.type);
}

function normalizeThreadType(type) {
  const threadTypes = new Set(["thread", "public_thread", "private_thread", "announcement_thread"]);
  return threadTypes.has(type) ? type : "thread";
}

function permissionSourceId(channel) {
  if (!channel) return null;
  if (isThreadChannel(channel) && channel.parentId) {
    return permissionSourceId(draft.channels.find((item) => item.id === channel.parentId)) || channel.parentId;
  }
  if (channel.synced && isCategoryChild(channel)) return channel.parentId;
  return channel.id;
}

function persistCustomPresets() {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets.filter((preset) => preset.source === "custom")));
}

function isDirty() {
  return JSON.stringify(draft) !== JSON.stringify(savedState);
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function channelIcon(type) {
  const labels = {
    category: "C",
    guild_category: "C",
    text: "T",
    guild_text: "T",
    forum: "F",
    guild_forum: "F",
    announcement: "A",
    guild_announcement: "A",
    guild_news: "A",
    stage: "S",
    stage_voice: "S",
    guild_stage_voice: "S",
    thread: "Th",
    public_thread: "Th",
    private_thread: "Th",
    announcement_thread: "Th",
    voice: "V",
    guild_voice: "V",
  };
  return labels[type] || "?";
}

function labelForValue(value, current) {
  if (current === "mixed" && value === "inherit") return "複数";
  if (value === "allow") return "許可";
  if (value === "deny") return "拒否";
  return "継承";
}

function valueLabel(value) {
  if (value === "allow") return "許可";
  if (value === "deny") return "拒否";
  return "継承";
}

function shortPermission(permissionId) {
  return permissionId
    .replace("VIEW_CHANNEL", "閲覧")
    .replace("SEND_MESSAGES", "送信")
    .replace("READ_MESSAGE_HISTORY", "履歴")
    .replace("MANAGE_MESSAGES", "投稿管理")
    .replace("MANAGE_CHANNELS", "Ch管理")
    .replace("MANAGE_ROLES", "権限管理")
    .replace("USE_APPLICATION_COMMANDS", "コマンド")
    .replace("MENTION_EVERYONE", "全体通知")
    .replace("ATTACH_FILES", "添付")
    .replace("EMBED_LINKS", "埋め込み")
    .replace("ADD_REACTIONS", "リアクション")
    .replace("CONNECT", "接続")
    .replace("SPEAK", "発話")
    .replace("STREAM", "配信")
    .replace("MANAGE_THREADS", "スレ管理");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

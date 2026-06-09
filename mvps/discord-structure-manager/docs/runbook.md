# Runbook

## Local Setup

追加依存なし。

## Run

```sh
node scripts/serve-readonly.mjs
```

Open `http://localhost:5173`.

静的UIだけを確認する場合は `apps/web` で `python3 -m http.server 5173` でも起動できる。ただし画面上のスレッド取得ボタンは `/api/discord/threads` を使うため、`node scripts/serve-readonly.mjs` で起動したときだけ動作する。

## Discord Read-Only Import

`.env` にBot tokenを設定してから、次を実行する。

```sh
node scripts/fetch-discord-structure.mjs
```

このスクリプトはDiscord APIへGETリクエストだけを行い、`apps/web/data/discord-guilds.json` を生成する。このJSONは実サーバー名やIDを含むため `.gitignore` で除外する。Webアプリは起動時にこのJSONが存在する場合だけ読み込み、サーバー切り替え候補に追加する。

デフォルトでは通常チャンネル、ロール、権限上書きだけを取得し、スレッドは取得しない。rate limitを避けるため、スレッドは画面上の `スレッド取得` ボタンで必要なチャンネルだけ取得する。

どうしても一括インポート時にactive threadsも読む場合は、明示的に次を設定する。

```sh
DISCORD_FETCH_ACTIVE_THREADS=true node scripts/fetch-discord-structure.mjs
```

public archived threadsも読む場合は、明示的に次を設定する。

```sh
DISCORD_FETCH_ARCHIVED_THREADS=true node scripts/fetch-discord-structure.mjs
```

## Rate Limit Policy

- Discord APIへのGETは、`scripts/lib/discord-rest-client.mjs` の内部Queueで逐次処理する。
- デフォルトの一括取得は、`GET /users/@me`、`GET /users/@me/guilds`、各guildの `channels` と `roles` だけを読む。
- デフォルト一括取得の概算リクエスト数は `1 + ceil(guildCount / 200) + guildCount * 2`。
- `DISCORD_API_DELAY_MS=1500` と `DISCORD_API_JITTER_MS=250` を標準にし、秒間1リクエスト未満へ落とす。
- `X-RateLimit-Bucket`、`X-RateLimit-Remaining`、`X-RateLimit-Reset-After`、`Retry-After` を見て、bucket枯渇時と429時は待つ。
- `retry_after` が無い429は、追加リクエストを重ねず停止する。
- 401/403/429などが `DISCORD_INVALID_REQUEST_ABORT_AFTER` 回続いたら停止する。
- rate limit挙動を調査する時だけ `DISCORD_IMPORT_MAX_GUILDS=1` などで対象guild数を絞る。
- `DISCORD_FETCH_ARCHIVED_THREADS=true` は過去スレッド数に比例して重くなるため、通常の全サーバー取得では使わない。

## Thread Fetch Design

- 初期表示、サーバー切り替え、カテゴリ開閉ではDiscord APIを呼ばない。
- `スレッド取得` ボタンを押したときだけ、ローカルの `/api/discord/threads?guildId=...&channelId=...` がDiscord APIへGETする。
- active threadsはDiscord API上ではguild単位の取得になるため、ローカルサーバーで `DISCORD_ACTIVE_THREADS_CACHE_MS` の間キャッシュし、画面側ではチャンネルIDで絞り込む。
- 複数チャンネルで同時に取得しても、Discord APIへのGETはQueueで逐次処理される。
- 未保存の編集がある状態では、スレッド取得ボタンを無効化する。保存または破棄してから取得する。
- 取得したスレッドはローカル下書きの保存済み状態として反映する。Discordへ書き込みは行わない。

## Test

Manual browser check:

1. Edit modeを開始する
2. チャンネルをドラッグアンドドロップで移動する
3. 上下ボタンでチャンネル/ロールを移動する
4. 移動先セレクトでチェック済みチャンネルを移動する
5. チャンネルのカテゴリ同期ON/OFFを切り替える
6. 複数チャンネルを選択し、一括で同期ON/OFFを切り替える
7. カテゴリ、スレッド内包チャンネル、ロール一覧が初期状態で閉じていることを確認する
8. 生成済みDiscordデータがある場合、トップバーからサーバーを切り替える
9. Discord読込データがある場合、テキスト/フォーラム/アナウンス系チャンネルの `スレッド取得` ボタンが表示されることを確認する
10. 複数チャンネル/複数ロールを選択し、プリセットを適用する
11. カスタムプリセットを保存し、再適用する
12. SaveとDiscardを確認する

## Deploy

現時点ではローカル検証のみ。

## Troubleshooting

- 変更が残っている場合は画面上の `初期化` を押す。手動で消す場合は `localStorage.removeItem("discord-structure-manager-state-discord-ids-ja")` を実行する。
- Discord APIがglobal rate limitで429を返す場合は、解除されるまで待ってから再実行する。

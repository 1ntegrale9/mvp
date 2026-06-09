# Discord Read-Only Import Notes

## Context

Discord Bot tokenを使い、read-only APIだけで参加中サーバーの構成を取得して、現在のMVPデータ構造と照合する。

## Read-Only Scope

使用するAPI操作はGETのみ。

- `GET /users/@me`
- `GET /users/@me/guilds`
- `GET /guilds/{guild.id}/channels`
- `GET /guilds/{guild.id}/roles`
- 任意: `GET /guilds/{guild.id}/threads/active`
- 任意: `GET /channels/{channel.id}/threads/archived/public`

## Current Result

2026-06-10時点の実行では、Discord APIからglobal rate limitの一時ブロックが返り、実サーバー構成の取得は完走できなかった。安全のため、`DISCORD_API_DELAY_MS=2500` の低速設定でも最初のGETで429が返った時点で停止し、追加リクエストは行わない方針にした。

スクリプトは `retry_after` がある429だけ待機して再試行し、`retry_after` が無いglobal blockでは待機ループに入らず、短いJSONエラーを出して終了する。

その後のrate limitレビューで、一括取得と画面取得APIのDiscord GETは共通のQueue逐次RESTクライアントへ集約した。詳細は `2026-06-10-discord-rate-limit-review.md` を参照する。

## Thread Fetch Strategy

rate limitを避けるため、一括取得はチャンネル構成、ロール一覧、スレッド取得の3種類のFIFO Queueレーンを持つ。初期計画時点で各guildの `channels`、`roles`、`threads/active` ジョブをレーンへ積み、`channel_structure -> role_list -> thread_fetch` の順に1ジョブずつ処理する。スレッド取得ジョブをチャンネル構成レーン完了後に追加する仕様は使わない。

画面ボタンはローカルの `scripts/serve-readonly.mjs` が提供する `GET /api/discord/threads?guildId=...&channelId=...&archived=true` を呼ぶ。このローカルAPIもDiscordへはGETだけを行い、active threadsとpublic archived threadsの一括取得ジョブをスレッド取得用FIFO Queueへ追加する。

Discordのactive threads取得は `GET /guilds/{guild.id}/threads/active` でguild単位になる。チャンネル単位ボタンであってもDiscord API上はguild単位の1リクエストになるため、ローカルサーバー側で `DISCORD_ACTIVE_THREADS_CACHE_MS` の間キャッシュし、後続チャンネルの取得はキャッシュをチャンネルIDで絞り込む。

未保存の編集がある状態では、取得結果の差し込みで下書きを壊さないようにスレッド取得ボタンを無効化する。取得成功時は、読み込みベースデータの更新として `draft` と `savedState` の両方へ反映する。

## Data Structure Review

- チャンネルID、ロールID、権限上書きキーは18〜20桁のDiscord snowflake文字列として扱う。
- 1つのアプリ状態は1 guildを表す。複数guildは `guilds[]` と `activeGuildId` で管理する。
- チャンネル階層は `parentId` で表す。`parentId` はカテゴリだけでなく、スレッドの親テキスト/フォーラムチャンネルも指せる。
- カテゴリ同期の対象は「親がカテゴリのチャンネル」だけに限定する。スレッドにはカテゴリ同期ボタンを出さない。
- スレッドの権限編集は、親チャンネルの有効権限へ反映する。
- 実サーバー96件のread-only importでは生成JSONが約11MBになり、ブラウザのlocalStorage上限を超える。生成JSONは `.gitignore` 対象のファイルから読み込み、localStorageへ丸ごと保存できなくても画面反映を止めない。

## Known Gaps

- 現在のMVPはロール向けのpermission overwriteだけを扱い、メンバー個別overwriteは保持しない。
- Discordの全権限ビットではなく、MVPで表示している主要権限だけを `allow` / `inherit` / `deny` に変換する。
- active threadsは一括取得のスレッド取得レーンに最初から積まれ、チャンネル構成とロール一覧のレーン完了後に自動取得する。
- public archived threadsは取得可能だが、件数が多いと重くなるためデフォルトでは取得しない。
- private archived threadsは権限要件が強く、全サーバーで安定して取得できるとは限らない。

## Sources

- https://docs.discord.com/developers/resources/user#get-current-user-guilds
- https://docs.discord.com/developers/resources/guild
- https://docs.discord.com/developers/resources/channel
- https://docs.discord.com/developers/topics/threads
- https://docs.discord.com/developers/topics/rate-limits

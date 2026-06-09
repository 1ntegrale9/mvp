# Discord Rate Limit Review

## Context

Discord Bot tokenで全サーバー構成をread-only取得する場合、一括取得がrate limitや一時ブロックを誘発しないかをレビューした。

## Review Result

以前の実装は `DISCORD_API_DELAY_MS=1500` の固定delayで逐次実行していたため、デフォルト設定ならグローバル上限に対してはかなり保守的だった。ただし、次の点で「万全」とは言い切れなかった。

- Discord公式はrate limit値をハードコードせず、レスポンスヘッダーに従うことを推奨している。
- `X-RateLimit-Remaining` と `X-RateLimit-Reset-After` を見ていなかった。
- `Retry-After` ヘッダーを見ておらず、JSON bodyの `retry_after` だけに依存していた。
- guild単位の取得中に429が出た場合、access issueとして記録して次のguildへ進む余地があり、429を重ねる危険があった。
- read-only server側にはQueueがあったが、一括取得スクリプト側では共通のQueue実装として保証されていなかった。
- 401/403/429などのinvalid requestが続く場合の早期停止条件がなかった。

## Request Estimate

デフォルト設定ではスレッドを一括取得しないため、概算リクエスト数は次の形になる。

```text
1                     # GET /users/@me
+ ceil(guildCount/200) # GET /users/@me/guilds pages
+ guildCount * 2       # GET /guilds/{id}/channels and /guilds/{id}/roles
```

100 guildなら約202リクエスト、500 guildなら約1004リクエスト。`DISCORD_API_DELAY_MS=1500` と `DISCORD_API_JITTER_MS=250` のQueue逐次処理では、秒間1リクエスト未満になる。Discord公式のglobal rate limitより十分低いが、per-routeや一時的なCloudflareブロックは外部状態に依存するため、ヘッダー追従と停止条件が必要。

## Fixes

- `scripts/lib/discord-rest-client.mjs` を追加し、一括取得と画面取得APIのDiscord GETを共通化した。
- すべてのDiscord API呼び出しを内部Queueで逐次処理する。
- `X-RateLimit-Bucket`、`X-RateLimit-Remaining`、`X-RateLimit-Reset-After` を読み、同じbucketが枯れた場合は次の同系統routeをreset後まで待つ。
- 429では `Retry-After` ヘッダー、`X-RateLimit-Reset-After`、JSON bodyの `retry_after` の順で待機時間を決める。
- `retry_after` が無い429は待機ループに入らず即停止する。
- 429、401、403などのinvalid responseが `DISCORD_INVALID_REQUEST_ABORT_AFTER` に達したら停止する。
- guild取得中に429やinvalid budget超過が出た場合、次のguildへ進まず一括取得全体を停止する。
- 画面上のスレッド取得ボタンも同じQueueを通す。ボタン連打や複数リクエストが重なってもDiscord APIへは逐次送る。
- active threadsはguild単位で取得されるため、read-only server側で `DISCORD_ACTIVE_THREADS_CACHE_MS` の間キャッシュし、チャンネルごとに絞り込む。
- 環境変数由来の数値設定が壊れても危険側へ倒れないように、RESTクライアント内部でデフォルト値へ正規化する。
- `scripts/discord-rest-client.test.mjs` でQueue逐次性、bucket待機、429 retry、retry-after無し429停止、数値設定の正規化を合成テストした。

## Current Policy

- デフォルトの一括取得は通常チャンネル、ロール、権限上書きだけにする。
- active threadsとarchived threadsは一括取得しない。
- スレッドは画面上の `スレッド取得` ボタンで必要なチャンネルだけ取得する。
- archived threadsは件数が多いため、明示フラグなしでは取得しない。
- `DISCORD_IMPORT_MAX_GUILDS` は通常空にして全サーバー対象にする。rate limit挙動や権限不足を調査するときだけ一時的に絞る。

## Remaining Risk

- Discord側で既にglobal blockやCloudflare一時制限が発生している場合、最初のGETでも429になる。この場合はコードで解除できないため、追加リクエストせず停止する。
- tokenが無効な場合は401が返る。これは再試行しても改善しないため、invalid budgetに入れる。
- guildごとの権限不足による403は、そのguildのaccess issueとして扱う。ただし大量に続く場合はinvalid request回避のため停止する。
- archived threadsの全取得は、チャンネル数と過去スレッド数に比例して大きくなる。通常運用では使わない。

## Sources

- https://docs.discord.com/developers/topics/rate-limits
- https://docs.discord.com/developers/resources/user#get-current-user-guilds
- https://docs.discord.com/developers/resources/guild#get-guild-channels
- https://docs.discord.com/developers/resources/guild#get-guild-roles
- https://docs.discord.com/developers/topics/threads

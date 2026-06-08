# Discord Login Verification

Discordログインで繰り返し確認するための共通知見です。

最終確認日: 2026-06-08

## 公式情報

- Discord Developer Portal: https://discord.com/developers/applications
- Discord OAuth2 documentation: https://discord.com/developers/docs/topics/oauth2

## 目的

MVPでDiscordログインを実装する前に、OAuth2設定、リダイレクトURI、スコープ、環境変数、ローカル検証手順を素早く確認できるようにします。

## よく詰まる点

- Developer Portal側のRedirect URIとアプリ側のCallback URLが完全一致していない
- ローカルURL、プレビューURL、本番URLのCallback URLを登録し忘れている
- `DISCORD_CLIENT_ID` と `DISCORD_CLIENT_SECRET` の取り違え
- OAuth stateやセッションCookieの設定漏れ
- HTTPS前提の環境でローカルHTTPを使っている
- 本番デプロイ後に環境変数だけ更新して、Redirect URIを更新していない

## MVPへ取り込む前のチェック

- [ ] Discord Developer PortalでApplicationを作成した
- [ ] OAuth2 Redirect URIをローカル、プレビュー、本番ごとに登録した
- [ ] 必要なスコープを確認した
- [ ] `.env.example` に必要な環境変数名を書いた
- [ ] 実値は `.env` などコミットされない場所に置いた
- [ ] ローカルでログイン開始、Callback、ログアウトまで確認した
- [ ] 失敗時のエラーメッセージと再現手順を記録した

## 必要になりやすい環境変数

```sh
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=
SESSION_SECRET=
```

## 最小実装

最小実装は `minimal-impls/` に追加します。まずは依存なしで流れを確認できる `node-http/` を標準の検証入口にします。フレームワーク固有の実装は必要になった時点で追加します。

```text
minimal-impls/
├── node-http/
├── nextjs/
├── hono/
└── express/
```

### 推奨する最初の確認

1. Discord Developer PortalでApplicationを作成します。
2. OAuth2 Redirectsに `http://localhost:8787/callback` を登録します。
3. `minimal-impls/node-http/.env.example` を `.env` にコピーし、Client IDとClient Secretを設定します。
4. `minimal-impls/node-http/` で `npm run preflight` を実行します。
5. `minimal-impls/node-http/` で `npm start` を実行します。
6. `http://localhost:8787` からログイン開始、Callback、ユーザー情報取得まで確認します。
7. `http://localhost:8787/result` または `verification-result.local.json` で完走結果を確認します。

この最小実装はログインフローの検証用です。永続セッション、DB保存、認可、リフレッシュトークン保存は含みません。

### 完走確認済み

- 確認日: 2026-06-08
- 実装: `minimal-impls/node-http/`
- Redirect URI: `http://localhost:8787/callback`
- Scope: `identify`
- 結果: Authorization Code Grant、`state` Cookie検証、token交換、`/users/@me` 取得、確認結果のローカル保存まで成功
- 注意: 成功時の `verification-result.local.json` はトークンを含みませんが、ユーザー識別子を含むためコミットしません。

## MVP側に残すメモ

DiscordログインをMVPへ取り込んだら、そのMVPの `docs/knowledge/` に次を残します。

- 使ったフレームワーク
- Callback URL
- 採用した認証ライブラリ
- ローカル検証で詰まった点
- 本実装へ移すときの注意点

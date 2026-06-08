# Discord Login Minimal Implementation: Node HTTP

Node.js標準ライブラリだけでDiscord OAuth2 Authorization Code Grantを確認する最小実装です。

## できること

- `/login` からDiscordの認可画面へリダイレクト
- `state` をHttpOnly Cookieに保存してCallbackで検証
- `code` をDiscordのtoken endpointでaccess tokenへ交換
- `identify` スコープで `/users/@me` を取得
- token値を画面に出さず、取得できたユーザー情報だけを表示

## 前提

- Node.js 18以上
- Discord Developer PortalでApplication作成済み
- OAuth2 Redirectsに `http://localhost:8787/callback` を登録済み

## セットアップ

```sh
cp .env.example .env
```

`.env` にDiscordのClient IDとClient Secretを設定します。

```sh
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

## 自動チェック

```sh
npm run check
npm run smoke
```

実値を入れた後は、次のコマンドで設定を確認します。

```sh
npm run preflight
```

## 実行

```sh
npm start
```

ブラウザで `http://localhost:8787` を開き、`Login with Discord` を押します。

認証が成功すると、トークン値を含まない確認結果が `verification-result.local.json` に保存されます。このファイルはコミットしません。

## 確認ポイント

- Developer Portalに登録したRedirect URIと `.env` の `DISCORD_REDIRECT_URI` が完全一致している
- `/callback` に `code` と `state` が返ってくる
- `state` mismatchが出る場合、Cookie、ドメイン、ポート、Callback URLを確認する
- token交換で失敗する場合、Client ID、Client Secret、Redirect URI、Content-Typeを確認する
- 完走後に `http://localhost:8787/result` が `ok: true` を返す

## 完走実績

- 確認日: 2026-06-08
- Redirect URI: `http://localhost:8787/callback`
- Scope: `identify`
- 確認済み: login redirect、state検証、token交換、`/users/@me` 取得、`verification-result.local.json` 保存

## 本実装へ移す前の注意

- この実装は検証用で、永続セッションやDB保存をしません。
- 本番ではセッション管理、CSRF対策、CookieのSecure属性、トークン保存方針、ログアウト時のtoken revokeを設計します。
- メールが必要な場合は `DISCORD_SCOPES=identify email` に変更し、ユーザー同意とデータ取り扱いを明記します。

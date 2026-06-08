# Findings

Discordログイン検証で得られた追加知見を時系列で残します。

## 2026-06-08

- 初期メモを作成。
- 実装前にDiscord公式OAuth2ドキュメントとDeveloper Portalを再確認する運用にする。
- 依存なしのNode HTTP最小実装を追加。Authorization Code Grant、`state` Cookie検証、token交換、`/users/@me` 取得までを確認できる構成にした。
- token交換はDiscord公式ドキュメントに合わせて `application/x-www-form-urlencoded` で送る。認証情報はHTTP Basic認証で渡す。
- `identify` スコープだけなら `/users/@me` で基本ユーザー情報を確認できる。メール確認が必要なMVPでは `email` スコープを追加する。
- `npm run smoke` でローカルサーバー、トップページ、`/login` のstate Cookie、Discord authorize URL生成を自動検証できるようにした。
- 実認証完走時は `verification-result.local.json` にトークンを含まない成功結果を保存する。
- 実アカウントで認証完走を確認。`identify` スコープでaccess tokenとrefresh tokenを受領し、`/users/@me` 取得と `verification-result.local.json` 保存まで成功した。
- Redirect URI不一致時はDiscord側で `OAuth2 redirect_uriが無効です` と表示された。Developer PortalのOAuth2 Redirectsと `.env` の `DISCORD_REDIRECT_URI` は完全一致が必要。
- 検証サーバーの標準出力にはDiscord user IDを出さない。成功ログは匿名の成功メッセージに留める。

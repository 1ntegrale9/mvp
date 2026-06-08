# Minimal Implementations

Discordログインの最小実装をフレームワーク別に置きます。

## 実装

- `node-http/`: Node.js標準ライブラリだけでAuthorization Code Grantを確認する最小実装

## 追加ルール

- ディレクトリ名は `nextjs`, `hono`, `express` のように技術名で分けます。
- 各ディレクトリに `README.md` を置き、起動方法、環境変数、確認済みのCallback URL形式を書きます。
- 実値のClient Secretやトークンは絶対に入れません。
- MVPへ取り込む場合は、必要な部分だけをMVP側へコピーします。

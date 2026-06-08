# mvp

`1ntegrale9/mvp` は、複数のMVPを作成し、別リポジトリへ発展させる前段階のインキュベーション用ワークスペースです。
別リポジトリ化した後の開発状況やURLは、このリポジトリでは追跡しません。

## 構成

- `mvps/`: 作成・初期検証中のMVP
- `verifications/`: MVP共通で使う技術検証、実装メモ、最小実装
- `tools/`: リポジトリ横断の補助スクリプト
- `docs/`: 横断的な方針・記録
- `templates/`: 新規MVP作成用テンプレート
- `archive/`: 停止・終了したMVP、または移行時点のスナップショット

詳しい運用方針は `AGENTS.md` を参照してください。

## 新しいMVPを作る

```sh
cp -R templates/mvp mvps/<mvp-slug>
```

作成後、`mvps/<mvp-slug>/README.md`、`docs/brief.md`、`mvp.config.json` を記入します。

## 技術検証を確認する

Discordログインのように複数MVPで繰り返し使う検証は `verifications/` に残します。MVP固有の試作や知見は、各MVPの `experiments/` と `docs/knowledge/` に残します。

## 別リポジトリへ発展させる

`mvps/<mvp-slug>/` の中身を新しいリポジトリのルートとして移します。移行後、このリポジトリ側では継続追跡しません。

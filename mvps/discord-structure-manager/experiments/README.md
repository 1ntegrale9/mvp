# Experiments

このMVP固有の技術検証、スパイク、最小実装を置きます。

## 標準構成

```text
experiments/
└── <topic>/
    ├── README.md
    ├── src/
    └── notes.md
```

## `README.md` に書くこと

- 目的
- 前提条件
- 実行方法
- 検証結果
- 採用するかどうか
- 本実装へ移すときの注意点

## 共通化

Discordログインなど、他MVPでも繰り返し使える内容はトップレベルの `verifications/` にも還元します。

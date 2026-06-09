# Discord Permissions Notes

## Context

Discord権限管理MVPの初期実装で、プリセットと権限一覧の粒度を決めるために公式ドキュメントを確認した。

## Findings

- Discordの権限はビット演算で扱われ、API v8以降では権限値が文字列としてシリアライズされる。
- チャンネル単位の権限上書きは、ロールやメンバーに対してallow/denyを持つ。
- 権限計算には`@everyone`、ロール、チャンネル上書き、メンバー上書きの順序がある。
- `VIEW_CHANNEL` や `SEND_MESSAGES` には暗黙的な影響があり、UI上でも注意表示が必要。

## Decision

初期MVPではDiscord APIのビット値計算ではなく、`allow` / `inherit` / `deny` の三値UIとして扱う。API連携時にビットフィールドへ変換する。

## Source

- https://discord.com/developers/docs/topics/permissions

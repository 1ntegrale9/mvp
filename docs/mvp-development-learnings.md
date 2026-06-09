# MVP Development Learnings

最終更新: 2026-06-10

このメモは、これまでのMVP開発とDiscord検証で得た横断的な知見を、次のMVPでも参照しやすいようにまとめたものです。MVP固有の詳細は各MVPの `docs/knowledge/` に、複数MVPで繰り返し使う最小実装は `verifications/` に残します。

## Repository Operation

- MVP本体は `mvps/<mvp-slug>/` の中だけで完結させると、後で別リポジトリへ移しやすい。
- ルート直下の `docs/` は、複数MVPに効く方針、判断基準、開発知見を置く場所として使う。
- `verifications/` は、Discordログインのように複数MVPで何度も同じ失敗が起きる技術検証の置き場にする。
- MVP内で得た実装判断や失敗は、作業完了前に `mvps/<mvp-slug>/docs/knowledge/` へ残す。
- `.env`、実サーバーから生成したJSON、検証結果のローカルファイル、個人情報を含む成果物はコミットしない。
- ルートに共通ワークスペース設定や共有パッケージを急いで置かない。必要性が育ったら別リポジトリ化またはパッケージ化を検討する。

## MVP UI Development

- 最初の画面は説明ページではなく、実際に操作できる体験にする。今回のDiscord構成管理MVPでは、チャンネル、ロール、権限プリセットを最初から触れる画面にした。
- 「編集 -> 保存/破棄」の境界を明確にすると、ローカルMVPでもユーザーが安心して構成を試せる。
- 一括反映UIでは、初期状態で何も選択しないほうが安全。初期チェック済みは、サンプルなのかユーザー選択なのかを曖昧にする。
- チェックは0件まで外せる必要がある。対象がない操作はボタン側で無効化する。
- ドラッグアンドドロップ、上下移動、移動先セレクトの3経路を併用すると、精密操作とまとめ操作の両方を検証できる。
- 開閉UIは、選択UIと分ける。カテゴリ行のチェックボックスは「配下をまとめて選択」、開閉ボタンは別に置くと意味が混ざりにくい。
- デフォルトではカテゴリ、スレッドを持つチャンネル、ロール一覧を閉じておくと、実サーバーのように項目数が多い場合でも見通しがよい。
- 表示名は重複しうるため、Discord由来のチャンネル/ロールは18〜20桁のIDを併記する。

## Discord Data Modeling

- Discordの実データを扱うMVPでは、内部キーにslugを使わず、Discord snowflake IDを文字列として扱う。
- 複数サーバー対応は、1つのguild状態を `guilds[]` に入れ、現在表示中のIDを `activeGuildId` で持つと単純に管理できる。
- チャンネル階層は `parentId` で表す。`parentId` はカテゴリだけでなく、スレッドの親テキスト/フォーラムチャンネルも指せる。
- カテゴリ同期は「親がカテゴリの通常チャンネル」にだけ適用する。スレッドにはカテゴリ同期ボタンを出さない。
- スレッドの権限編集は、親チャンネルの有効権限へ寄せる。スレッド独自の権限モデルを初期MVPで広げすぎない。
- 権限UIは、初期MVPでは `allow` / `inherit` / `deny` の三値で十分に検証できる。Discord APIへ保存する段階でビットフィールド変換を追加する。
- 最初はロール向けpermission overwriteに絞る。メンバー個別overwriteは後続の拡張対象にする。

## Discord API Safety

- 実Discord API連携は、まずread-onlyで完走させる。書き込みAPIはMVPのデータ構造とUXが固まってから扱う。
- Bot tokenはサーバー側だけで読む。ブラウザへ渡さない。
- API取得スクリプトやローカルAPIはGET専用にして、実保存を行わないことをコードとドキュメントの両方に明記する。
- Discordのglobal rate limitで `retry_after` が無い429が返った場合は、待機ループに入らず停止する。追加リクエストを重ねない。
- `retry_after` がある429だけ、短い回数で待機・再試行する。
- スレッドは件数が増えやすく、取得エンドポイントも重くなりやすい。初期ロードやサーバー切り替えでは自動取得しない。
- active threadsはDiscord API上でguild単位取得になる。チャンネルごとの取得ボタンを置いても、ローカルサーバー側ではguild単位レスポンスをキャッシュし、チャンネルIDで絞り込む。
- archived threadsは件数が多くなりやすいのでデフォルトOFFにする。必要時だけ明示フラグや画面操作で取得する。
- UI操作のカテゴリ開閉や初期表示でAPIを呼ばない。ユーザーが明示的に `取得` を押した時だけ外部APIへ出る設計にする。

## Discord Login Verification

- Discord OAuth2のRedirect URIは、Developer Portal側とアプリ側で完全一致が必要。ローカル、プレビュー、本番を別々に登録する。
- Authorization Code Grantでは `state` をCookieやセッションで検証する。
- token交換は `application/x-www-form-urlencoded` で送り、client credentialsはHTTP Basic認証で渡す。
- `identify` スコープだけなら `/users/@me` で基本ユーザー情報を確認できる。メールが必要なMVPでは `email` スコープを追加する。
- ログイン検証ではaccess tokenとrefresh tokenを画面やログへ出さない。
- 完走結果をローカルファイルに保存する場合も、トークンは含めない。ユーザーIDなど識別子を含む可能性があるためコミットしない。

## Local Verification Pattern

- 外部APIを使わない静的UIだけなら簡易HTTPサーバーで足りる。
- 外部APIトークンを使う場合は、同一オリジンのローカルNodeサーバーを用意し、ブラウザからはローカルAPIだけを呼ぶ。
- 実APIを叩く検証と、UIだけの検証を分ける。rate limit中は構文チェック、ダミーデータ、ブラウザ表示確認に留める。
- 外部APIの一括取得はQueue逐次処理を基本にし、レスポンスヘッダー、Retry-After、キャッシュ、早期停止条件を実装する。
- ダミーの実データ風JSONでUIを検証する場合は、確認後に削除する。生成JSONは `.gitignore` に入れておく。
- 構文チェックは軽量で有効。今回のMVPでは `node --check` でフロントJS、インポートスクリプト、ローカルAPIサーバーを確認した。

## Next MVP Checklist

- [ ] MVP固有の `README.md`、`docs/brief.md`、`docs/runbook.md` を先に埋める。
- [ ] 既存の `verifications/` に同じ技術検証がないか確認する。
- [ ] 実データのID体系に合わせて、早めに内部データ構造を決める。
- [ ] 初期状態で勝手に選択済み・実行済みにならないようにする。
- [ ] 外部APIは初期表示で呼ばず、明示操作、キャッシュ、rate limit停止方針を入れる。
- [ ] 一括取得が必要な外部APIは、並列ではなくQueue逐次処理から始める。
- [ ] `.env.example` に名前だけを書く。実値はコミットしない。
- [ ] 実装中に得た知見をMVP内 `docs/knowledge/` に残す。
- [ ] 複数MVPで再利用できる知見は、このファイルまたは `verifications/` に還元する。

## Source Notes

- `verifications/discord-login/README.md`
- `verifications/discord-login/findings.md`
- `mvps/discord-structure-manager/docs/knowledge/2026-06-10-category-sync.md`
- `mvps/discord-structure-manager/docs/knowledge/2026-06-10-discord-permissions.md`
- `mvps/discord-structure-manager/docs/knowledge/2026-06-10-discord-readonly-import.md`
- `mvps/discord-structure-manager/docs/knowledge/2026-06-10-selection-state.md`

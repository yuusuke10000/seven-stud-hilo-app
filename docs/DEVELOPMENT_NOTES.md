# 開発引き継ぎメモ（Seven Stud Hi-Lo Trainer）

別 PC の Cursor などで会話履歴が引き継げない前提で、**現在の実装・仕様・注意点**をコードベースから整理したメモです。不明点は **未確認** と明記しています。

---

## 1. アプリ概要

| 項目 | 内容 |
|------|------|
| **アプリ名（画面・タイトル）** | `Seven Stud Hi-Lo Trainer`（`index.html` の `<title>`） |
| **PWA 表示名（manifest）** | `スタッド・ハイロー トレーナー`（短名: `スタッドHiLo`） |
| **目的** | Seven Card Stud **Hi-Lo（8 or Better）** の **学習・練習**用クライアント（`app.js` 先頭コメント・`manifest.json` description） |
| **対象ユーザー** | スタッド・ハイローのルールや局面を **オフラインで反復**したい学習者（README / 画面文言からの推定。ビジネス要件の正式定義は **未確認**） |
| **実際のお金・換金・課金** | 扱わない（画面・README・補充確認モーダルで「仮想チップ」「換金不可」と明示） |
| **チップ** | **換金不可の仮想チップ**のみ（`CHIP_REFILL_TARGET = 1000` への補充は `app.js` 内定数・戦績 `virtualChipRefills`） |

---

## 2. 現在の技術構成

| 項目 | 内容 |
|------|------|
| **言語・構成** | 単一ページ **HTML**（`index.html`）+ **CSS**（`style.css`）+ **JavaScript**（`app.js`、ビルドツールなし・IIFE） |
| **バックエンド** | **なし**（静的ファイルのみ） |
| **外部 API / サーバー通信** | **使用していない**（`fetch` で外部 AI を呼ぶ処理はコード上 **未確認** の範囲で存在しない） |
| **PWA** | **対応あり**：`index.html` で `manifest.json` リンク、`app.js` で `navigator.serviceWorker.register("service-worker.js")`（`https` または `localhost` 等の安全なコンテキストでのみ登録される一般的挙動。`file://` では **未登録になり得る**） |
| **manifest.json** | あり（`name` / `short_name` / `start_url` / `display: standalone` / `orientation: portrait-primary` 等） |
| **service-worker.js** | あり。`CACHE_NAME = "stud-hilo-trainer-v4"`。`ASSETS`: `./`, `index.html`, `style.css`, `app.js`, `manifest.json`, `icon.svg` |
| **localStorage** | **使用あり**（設定・戦績・履歴。キーは後述） |

---

## 3. 画面構成

画面は `showView` + `SCREEN_IDS` で `#screenTop` 等の `hidden` を切り替え（`app.js`）。ゲーム内は **タブ**で `#panelGamePlay` 等を切替（`setGameTab`）。

| 画面 / 領域 | ID / 入口 | 役割 |
|-------------|-----------|------|
| **トップ（ロビー）** | `#screenTop` | ゲーム開始・ルール・戦績・履歴・チップ補充・設定リセット・現在チップ表示 |
| **ゲーム開始前設定** | `#screenPreGame` | CPU 人数・初期チップ・アンティ・ベット単位・ブラインド・難易度・速度・Animation / Sound / Fold 確認。「この設定で開始」でゲーム画面へ |
| **ゲーム画面** | `#screenGame` | テーブル・ドック・ゲーム内タブ |
| **ルール説明** | `#screenRules` | スタッドの流れ・アンティ/ブラインド・アクション・8 or Better 等（`index.html` 本文） |
| **戦績** | `#screenStats` | 戦績表示・チップ補充・戦績リセット |
| **履歴** | `#screenHistory` | 直近ハンドの履歴（最大件数は `saveHistory` で **10**） |
| **ログタブ（ゲーム内）** | `#tabGameLog` → `#messageLog` | **全文ログ**（`logLine` / `addDetailLog` が `game.messages` に追記し `flushMessageLog` で表示）。アンティ・ポット作成・ショーダウン行など |
| **結果タブ（ゲーム内）** | `#tabGameResults` → `#resultsContent` | **ハンド結果の詳細**（`renderResultsPanel` が `game.lastResult` を表示）。サイドポット内訳の確認用 |
| **デバッグタブ（ゲーム内）** | `#tabGameDebug` | `#gameDebugDump` に内部ダンプ・Side pot テスト結果。強制ショーダウン・戦績/設定リセット・`localStorage` 全削除ボタン |

**方針（コードから確認できる範囲）**

- 新ハンド開始時 `newGameCore` が **`setGameTab("play")`** を呼ぶ → **結果タブへ自動遷移しない**。
- デバッグ UI は **デバッグタブ**（およびヘッダのデバッグ導線）に寄せる設計（トップ常時デバッグパネルは **なし**）。

---

## 4. ゲームルール仕様（実装ベース）

- **ゲーム種別**: Seven Card Stud **Hi-Lo**、ローは **8 or Better**（`lowRanksFromFive` で **A〜8** のみ・**5 枚すべて異なるランク**が必要。9 以上はロー不成立）。
- **A の扱い**: ハイ側評価ではランク **14**（`rankLabel`）。ロー用 `lowRanksFromFive` では **A を 1** にマップ。
- **ストレート・フラッシュとロー**: ローは **5 枚のランク集合**として評価（`bestLowFromSeven` → `lowRanksFromFive`）。ストレート/フラッシュの「役」としてのローは **なし**（通常のスタッド・ハイローと同趣旨。細則の公式文書との一致は **未確認**）。
- **ハイ判定**: 7 枚から 5 枚の組合せを総当りし `evaluateFiveHigh` / `compareKeysHigh` で最強（`bestHighFromSeven`）。
- **ロー判定**: 同上で `bestLowFromSeven` / `compareLowKeys`（弱い方が強い）。
- **スクープ**: 同一ポット内で **ハイ勝者が 1 人**かつ **ロー成立**かつ **ロー勝者が同じ 1 人**のとき `splitPotAmounts` が全額をその席へ（`showdownAndPayout` 内の `scoop` 判定と同趣旨）。
- **ロー成立者なし**: `splitPotAmounts` で `lowOk === false` のとき **ハイ勝者のみでポット全額を山分け**。
- **CPU 人数**: **1〜5**（`settings.cpuCount`、`numPlayers() = 1 + cpuCount`）。
- **ショーダウン**: `PHASE.SHOWDOWN` で処理。`showdownAndPayout` が `buildSidePotsFromTotals` → 各ポットでハイ/ロー分配。フォールド生存者のみの決着は `endHandSingleWinner` 系（別経路）。
- **ストリート進行**: `PHASE_ORDER`（Ante → Third → Betting 1 → … → Seventh → Betting 5 → Showdown → Result）。配布・ベット開始は `maybeAdvanceBetting` / `startBettingIfNeeded` / `scheduleCpuChain` 等の連鎖。

---

## 5. ベット・チップ仕様

- **仮想チップ**: `game.stacks[]` と戦績 `playerChips` / `cpuStacks[]` を `writeStacksToStats` で同期。
- **Ante**: ハンド開始時に全席 `pay(i, ante, "アンティ")`（`newGameCore`）。
- **Blind**: `settings.blindsOn`。ON のとき `postBlindsForHand` で SB/BB 座と支払額を決定し `pay`。
- **SB / BB 額**: 設定 `smallBlind` / `bigBlind`（`loadSettings` で正規化）。
- **Blind の移動**: `game.blindRotateIndex` をハンドごとに `advanceBlindButtonForNextHand` で **1 席ずつ**進める（Blind ON 時のみ）。`minStacksForNewHand` / `postBlindsForHand` は `(blindRotateIndex % n)` を SB 席、`+1` を BB 席として使用。
- **コール / チェック / レイズ相当**: `applySeatAction` / `applyPlayerAction` が中心。`bettingToCall(seat) = max(0, b.target - b.invested[seat])`。
- **シングル**: UI ラベル「シングル」、`applyPlayerAction("bet")` → `applySeatAction(..., "bet")`（オープン相当）。
- **ダブル / トリプル**: `multBetTargetLevel` で目標レベルを決め、`playerExtraForMult` / `pay` で **差分のみ**投入（`applyPlayerAction("double"|"triple")`）。
- **フォールド**: `applyFold`。`game.folded[seat]`。ショーダウン勝者対象外。
- **オールイン**: `pay` でスタック全額、`game.allIn[seat] = true`。以降 `shouldSkipBettingActor` で **ベットラウンドのアクションから除外**（ただし手札は進行しショーダウンに残る）。
- **サイドポット**: `game.totalCommitted` の分布から `buildSidePotsFromTotals` が層を構築（後述）。

**実装上の主な状態（`game` オブジェクト）**

| 名前 | 役割 |
|------|------|
| `totalCommitted[]` | ハンド通算の投入（アンティ・ブラインド・ベット全て）。サイドポット分割の入力。 |
| `pot` | 現在ポット総額。`pay` で増加。決着で分配後 0。 |
| `betting` | 現在のベットラウンド。`invested[]`, `target`, `toAct`, `passCount`, `closed`, `raisesThisRound`, `maxRaises` 等。 |
| `allIn[]` | オールイン状態フラグ。 |
| `folded[]` | フォールド状態。 |
| `seatLastPayLine[]` | **直近アクション表示用**の短文（例: `コール 20`）。`pay(..., lastActionJa)` で更新。 |
| `handStartStacks` | ハンド開始時のスタックスナップショット。下部ドックの **チップ増減**（`addResultDeltaLog`）に使用。 |

**注意**: コードベースに **`currentBet`** という単一変数名は **なし**。相当は `betting.target` および `betting.invested[]`。**`lastActionAmount`** という変数名も **なし**（直近支払額は `seatLastPayLine` の末尾数字を `lastPayAmountFromLine` でパースする用途あり）。

---

## 6. All-in / Side Pot 仕様

- **All-in は Fold ではない**: `applyFold` とは別。`game.allIn[seat]` が真でも `folded[seat]` はフォールド時のみ真。
- **All-in 後**: `shouldSkipBettingActor` により **追加ベット行為の対象外**。手札は配布ロジックに従い **ショーダウンまで残る**（`activeSeatIndices` は folded のみ除外）。
- **サイドポット生成**: `buildSidePotsFromTotals(totalCommitted, folded, n)` が、`totalCommitted` の **投入レベル**ごとに層を切り、各層の `amount` と **`eligible`**（そのレベル以上を投入した **非 Fold** 席）を計算。
- **Fold 済みの投入**: `totalCommitted` に残りポットに含まれる。`showdownAndPayout` 内で `eligiblePlayers` をさらに **`!folded[i]`** で絞った `elig` が実際の分配対象。
- **各ポットごとにハイ・ロー**: `sidePotDefs` の各 `sp` について `splitPotAmounts` で `awards` に加算。
- **端数**: `splitEvenlyAmong` が `Math.floor` で按分し、余り `rem` を **`indices[0]` に 1 チップ追加**。**ハイ/ロー分割**では `highPool = ceil(total/2)`, `lowPool = total - highPool`（奇数チップはハイ側プールが 1 多い）。

---

## 7. CPU 仕様

- **人数**: 1〜5（`MAX_CPU = 5`）。
- **表示名**: `seatLabel` — 人間は「あなた」、CPU は **`CPU 1` … `CPU 5`**（スペースあり、`seat === 0` がプレイヤー）。
- **行動ロジック**: `chooseCpuAction` 付近（`partialStrength`・可視カード・`bettingToCall`・乱数ノイズ）。**難易度** `settings.difficulty`: `"easy" | "normal" | "hard"` で閾値・ノイズ量が変化（具体的分岐は `app.js` 該当ブロック参照）。
- **CPU の Fold / Call / Raise 等**: `applyCpuStep` → `applySeatAction` / `applyFold`。ログの「理由」行は `detailOnly` オプションで **詳細ログ向け**に分離される箇所あり。
- **CPU の All-in**: `applySeatAction` 内でスタック不足時に `game.allIn[seat] = true` 等の分岐あり（該当関数を参照）。
- **ショーダウン時の CPU 役表示（UI）**: 席パネル `seatCardFootLine2Html` — CPU は **`PHASE.SHOWDOWN` または `RESULT`** かつ **ショーダウン表示フラグ**、**非 Fold**、**7 枚**のときにハイ/ロー文字列を表示。それ以前は伏せがあるため **役ラベル非表示**の設計。
- **カードの伏せ**: `isCpuCardHidden(slotIndex, showdown)` — ショーダウン表示でなければ **スロット 0, 1, 6**（ホール 2 + 7th ホール）を伏せる。

---

## 8. UI 方針

- **viewport**: `width=device-width, initial-scale=1.0, viewport-fit=cover`（スマホ想定）。
- **manifest**: `orientation: portrait-primary`（**縦画面優先**の意図）。
- **デザイン**: README にある通り **ポーカーテーブル風・レトロ調**（`style.css` / `theme-retro`）。特定サービスのコピーではない旨は README 記載。
- **遷移**: トップ → 対戦設定 → ゲームの **アプリ風**フロー。
- **設定フォーム**: **対戦設定画面**に集約。ゲーム画面ヘッダは **トップ / 新ハンド / ルール / デバッグ** 等で、**アンティ数値の入力フォームは出さない**（表示は `gameHudAnteBlind` で固定文言）。

---

## 9. ゲーム画面 UI 仕様

- **テーブル中央**: `#potLabel` のみの **ポット表示**（フェーズ名は中央に出さない）。
- **プレイヤー配置**: `CPU_LAYOUT` が CPU 人数ごとに `seatTL` … `seatBR` と `seatBottom`（人間）を割当。`renderPlayers` が各コンテナに `buildSeatPanel` を挿入。CPU 4 人以上で `layout-dense` クラス付与（`app.js` `renderAll`）。
- **下部 UI**: `nav.control-dock` — 上段: ログタイル + サポート AI タイル。下段: 役名パネル + 操作ボタン列（`index.html`）。
- **ログ表示（ドック）**: `#dockMiniLog`（`renderDockMiniLog`）。**チップ増減専用**（後述）。
- **サポート AI**: `#dockSupportAi`（`renderSupportAi`）。
- **役名表示**: `#handRankMeta`, `#handRankHighWrap`, `#handRankLowWrap`（`renderHandRankPanel`）。**現在該当行の強調**等。
- **操作ボタン**: フォールド / チェック / コール / シングル / ダブル / トリプル。**オールインは `#btnAllIn`**（役エリア側。操作グリッドからは除外）。
- **直近プレイ・役**: 各 `seat-panel` の **`seat-card-foot`** 内 2 行（`seatCardFootLine1Html` / `seatCardFootLine2Html`）。1 行目: `seatLastPayLine`。2 行目: `累計 totalCommitted / 直近 lastPayAmountFromLine` と条件付きでハイ/ロー文言等。
- **チップ増減ログ**: `addResultDeltaLog` → `pushDockMiniLog`（ハンド間 `__SEP__` で区切り要素化）。
- **結果タブ自動遷移**: **しない**（`newGameCore` で `play` に戻す等）。
- **デバッグ**: **デバッグタブ**の `#gameDebugDump` とボタン群。

---

## 10. 下部 UI の現在仕様（ドック）

### 下部ログ（`#dockMiniLog`）

| 表示する | 表示しない |
|----------|------------|
| `addResultDeltaLog` 経由のみ: `第Nハンド結果`、各席の **`席：+Δ` / `席：-Δ`**（`handStartStacks` との差。Δ が 0 の席は行省略）。ハンド境界の **`__SEP__`**（点線相当の DOM） | プレイ中アクション行、フェーズ見出し、Main/Side ラベル、eligible 説明、サイドポット層の説明（これらは **`pushDockMiniLog` を結果用以外で呼ばない**設計） |

### サポート AI

- **外部 API なし**。`computeSupportAiDrawOdds` が **残り `game.deck`** からランダムに抜き取り 7 枚を完成させる試行を繰り返し、**件数ベースの %**（四捨五入）を算出。
- **ハイ候補**（見出し「ハイ候補」）: 実装ラベルは **`フラッシュ以上` / `ストレート以上` / `ツーペア以上` / `ワンペア以上`**（カテゴリ強度のしきい値達成率。ユーザー向け文言の「フラッシュ単体 %」とは **意味が異なる**点に注意）。
- **ロー候補**（見出し「ロー候補」）: **`8 TOP` / `7 TOP` / `6 TOP` / `5 TOP` / `ローなし`**。
- **Fold / All-in / Showdown or Result**: 固定短文（`renderSupportAi` 内 HTML）。
- **ゲーム画面に「※簡易目安・外部APIなし」系の注記を出す処理はコード上なし**（注記は README 等に任せる方針と整合）。

### 役名ドック

- **並び**: 左 **ハイ**列（`HAND_HIGH_LADDER`）、右 **ロー**列（`HAND_LOW_LADDER`）。いずれも `renderHandRankPanel` 内で行生成。
- **見出し「ハイ役」「ロー役」**: **なし**（列ブロックのみ）。
- **オールイン**: **`#btnAllIn`** を **ロー役ラッパー**（`.dock-rank-low-wrap`）内 **右下寄せ**（CSS で `position: absolute`）。操作列には **置かない**。
- **操作ボタン並び（上段→下段）**: フォールド、チェック、コール / シングル、ダブル、トリプル（日本語ラベルは `index.html` のボタン文言に準拠）。

---

## 11. サポート AI 仕様（詳細）

- **外部 API 不使用**（ネットワーク呼び出しなし）。
- **意味**: 「**まだ配られていない分**を、残り山 `game.deck` から無作為に補完した 7 枚」で評価したサンプルにおける **経験的確率**」に近い（コメント: 「伏せ・未配分カードからランダムに埋めた7枚での候補役の出現率（試行サンプル）」）。
- **試行回数**: `need === 0` のとき `1`、それ以外 `min(100, max(48, 72))`（`need = max(0, 7 - hand.length)`）。
- **表示上の注意**: ハイ側ラベルは **累積しきい値**（「ワンペア以上」等）。**厳密な数学的確率ではない**。

---

## 12. localStorage 仕様

| キー | 内容 |
|------|------|
| `studHiloLearn_settings_v1` | `defaultSettings` 相当の JSON（`cpuCount`, `startChips`, `ante`, `betUnit`, `difficulty`, `playSpeed`, `animations`, `sound`, `foldConfirm`, `blindsOn`, `smallBlind`, `bigBlind`） |
| `studHiloLearn_stats_v3` | 戦績 JSON（`defaultStats` 型。`playerChips`, `cpuStacks[]`, `virtualChipRefills`, `handsByCpuCount`, 等） |
| `studHiloLearn_history_v1` | 履歴配列 JSON（最大 **10** 件保存） |
| `studHiloLearn_stats_v2` | **レガシー**。読み込み時に `STATS_KEY` が空ならフォールバック。保存時に `removeItem` で削除を試みる |

**チップ補充**: プレイヤーチップを **`CHIP_REFILL_TARGET`（1000）** に引き上げ。`virtualChipRefills` カウント。ハンド進行中は `refillBlockedMidHand` でブロック。

**設定リセット**: デバッグ等から `defaultSettings` + `saveSettings`。**localStorage 全削除**: デバッグタブ `localStorage.clear()`（確認フローはボタンハンドラ側を参照）。

---

## 13. PWA 仕様

| 項目 | 内容 |
|------|------|
| **manifest.json** | 前述。`start_url: ./index.html` |
| **service-worker.js** | インストール時に `ASSETS` をキャッシュ。`activate` で旧 `CACHE_NAME` 削除。`fetch` は GET のみ cache-first + 失敗時 `index.html` フォールバック |
| **キャッシュ対象** | `ASSETS` 列挙分のみ（**未確認**: 将来アセット追加時は `ASSETS` と `CACHE_NAME` バンプが必要） |
| **更新時の注意** | `CACHE_NAME` を変更しないと古い `app.js` が残る可能性。**アセット変更時はバージョン文字列の更新を推奨**（運用ポリシー。リポジトリに自動バンプはなし） |

---

## 14. Git / 開発運用

- **GitHub リポジトリ名 / URL**: 本リポジトリのファイルだけでは **未確認**（`git remote -v` で各自確認）。
- **ブランチ**: ローカルで `main` 初期化後に作業ブランチを切る運用が想定されるが、**リモートの default ブランチ名は未確認**。
- **別 PC で作業前**: `git pull`（`origin` 設定済みが前提）。
- **作業後**: 変更内容を **`feature/...` 等のブランチ**にコミットし **`git push`**。
- **ブランチ作成**: 共有 `main` を汚さないよう、**作業前にトピックブランチを切ることを推奨**。
- **Cursor Agent**: **会話履歴は PC 間で引き継げない**ため、本ドキュメント + README を読む運用を推奨。

---

## 15. 今後の修正で壊しやすいポイント（回帰注意）

- `bestHighFromSeven` / `bestLowFromSeven` / `compareKeysHigh` / `compareLowKeys`
- `buildSidePotsFromTotals` と `showdownAndPayout` の整合
- All-in 時の `pay` / `allIn` / `shouldSkipBettingActor`
- Ante / `postBlindsForHand` / `blindRotateIndex`
- `maybeAdvanceBetting` を含む **自動進行**（`scheduleCpuChain`, `autoProgressGen`）
- CPU 人数 1〜5 と `CPU_LAYOUT` / `renderPlayers`
- `loadSettings` / `saveSettings` / `loadStats` / `saveStats` / 履歴キー
- PWA: `manifest.json` / `service-worker.js` / 登録条件
- 縦画面・ドック高さ・`layout-dense` 等の **レスポンシブ CSS**
- **結果タブへ自動遷移しない**挙動（`setGameTab("play")` 等）
- **下部ログ**は `addResultDeltaLog` のみ（プレイ行を混ぜない）
- **役表示の日本語**（`nameJa` / `PHASE_LABEL_JA` / ロー TOP 表記）と **「未確定」非表示**方針（`renderHandRankPanel` 側の条件は変更時に要確認）

---

## 16. 未対応・簡易対応（README・コードコメントと整合）

- **オンライン対戦**（なし）
- **課金・換金**（なし）
- **サーバー側戦績保存**（なし。localStorage のみ）
- **高度な AI**（ヒューリスティック + 乱数。`README.md` の「まだ未対応」参照）
- **カジノ水準の再レイズキャップ等**（`betting.maxRaises` 等の簡易上限あり。細則完全再現ではない）
- **その他**: 追加要件があれば Issue / メモに追記

---

## 17. 動作確認手順（手動）

1. `index.html` をブラウザで開く（またはローカル HTTP サーバで PWA 登録確認）。
2. **トップ**: チップ表示・各ボタンが反応するか。
3. **対戦設定**: 各セレクト変更 → 「この設定で開始」でゲームへ。
4. **CPU 1〜5**: 人数変更で席が変わるか（`data-cpu-count` / `CPU_LAYOUT`）。
5. **Ante / Blind ON/OFF**: ヘッダ左表記・実際の `pay` ログ（ログタブ）。
6. **シングル / ダブル / トリプル**: 投入・`betting.target` 更新・ログタブ。
7. **All-in**: 役エリアのオールイン・確認ダイアログ・サイドポット発生時の結果タブ。
8. **Side Pot**: デバッグの Side pot テスト + 実プレイで結果タブの内訳。
9. **Fold**: 確認 ON/OFF、生存者決着。
10. **Showdown**: 全ストリート通過、分配・戦績更新。
11. **チップ増減ログ（ドック）**: ハンド後のみ・区切り・スクロール。
12. **結果タブ**: `lastResult` の表示。
13. **サポート AI**: 通常時の % 表示、Fold/All-in/SD で固定文。
14. **localStorage**: リロード後の設定・戦績保持、デバッグの全削除。
15. **PWA**: `localhost` で SW 登録、オフライン再読込（環境依存。**未確認**の場合はスキップ可）。

---

## 18. 別 PC の Cursor Agent に最初に読ませる指示文（例）

以下をそのまま（またはプロジェクトに合わせて URL を追記して）コピーして使えます。

```text
README.md と docs/DEVELOPMENT_NOTES.md を読んで、現在の実装状況・画面構成・ベット/サイドポット・localStorage・PWA の仕様を把握してください。まだコード変更はしないでください。作業を始める際は、回帰しやすい箇所（DEVELOPMENT_NOTES.md セクション 15）に注意し、変更理由とテスト手順（セクション 17）を短くメモに残してください。
```

---

*このファイルはリポジトリ内のソース・README から作成しました。リモート URL・チーム運用ルールは各環境で未確認のため、必要に応じて追記してください。*

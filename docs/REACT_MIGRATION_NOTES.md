# React 移行メモ（引き継ぎ用）

別 PC の Cursor などで会話履歴が引き継げない前提で、**React + Vite への UI 再設計**の現状・手順・注意点をまとめた資料です。  
詳細な静的版の仕様は `README.md` と `docs/DEVELOPMENT_NOTES.md` を参照してください。

---

## 1. React 移行の目的

- 現行の静的 SPA（`index.html` / `style.css` / `app.js`）では、**CPU 人数 1〜5**、**Fold / All-in**、**Side Pot**、**勝者強調**、**スマホ縦画面 UI** を同時に安定させるのが難しくなってきたため、**React + Vite** で UI を再設計している。
- **既存静的版はまだ削除・置き換えしていない**。参照元として残し、React 側に必要なロジック・仕様を段階的に移植している。
- React 版は **現時点では `feature/react-ui-prototype` ブランチ上の `react-ui/` 配下**で進行中である。

---

## 2. 現在の開発ブランチ

- **作業ブランチ**: `feature/react-ui-prototype`
- **`main` ではない**。React 関連の変更はこのブランチで行う。
- 他 PC で作業する場合は、必ず **`feature/react-ui-prototype` を checkout** してから `react-ui/` を触る。

---

## 3. 他 PC での取得手順

初回:

```bash
git clone https://github.com/yuusuke10000/seven-stud-hilo-app.git
cd seven-stud-hilo-app
git fetch origin
git checkout feature/react-ui-prototype
```

既に clone 済みの場合:

```bash
git fetch origin
git checkout feature/react-ui-prototype
git pull origin feature/react-ui-prototype
```

---

## 4. React 版の起動方法

```bash
cd react-ui
npm install
npm run dev
```

ブラウザで表示される URL を開く。通常は **`http://localhost:5173/`** だが、ポート使用中の場合は **5174 以降**になることがある。

ビルド確認:

```bash
npm run build
```

ビルド成果物のプレビュー:

```bash
npm run preview
```

（`preview` もポートが空いている番号で起動する。ターミナル出力を確認すること。）

---

## 5. 現在の React 版で実装済みの内容（整理）

以下は **`react-ui/src` を中心とした現状の整理**である。細部はコードと `README.md` / `DEVELOPMENT_NOTES.md` と照合すること。

### 基盤

- **React + Vite** の構成（`react-ui/`）
- **画面遷移**: トップ / ゲーム設定 / ゲーム / ルール / 戦績 / 履歴（`screens/`）

### 画面・コンポーネント（代表）

- **トップ画面**（`screens/TopScreen.jsx`）
- **ゲーム設定画面**（`screens/SettingsScreen.jsx`）
- **ゲーム画面**（`components/GameScreen.jsx`）
- **ルール画面**（`screens/RulesScreen.jsx`）
- **戦績画面**（`screens/StatsScreen.jsx`）
- **履歴画面**（`screens/HistoryScreen.jsx`）
- **GameTable**（`components/GameTable.jsx`）
- **SeatPanel**（`components/SeatPanel.jsx`）
- **Card**（`components/Card.jsx`）
- **MiniLog**（`components/MiniLog.jsx`）
- **SupportAi**（`components/SupportAi.jsx`）
- **HandRankPanel**（`components/HandRankPanel.jsx`）
- **ActionButtons**（`components/ActionButtons.jsx`）
- **ResultsPanel**（`components/ResultsPanel.jsx`）
- **EngineDebugPanel**（`components/EngineDebugPanel.jsx`）

### アーキテクチャ

- **ViewModel / selector 層**（`selectors/`）：UI と生の state を分離
- **engine 純関数**（`engine/`）
  - `handEvaluator.js`（ハイ / ロー、8 or Better）
  - `sidePot.js`（`totalCommitted` から Side Pot）
  - `supportAi.js`（外部 API なしの簡易サンプリング）
  - `cards.js` / `formatters.js`
- **gameEngine**（`engine/gameEngine.js`）
  - 当初のスケルトンから拡張し、**簡易プレイ可能**な 1 ハンド進行（アクション・ストリート・ショーダウン・分配の流れ）を含む
  - **Ante / Blind / SB / BB**、**Blind のハンドごとの移動**
  - **Fold / Check / Call / Single / Double / Triple / All-in**
  - **Fold 済みには以降カードを配らない**、**All-in には最後までカードを配る**
  - **ショーダウン**、**High / Low 判定**、**8 or Better**、**Side Pot**
  - **ミニログ**（チップ増減中心）、**結果タブ**、**ログタブ（詳細ログ文字列）**、**デバッグタブ**
- **localStorage**（`storage/localStorage.js`）：設定・戦績・履歴の読み書き（静的版キー互換を意図）
- **`npm run build` / `npm run preview` は成功する状態を維持すること**（コミット前に確認推奨）

---

## 6. 現在の React 版で守っている重要仕様

以下は **README / DEVELOPMENT_NOTES と矛盾しないことを優先**している前提のチェックリストである。

- 実際のお金、換金、課金は扱わない
- すべて換金不可の仮想チップ
- 外部 API やサーバー通信は追加しない
- CPU 人数は 1〜5 人
- 8 or Better
- Ante / Blind / Small Blind / Big Blind
- Blind はハンドごとに移動
- シングル、ダブル、トリプル、コール、チェック、フォールド、オールイン
- All-in は Fold 扱いにしない
- All-in には最後までカードを配る
- Fold 済みには以降カードを配らない
- Side Pot は `totalCommitted` をもとに作る
- `totalCommitted` は Side Pot 計算から消さない
- Fold 済みの支払い済みチップは pot に残るが勝者対象外
- ショーダウン後に結果タブへ自動移動しない
- 下部ミニログはチップ増減中心
- 詳細ログはログタブ
- 詳細結果は結果タブ
- Debug 情報はデバッグタブのみ
- サポート AI は外部 API なし
- CPU のショーダウン前の役は表示しない
- Fold 済みプレイヤーの役はショーダウン時も表示しない
- ロー役名は 5 TOP / 6 TOP / 7 TOP / 8 TOP / ローなし
- 「ホイール」は表示しない
- 「未確定」は表示しない
- 「ハイ役」「ロー役」の見出しは表示しない
- 通常画面では英語ラベルを極力出さない

---

## 7. localStorage 仕様

静的版と同じキー名を維持する方針。

| キー | 用途 |
|------|------|
| `studHiloLearn_settings_v1` | 設定 |
| `studHiloLearn_stats_v3` | 戦績（現行） |
| `studHiloLearn_history_v1` | 履歴（直近 10 件想定） |
| `studHiloLearn_stats_v2` | 戦績の **フォールバック読み込み**（読み後は v3 へ寄せる想定） |

React 版では **`react-ui/src/storage/localStorage.js`** で読み書きしている。

### 7.1 settings（`studHiloLearn_settings_v1`）

| 項目 | 静的版 `app.js` | React `localStorage.js` | 結果 |
|------|-----------------|-------------------------|------|
| デフォルト | `cpuCount: 1` 他 | 同上に修正済み（以前は React だけ `cpuCount: 5`） | **一致** |
| `cpuCount` | 1〜5 にクランプ（`Number` が無効ならデフォルト） | 静的版と同じ式 | **一致** |
| 列挙値 | `startChips` / `ante` / `betUnit` / `difficulty` / `playSpeed` 等 | 同じ許容リスト・三項演算子の boolean 解釈 | **一致** |
| `normalizeBlinds` | あり | 同名ロジック | **一致** |
| 破損 JSON | `catch` で `defaultSettings()` | `safeParse` でフォールバック | **同等** |

静的版で保存した settings は React で読み込み可能。React で保存したものも静的版で読み込み可能（キー・フィールド集合は同一）。

### 7.2 stats（`studHiloLearn_stats_v3` / `studHiloLearn_stats_v2`）

| 項目 | 静的版 | React 版（調整後） | 備考 |
|------|--------|-------------------|------|
| `defaultStats` / `loadStats` | `app.js` | `localStorage.js` | フィールド集合は同一。`totalHands` 欠損時は `totalGames` フォールバックも同様。 |
| v2 フォールバック | v3 空なら v2 読込 | 同様 | **一致** |
| v3 保存時 v2 削除 | `removeItem(LEGACY)` | 同様 | **一致** |
| ハンド終了更新 | `showdownAndPayout` 内 / `finalizeFoldStats` | `App.jsx`（`handJustEnded` 受信時） | ルールを静的版に寄せた。 |
| `totalGames` / `totalHands` | どちらも +1 / ハンド | 同様 | **一致** |
| `playerWins` / `cpuWins` | ショーダウン: `pA` と `maxA` 比較。フォールド決着: 勝者席 | 同様 | **一致** |
| `playerHighWins` / `playerLowWins` / `playerScoops` | **各サイドポット**のループで OR 集計 | `potDetails` をループして同様に OR | **意図一致**（エンジンが `potDetails` を持つ前提） |
| `totalChipsWon` | ショーダウンで `pAward>0` のとき加算。フォールド決着でも勝ち分加算 | 同様（`pA` ベース） | **一致** |
| `totalChipsLost` | **ほぼ** `finalizeFoldStats` で「CPU が勝ち・かつ自分がフォールド・かつ `pA===0`」のとき **+1 のみ**（チップ額ではない） | 同条件で +1 のみ | **一致**（ショーダウン負けでは増えない静的仕様も踏襲） |
| `maxPotWon` / `minChipsReached` / `maxChipsReached` | `app.js` | React で同趣旨 | **一致** |
| `writeStacksToStats` | ハンド後にスタック同期 | `handJustEnded.stacks` で同期 | **近似一致**（React エンジンのスタックがソースオブトゥルース） |

**完全同一にならない可能性**: 静的版と React 版で **ポット分配・`awards` の 1 チップ単位**が異なる局面では、`playerChips` / `cpuStacks` / `maxPotWon` 等がずれる（ゲームロジック差分）。localStorage 形式の問題ではなく **エンジン一致**の別タスク。

### 7.3 history（`studHiloLearn_history_v1`）

静的版 `recordHistoryFromResult` → `pushHistory` の **1 件のキー**に合わせ、`buildHistoryEntryForStorage(handJustEnded)` で同形のオブジェクトを保存する。

保存フィールド（静的版と同じ）: `at`, `cpuCount`, `pot`, `highWinners`, `lowWinners`, `scoop`, `playerResult`, `playerHigh`, `playerLowOk`, `blindsOn`, `smallBlind`, `bigBlind`, `sbSeat`, `bbSeat`, `hasSidePots`, `sidePotCount`

- **highWinners / lowWinners**: 静的版同様、表示用文字列（`あなた`, `CPU 1` 形式、カンマ区切り）。
- **playerResult**: `Win` / `Lose` / `Split` / `Fold`（静的版と同じ英語コード。画面では日本語表示）。
- React `HistoryScreen` は上記フィールドを読んで表示。旧プロトタイプ形式（`id` / `atText` / `summary` のみ）のエントリは、詳細リストなしでも日時・CPU 人数・ブラインド・ポットは表示可能。

### 7.4 サンプル JSON（想定）

**settings（静的／React 共通形の例）**

```json
{
  "cpuCount": 1,
  "startChips": 1000,
  "ante": 10,
  "betUnit": 20,
  "difficulty": "normal",
  "playSpeed": "normal",
  "animations": true,
  "sound": false,
  "foldConfirm": true,
  "blindsOn": true,
  "smallBlind": 10,
  "bigBlind": 20
}
```

**stats（v3 の例）**

```json
{
  "totalGames": 12,
  "totalHands": 12,
  "playerWins": 4,
  "cpuWins": 8,
  "playerHighWins": 3,
  "playerLowWins": 2,
  "playerScoops": 1,
  "maxPotWon": 240,
  "playerChips": 850,
  "cpuStacks": [920, 880, 1000, 1000, 1000],
  "totalChipsWon": 1200,
  "totalChipsLost": 2,
  "maxChipsReached": 1200,
  "minChipsReached": 400,
  "playerFolds": 5,
  "showdownsReached": 7,
  "handsByCpuCount": { "1": 4, "2": 8, "3": 0, "4": 0, "5": 0 },
  "virtualChipRefills": 0
}
```

**history 1 件（静的版・React 保存ともこの形）**

```json
{
  "at": "2026-05-07T12:34:56.789Z",
  "cpuCount": 2,
  "pot": 180,
  "highWinners": "あなた",
  "lowWinners": "CPU 1, あなた",
  "scoop": false,
  "playerResult": "Win",
  "playerHigh": "ツーペア (8と5)",
  "playerLowOk": true,
  "blindsOn": true,
  "smallBlind": 10,
  "bigBlind": 20,
  "sbSeat": "CPU 1",
  "bbSeat": "あなた",
  "hasSidePots": false,
  "sidePotCount": 1
}
```

### 7.5 本体置き換え前に再確認したい項目

- 同一シード／同一操作列で **ハンド結果（`awards`）** を静的版と React 版で比較し、stats が一致するか（エンジン差の有無）。
- **チップ補充**・**戦績リセット**・**履歴リセット**を React 側で実装する場合、静的版と同じキー更新になるか。
- PWA / `start_url` が React ビルドに切り替わったときの **オフラインキャッシュ**と localStorage のオリジン。

---

## 8. 主なディレクトリ構成（`react-ui/src/`）

```
react-ui/src/
├── App.jsx
├── main.jsx
├── components/     # UI（GameScreen, GameTable, SeatPanel, …）
├── engine/         # 純関数 + gameEngine
├── selectors/      # ViewModel / selector
├── mock/           # モック状態（開発・表示確認用）
├── screens/        # トップ・設定・ルール・戦績・履歴
└── storage/        # localStorage ラッパ
```

（`assets/` など Vite 既定のファイルも同梱される。）

---

## 9. まだ未実装・簡易実装の範囲

- **GitHub Pages への実デプロイ**（`react-ui/dist` の配置方法・Actions 等は未確定）
- **ルート静的版の legacy 退避と配信切替**（現時点では未実施）
- **既存静的版の置き換え**（ルートの `index.html` 差し替え等）
- **ゲームエンジンと静的版 `app.js` の分配・局面処理の完全一致**（localStorage 形式は寄せたが、数値一致はエンジン依存）
- **高度な CPU AI**
- **カジノ細則の完全再現**
- **アニメーション / サウンド**（設定項目はあるが React 版での本実装は未完了の可能性）
- **実機スマホでの最終確認**
- **360px 級の画面での崩れ確認**

---

## 9.1 GitHub Pages（project site）向けの React/PWA 準備（react-ui 側）

このリポジトリの想定:

- GitHub Pages は **project site 形式**（`/seven-stud-hilo-app/` 配下で配信）

### Vite `base` 設定

- `react-ui/vite.config.js` で `base` を以下の方針にした:
  - **build 時のみ** `base: "/seven-stud-hilo-app/"`
  - dev 時は `base: "/"`（開発サーバーの導線を単純化）

これにより、`npm run dev` のルーティングを壊しにくくしつつ、GitHub Pages の配信パスに合わせた build を生成できる。

### PWA 方針（採用）

- **方針A**: `vite-plugin-pwa` を採用（Workbox の precache を利用し、Vite の hashed assets に追従しやすい）

#### manifest

- `vite-plugin-pwa` により `dist/manifest.webmanifest` を生成
- 既存静的版の `manifest.json` を参考に以下を維持:
  - `name`, `short_name`, `display: standalone`, `orientation: portrait-primary`
  - `theme_color`, `background_color`
  - `start_url` / `scope` は GitHub Pages project site の `base` に合わせて `/seven-stud-hilo-app/`
- アイコンは `react-ui/public/icon.svg` を使用（ルートの `icon.svg` は変更しない）

#### Service Worker（Workbox generateSW）

- `vite-plugin-pwa` の `generateSW` で `dist/sw.js` を生成
- **hashed assets** は Workbox の precache（ビルド時の manifest）に乗るため、静的版のような手動 `ASSETS` 列挙が不要
- `cleanupOutdatedCaches: true` を有効化（古いキャッシュが残って更新されにくい問題の緩和）
- SPA fallback は `navigateFallback: "/seven-stud-hilo-app/index.html"` を指定

### GitHub Pages 想定 URL

- 本体: `https://<user>.github.io/seven-stud-hilo-app/`
- PWA manifest: `https://<user>.github.io/seven-stud-hilo-app/manifest.webmanifest`
- Service Worker: `https://<user>.github.io/seven-stud-hilo-app/sw.js`

### build 成果物の扱い

- `react-ui/dist/` が Pages 配信対象候補
- ただし **現時点ではルートの静的版を置き換えていない**ため、`dist` の配置方法（root 直置き / `docs` ブランチ / GitHub Actions で `gh-pages` ブランチへ deploy 等）は別途決める

### 既存静的版を legacy へ退避する案（今回まだ実施しない）

- 将来の置換タイミングで `/legacy/` へ静的版一式を退避し、React build をルート配信に切り替える案が有力
- 今回は **削除・移動・置換は行わない**

### 置換前の確認項目（PWA/GitHub Pages 追加分）

- `npm run build` が成功する
- `npm run preview` で表示できる
- **`npm run preview` では GitHub Pages と同じ base 前提で見る**:
  - 例: `http://localhost:4173/seven-stud-hilo-app/`（末尾スラッシュ推奨）
  - 併せて `.../manifest.webmanifest` / `.../icon.svg` / `.../sw.js` が 200 で取れることを確認
- `manifest.webmanifest` が参照できる（DevTools Application タブ等）
- Service Worker が登録され、オフラインで reload できる（初回はオンライン必須）
- `/seven-stud-hilo-app/` 配下でパス解決が崩れない（アイコン/JS/CSS）

### manifest / SW / icon の注意点（project site）

- **`index.html` に手書きの `link rel="manifest" href="/manifest.webmanifest"` を置かない**:
  - これは **ドメイン直下**（`/manifest.webmanifest`）を指してしまい、project site では壊れる
  - `vite-plugin-pwa` が build 時に **`/seven-stud-hilo-app/manifest.webmanifest`** を注入するのを正とする
- **favicon 等の静的アセット**は Vite の `%BASE_URL%` を使うと、dev（`/`）と build（`/seven-stud-hilo-app/`）の両方で整合しやすい
- **manifest の icons** は `icon.svg` のように **manifest からの相対パス**でもよい（`/seven-stud-hilo-app/manifest.webmanifest` から `/seven-stud-hilo-app/icon.svg` に解決される）
- **Service Worker** は `dist/sw.js` がデプロイされ、登録先は **`/seven-stud-hilo-app/sw.js`** 想定（`registerSW` の `scope` は `import.meta.env.BASE_URL` に追従）

### 未確認事項

- GitHub Pages 実環境での SW 更新挙動（キャッシュ更新タイミング、強制更新手順）
- `start_url` の最適値（`/seven-stud-hilo-app/` vs `/seven-stud-hilo-app/index.html`）

---

## 10. 次にやる予定（例）

- 同一操作列での **ハンド結果・stats 数値**の静的版との突き合わせ（エンジン差分の洗い出し）
- React 版置き換え前の不足整理（画面・ログ・戦績・PWA）
- PWA / GitHub Pages 対応方針の検討
- **React 版を本体に置き換えるかどうかの判断**（リスク・工数・互換性）

---

## 11. 別 PC の Cursor に最初に読ませる指示文（コピー用）

```
README.md、docs/DEVELOPMENT_NOTES.md、docs/REACT_MIGRATION_NOTES.md を読んでください。
現在のReact移行作業は feature/react-ui-prototype ブランチの react-ui/ 配下で進んでいます。
既存静的版の index.html / style.css / app.js はまだ置き換えないでください。
まずReact版の現状、実装済み機能、未実装範囲、localStorage互換性の懸念を把握してください。
コード変更はまだ行わず、次に実施すべき作業を整理してください。
```

---

## 12. Git 運用注意

- **`main` へ直接コミットしない**
- **`feature/react-ui-prototype` で作業する**
- 変更は原則 **`react-ui/` 配下中心**
- 既存静的版（`index.html` / `style.css` / `app.js` 等）を変更する場合は、**必ず事前に理由を明記**する
- 作業前に **`git status`** を確認する
- 可能なら **`npm run build`（`react-ui`）が通る状態**でコミットする

---

## 更新履歴（手動）

- 本ファイル作成時点: `feature/react-ui-prototype` 上の React プロトタイプ状況を反映。
- 2026-05-07: localStorage 互換性調査結果をセクション 7 に追記（settings / stats / history / サンプル JSON）。React 側で履歴形状・戦績更新・デフォルト CPU 人数などを静的版に寄せる変更あり。
- 2026-05-07: React 版 PWA（vite-plugin-pwa）の project site base 配下で manifest/SW/icon が壊れないよう整理（手書き manifest リンク削除、`injectRegister: null`、相対 icon、`registerSW` scope を `BASE_URL` 追従）。preview 確認手順をセクション 9.1 に追記。

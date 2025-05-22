Pomodoro Buddy – Chrome 拡張 MVP 仕様書
1. 目的
作業 25 分／休憩 5 分を自動で回す ポモドーロタイマー をブラウザ右上（ツールバー）で常駐させる

残り時間をバッジ表示し、セッション切替時にネイティブ通知で知らせる

コードと構成は “後で読みやすい＆テストしやすい” を最優先（学習用途）

2. 技術スタック
項目	採用技術
フロント	HTML + Tailwind CSS
ロジック	TypeScript (ES2022)
ビルド	Vite
テスト	Vitest (ユニット)
拡張仕様	Chrome Manifest v3
ストレージ	chrome.storage.sync

3. ユーザーストーリー
開始／停止

ユーザーがポップアップの Start ボタンを押すと 25 分カウントが始まる

Stop/Reset でいつでも 0 に戻る

バッジ表示

ツールバーアイコンのバッジに「残り分数」を常時表示

セッション通知

作業終了 → 休憩開始、休憩終了 → 作業再開のタイミングで chrome.notifications を 1 回送出

ページ遷移しても継続

タブを閉じたりページリロードしてもタイマーはバックグラウンドで維持

設定画面なし（MVP）

作業 25 分／休憩 5 分は固定値

4. 機能仕様
機能	詳細
タイマー制御	background.ts 内で setInterval(1000)／「実際の経過秒」を比較してドリフト補正
モード管理	enum SessionType { Work, Break } と interface TimerState { type, startEpoch, durationSec }
バッジ更新	1 分ごとに chrome.action.setBadgeText({ text: remainingMin })
通知	chrome.notifications.create({ type:'basic', title:'Break Time!', ... })
ポップアップ UI	popup.html + popup.ts（start/stop ボタンと残り時間テキスト）
ストレージ同期	chrome.storage.sync.set/get で TimerState を永続化

5. ディレクトリ構成（Vite + Manifest）
arduino
コピーする
編集する
pomodoro-buddy/
├─ src/
│  ├─ background.ts      // ①タイマー制御（Service Worker）
│  ├─ popup/
│  │   ├─ popup.html
│  │   ├─ popup.ts
│  │   └─ popup.css     // Tailwind @apply 可
│  ├─ utils/
│  │   └─ timer.ts      // 計算ロジック & 単体テスト対象
│  └─ types/
│      └─ index.d.ts
├─ public/
│  ├─ manifest.json
│  └─ icons/            // 16,32,48,128px
├─ vitest.config.ts
└─ vite.config.ts
manifest.json（抜粋）
jsonc
コピーする
編集する
{
  "manifest_version": 3,
  "name": "Pomodoro Buddy",
  "description": "25/5 ポモドーロを手元で簡単管理！",
  "version": "0.1.0",
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background.js", "type": "module" },
  "permissions": ["storage", "notifications"],
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
6. テスト方針
ユニット — timer.ts の

残り時間計算

ドリフト補正の境界値

手動 E2E — Chrome 拡張の「パッケージ化されていない拡張を読み込む」で動作確認

Start → 25 min カウント → Break 通知 → 5 min → 次 Work 通知

7. ビルド & 実行
bash
コピーする
編集する
pnpm i
pnpm dev        # HMR で popup をローカル http://127.0.0.1:5173/ で確認
pnpm build      # dist/ を生成。Chrome に読み込む
8. 今後の拡張アイデア（MVP後）
作業／休憩時間のカスタム設定 UI

“何のタスクをやるか” を入力して履歴保存 → 日次統計ダッシュボード

Google Calendar 連携でセッション自動登録

アプリ間同期（Chrome Sync or Firebase）
# Pomodoro Buddy

Chrome拡張機能として動作するポモドーロタイマーです。25分の作業セッションと5分の休憩セッションを自動で管理し、生産性向上をサポートします。

## 機能

- 作業時間（25分）と休憩時間（5分）の自動切り替え
- 残り時間のバッジ表示
- セッション切り替え時の通知
- タイマーの開始/停止/リセット
- ブラウザ再起動後もタイマー状態の保持
- 外部APIを使用した正確な日付取得
- バックログ管理機能

## 開発環境のセットアップ

### 必要なもの

- Node.js (16以上)
- pnpm (推奨) または npm

### インストール

```bash
# 依存パッケージのインストール
pnpm install
```

### 開発サーバーの起動

```bash
# 開発モードでの実行
pnpm dev
```

### ビルド

```bash
# 本番用ビルド
pnpm build
```

ビルド後の成果物は `dist` ディレクトリに出力されます。

## Chrome拡張機能としての使い方

1. `pnpm build` を実行してビルドします
2. Chromeで `chrome://extensions` を開きます
3. 右上の「デベロッパーモード」をオンにします
4. 「パッケージ化されていない拡張機能を読み込む」をクリックします
5. `dist` ディレクトリを選択します

## 技術スタック

- TypeScript
- Tailwind CSS
- Vite (ビルドツール)
- Chrome Extension Manifest V3
- World Time API（外部日付取得）

## プロジェクト構造

```
pomodoro-buddy/
├─ src/                  // ソースコード
│  ├─ background.ts      // タイマー制御（Service Worker）
│  ├─ popup/            // ポップアップUI
│  ├─ utils/            // ユーティリティ関数
│  └─ types/            // 型定義
├─ public/              // 静的ファイル
│  ├─ manifest.json     // 拡張機能マニフェスト
│  └─ icons/            // アイコン画像
├─ docs/                // ドキュメント
│  ├─ BACKLOG.md        // プロジェクトバックログ
│  ├─ DEVELOPMENT_LOG.md // 開発ログ
│  ├─ QUICK_REFERENCE.md // クイックリファレンス
│  └─ TROUBLESHOOTING.md // トラブルシューティング
├─ tests/               // テストファイル
│  └─ test-date.html    // 日付機能テスト
├─ scripts/             // 実行スクリプト
│  └─ update-backlog-date.js // バックログ日付更新
├─ tools/               // 開発ツール
│  └─ create-icons.html // アイコン作成ツール
├─ dist/                // ビルド出力
├─ vite.config.ts       // Vite設定
├─ postcss.config.js    // PostCSS設定
└─ tailwind.config.js   // Tailwind CSS設定
```

## ドキュメント

詳細なドキュメントは `docs/` フォルダに整理されています：

- **開発ガイド**: `docs/QUICK_REFERENCE.md`
- **トラブルシューティング**: `docs/TROUBLESHOOTING.md`
- **開発ログ**: `docs/DEVELOPMENT_LOG.md`
- **バックログ**: `docs/BACKLOG.md`

## テストとツール

- **機能テスト**: `tests/` フォルダ内のHTMLファイルをブラウザで実行
- **バックログ更新**: `node scripts/update-backlog-date.js`
- **アイコン作成**: `tools/create-icons.html` をブラウザで開く

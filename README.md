# Pomodoro Buddy

Chrome拡張機能として動作するポモドーロタイマーです。25分の作業セッションと5分の休憩セッションを自動で管理し、生産性向上をサポートします。

## 機能

- 作業時間（25分）と休憩時間（5分）の自動切り替え
- 残り時間のバッジ表示
- セッション切り替え時の通知
- タイマーの開始/停止/リセット
- ブラウザ再起動後もタイマー状態の保持

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

### テスト

```bash
# テストの実行
pnpm test
```

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
- Vitest (テストフレームワーク)
- Chrome Extension Manifest V3

## プロジェクト構造

```
pomodoro-buddy/
├─ src/
│  ├─ background.ts      // タイマー制御（Service Worker）
│  ├─ popup/
│  │   ├─ popup.html     // ポップアップUI
│  │   ├─ popup.ts       // ポップアップのロジック
│  │   └─ popup.css      // Tailwind CSSスタイル
│  ├─ utils/
│  │   ├─ timer.ts       // タイマー計算ロジック
│  │   └─ timer.test.ts  // タイマーのユニットテスト
│  └─ types/
│      └─ index.d.ts     // 型定義
├─ public/
│  ├─ manifest.json      // 拡張機能マニフェスト
│  └─ icons/             // アイコン画像
├─ vite.config.ts        // Vite設定
├─ vitest.config.ts      // Vitest設定
└─ tailwind.config.js    // Tailwind CSS設定
```

# Pomodoro Buddy 環境構築ガイド

## 前提条件
- nvm-windowsがインストール済み
- Git Bashまたはコマンドプロンプトが使用可能

## 環境構築手順

### 1. nvm-windowsでNode.jsをセットアップ

```bash
# 利用可能なNode.jsバージョンを確認
nvm list available

# Node.js 18 LTSをインストール
nvm install 18.18.0

# インストールしたバージョンを使用
nvm use 18.18.0

# バージョン確認
node -v
npm -v
```

### 2. 自動環境構築スクリプトの実行

#### Windows環境の場合
```bash
# nvm-windows用スクリプトを実行
setup-nvm.bat
```

#### 手動で環境構築する場合

```bash
# 1. pnpmをグローバルインストール
npm install -g pnpm

# 2. 依存パッケージをインストール
pnpm install

# 3. プロジェクトをビルド
pnpm build
```

### 3. アイコンファイルの生成（必要な場合）

1. `create-icons.html` をブラウザで開く
2. 「アイコンをダウンロード」ボタンをクリック
3. ダウンロードしたアイコンファイルを `public/icons/` ディレクトリに配置

### 4. Chrome拡張機能のインストール

1. Chromeブラウザで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトの `dist` ディレクトリを選択
5. 拡張機能がツールバーに表示されることを確認

## トラブルシューティング

### nvm use コマンドが見つからない場合
- コマンドプロンプトを管理者権限で再起動
- nvm-windowsを再インストール

### ビルドエラーが発生する場合
```bash
# キャッシュをクリア
npm cache clean --force
pnpm store prune

# 依存関係を再インストール
rm -rf node_modules
pnpm install
```

### Chrome拡張機能が読み込めない場合
- manifest.jsonの構文エラーを確認
- distディレクトリが正しく生成されているか確認
- Chromeのデベロッパーツールでエラーログを確認

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# テスト実行
pnpm test

# 型チェック
pnpm type-check
``` 
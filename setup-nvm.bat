@echo off
echo ========================================
echo Pomodoro Buddy 環境構築スクリプト
echo ========================================

echo.
echo 1. Node.jsのバージョンを確認・設定しています...
nvm list
echo.

echo 2. Node.js 18 LTSをインストールします...
nvm install 18.18.0
nvm use 18.18.0

echo.
echo 3. Node.jsとnpmのバージョンを確認しています...
node -v
npm -v

echo.
echo 4. pnpmをグローバルにインストールしています...
npm install -g pnpm

echo.
echo 5. 依存パッケージをインストールしています...
pnpm install

echo.
echo 6. プロジェクトをビルドしています...
pnpm build

echo.
echo ========================================
echo 環境構築が完了しました！
echo ========================================
echo.
echo Chromeで拡張機能をインストールするには：
echo 1. chrome://extensions/ を開く
echo 2. デベロッパーモードを有効にする
echo 3. 「パッケージ化されていない拡張機能を読み込む」をクリック
echo 4. dist ディレクトリを選択
echo.

pause 
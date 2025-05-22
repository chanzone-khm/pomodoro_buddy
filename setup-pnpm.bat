@echo off
echo pnpmがインストールされているか確認しています...
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo pnpmがインストールされていません。インストールします...
    call npm install -g pnpm
)

echo 依存パッケージをインストールしています...
call pnpm install

echo Tailwind CSSを設定しています...
call pnpm exec tailwindcss init -p

echo プロジェクトをビルドしています...
call pnpm build

echo 環境構築が完了しました！
echo Chromeで拡張機能をインストールするには：
echo 1. chrome://extensions/ を開く
echo 2. デベロッパーモードを有効にする
echo 3. 「パッケージ化されていない拡張機能を読み込む」をクリック
echo 4. dist ディレクトリを選択

pause 
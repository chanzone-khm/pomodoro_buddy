@echo off
echo ========================================
echo Pomodoro Buddy 環境構築スクリプト (修正版)
echo ========================================

echo.
echo 1. Node.jsのバージョンを確認・設定しています...
nvm list
echo.

echo 2. Node.js 18 LTSをインストールします...
nvm install 18.18.0
nvm use 18.18.0

echo.
echo 3. 環境変数を更新しています...
call refreshenv
timeout /t 3 /nobreak >nul

echo.
echo 4. パスを手動で設定しています...
if exist "%NVM_SYMLINK%" (
    set "PATH=%NVM_SYMLINK%;%PATH%"
    echo パスが設定されました: %NVM_SYMLINK%
) else (
    echo 警告: NVM_SYMLINKが見つかりません
)

echo.
echo 5. Node.jsとnpmのバージョンを確認しています...
node -v
npm -v

echo.
echo 6. pnpmをグローバルにインストールしています...
npm install -g pnpm

echo.
echo 7. 依存パッケージをインストールしています...
pnpm install

echo.
echo 8. プロジェクトをビルドしています...
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
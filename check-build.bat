@echo off
echo ========================================
echo ポモドーロバディ - ビルドチェック
echo ========================================

cd "教育-勉強\cursor開発\pomodoro_buddy"

echo.
echo [1/3] TypeScriptエラーチェック中...
pnpm run type-check
if %errorlevel% neq 0 (
    echo ❌ TypeScriptエラーが発見されました
    pause
    exit /b 1
)
echo ✅ TypeScriptエラーなし

echo.
echo [2/3] ビルドテスト中...
pnpm build
if %errorlevel% neq 0 (
    echo ❌ ビルドエラーが発生しました
    pause
    exit /b 1
)
echo ✅ ビルド成功

echo.
echo [3/3] 出力ファイル確認中...
if exist "dist\background.js" (
    echo ✅ background.js 生成済み
) else (
    echo ❌ background.js が見つかりません
)

if exist "dist\src\popup\popup.html" (
    echo ✅ popup.html 生成済み
) else (
    echo ❌ popup.html が見つかりません
)

echo.
echo ========================================
echo 🎉 すべてのチェックが完了しました！
echo ========================================
pause

# トラブルシューティングガイド

## 🚨 開発中に遭遇した問題と解決策

### 1. Node.js環境構築エラー

#### 問題: `nvm use 16` でcommand not foundエラー
```bash
$ nvm use 16
bash: nvm: command not found
```

#### 原因
- nvm-windowsが正しくインストールされていない
- 環境変数が設定されていない
- PowerShellの実行権限問題

#### 解決策
```bash
# 1. nvm-windowsの再インストール
# https://github.com/coreybutler/nvm-windows/releases から最新版をダウンロード

# 2. 環境変数の手動設定
# システム環境変数に以下を追加:
# NVM_HOME: C:\Users\[username]\AppData\Roaming\nvm
# NVM_SYMLINK: C:\Program Files\nodejs
# PATH に %NVM_HOME% と %NVM_SYMLINK% を追加

# 3. PowerShellで実行権限設定
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 4. 新しいターミナルで確認
nvm version
nvm install 18.18.0
nvm use 18.18.0
```

### 2. TypeScriptコンパイルエラー

#### 問題: 未使用変数エラー
```typescript
error TS6133: 'sender' is declared but its value is never read.
error TS6133: 'payload' is declared but its value is never read.
```

#### 解決策
```typescript
// 未使用変数に _ プレフィックスを追加
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // ...
});

// または完全に削除
chrome.runtime.onMessage.addListener((message) => {
  // ...
});
```

#### 問題: 未使用インポートエラー
```typescript
error TS6133: 'resetTimer' is declared but its value is never read.
```

#### 解決策
```typescript
// 不要なインポートを削除
// Before
import { startTimer, pauseTimer, resetTimer, isTimerCompleted } from './utils/timer.js';

// After
import { startTimer, pauseTimer } from './utils/timer.js';
```

### 3. モジュール解決エラー

#### 問題: ESModulesインポートエラー
```typescript
error TS2307: Cannot find module './types/index' or its corresponding type declarations.
```

#### 解決策
```typescript
// インポートパスに .js 拡張子を明示的に追加
// Before
import { TimerState, SessionType } from './types/index';

// After
import { TimerState, SessionType } from './types/index.js';
```

#### 問題: 型定義ファイルの拡張子
```
src/types/index.d.ts が認識されない
```

#### 解決策
```bash
# .d.ts を .ts に変更
mv src/types/index.d.ts src/types/index.ts
```

### 4. Viteビルドエラー

#### 問題: terser not foundエラー
```bash
error: Could not resolve "terser"
```

#### 解決策
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // Before
    minify: 'terser',
    
    // After
    minify: true,
  }
});
```

### 5. Chrome拡張機能読み込みエラー

#### 問題: popup.htmlが見つからない
```
Could not load popup 'popup.html' for extension.
```

#### 原因
- manifest.jsonのdefault_popupパスが間違っている
- Viteビルド時のファイル出力先が期待と異なる

#### 解決策

**manifest.json修正**
```json
{
  "action": {
    "default_popup": "popup.html"
  }
}
```

**vite.config.ts修正**
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'popup.html') {
            return 'popup.html';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
```

### 6. アイコンファイル不足エラー

#### 問題: アイコンファイルが見つからない
```
Could not load icon 'icons/icon16.png' specified in 'icons'.
```

#### 解決策
```bash
# アイコンファイルを作成
mkdir -p public/icons

# 各サイズのアイコンファイルを配置
# icon16.png, icon32.png, icon48.png, icon128.png
```

### 7. パッケージマネージャー関連

#### 問題: pnpmが認識されない
```bash
bash: pnpm: command not found
```

#### 解決策
```bash
# npmでpnpmをグローバルインストール
npm install -g pnpm

# または
corepack enable
corepack prepare pnpm@latest --activate
```

## 🔧 デバッグ手順

### 1. ビルドエラーの確認
```bash
# TypeScriptコンパイルチェック
npx tsc --noEmit

# Viteビルド
pnpm build

# 詳細ログ付きビルド
pnpm build --debug
```

### 2. Chrome拡張機能のデバッグ
```bash
# 1. chrome://extensions/ を開く
# 2. デベロッパーモードを有効化
# 3. 拡張機能の「詳細」→「拡張機能のエラー」を確認
# 4. バックグラウンドページの「検証」でDevToolsを開く
```

### 3. ファイル構造の確認
```bash
# ビルド出力の確認
ls -la dist/

# 期待されるファイル構造
dist/
├── background.js
├── popup.js
├── popup.css
├── popup.html
├── timer.js
├── manifest.json
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## 📝 予防策

### 1. 開発環境の統一
```bash
# .nvmrc ファイルでNode.jsバージョンを固定
echo "18.18.0" > .nvmrc

# package.json でエンジンバージョンを指定
{
  "engines": {
    "node": ">=18.18.0",
    "pnpm": ">=8.0.0"
  }
}
```

### 2. TypeScript設定の最適化
```json
// tsconfig.json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 3. Linting設定
```bash
# ESLintとPrettierの設定
pnpm add -D eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

## 🚀 今後の改善点

### 1. 自動化
- [ ] pre-commitフックでlinting
- [ ] GitHub Actionsでビルドテスト
- [ ] 自動バージョニング

### 2. 開発体験向上
- [ ] ホットリロード対応
- [ ] 開発用manifest.json
- [ ] テスト環境構築

### 3. エラーハンドリング
- [ ] より詳細なエラーメッセージ
- [ ] ログ出力の改善
- [ ] ユーザーフレンドリーなエラー表示

---

*このガイドは実際に遭遇した問題を基に作成されており、同様の問題に直面した際の参考資料として活用してください。* 
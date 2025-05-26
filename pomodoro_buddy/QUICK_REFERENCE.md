# クイックリファレンス

## 🚀 よく使うコマンド

### Node.js環境管理
```bash
# Node.jsバージョン確認
node --version
npm --version

# nvmでバージョン管理
nvm list                    # インストール済みバージョン一覧
nvm install 18.18.0        # Node.js 18.18.0をインストール
nvm use 18.18.0            # Node.js 18.18.0を使用
nvm current                # 現在使用中のバージョン確認
```

### パッケージ管理（pnpm）
```bash
# pnpmインストール
npm install -g pnpm
corepack enable
corepack prepare pnpm@latest --activate

# プロジェクト操作
pnpm install               # 依存関係インストール
pnpm add <package>         # パッケージ追加
pnpm add -D <package>      # 開発依存関係追加
pnpm remove <package>      # パッケージ削除
pnpm update                # パッケージ更新
```

### 開発・ビルド
```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# TypeScriptコンパイルチェック
npx tsc --noEmit

# 詳細ログ付きビルド
pnpm build --debug

# ビルド出力確認
ls -la dist/
```

### Git操作
```bash
# 基本操作
git status                 # 状態確認
git add .                  # 全ファイルステージング
git commit -m "message"    # コミット
git push origin main       # プッシュ

# ブランチ操作
git branch                 # ブランチ一覧
git checkout -b feature    # 新ブランチ作成・切り替え
git merge feature          # ブランチマージ
```

## 📁 重要なファイルパス

### プロジェクト構造
```
pomodoro_buddy/
├── src/
│   ├── background.ts      # Service Worker
│   ├── types/index.ts     # 型定義
│   ├── utils/timer.ts     # タイマーロジック
│   └── popup/             # ポップアップUI
│       ├── popup.html
│       ├── popup.css
│       └── popup.ts
├── public/
│   ├── manifest.json      # Chrome拡張機能マニフェスト
│   └── icons/             # アイコンファイル
├── dist/                  # ビルド出力
└── 設定ファイル群
```

### 設定ファイル
- `package.json` - プロジェクト設定・依存関係
- `tsconfig.json` - TypeScript設定
- `vite.config.ts` - Viteビルド設定
- `tailwind.config.js` - Tailwind CSS設定
- `postcss.config.js` - PostCSS設定

## ⚙️ 重要な設定

### TypeScript設定（tsconfig.json）
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Vite設定（vite.config.ts）
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        popup: 'src/popup/popup.ts',
        timer: 'src/utils/timer.ts'
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'popup.html') {
            return 'popup.html';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    minify: true
  }
});
```

### Chrome拡張機能マニフェスト（manifest.json）
```json
{
  "manifest_version": 3,
  "name": "Pomodoro Buddy",
  "version": "1.0.0",
  "description": "ポモドーロテクニック用タイマー",
  "permissions": ["storage", "notifications", "alarms"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Pomodoro Buddy"
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## 🔧 トラブルシューティング

### よくあるエラーと解決法

#### 1. `nvm: command not found`
```bash
# 環境変数を確認・設定
echo $NVM_HOME
export NVM_HOME="$HOME/.nvm"
source ~/.bashrc
```

#### 2. `pnpm: command not found`
```bash
npm install -g pnpm
# または
corepack enable
```

#### 3. TypeScriptコンパイルエラー
```bash
# 未使用変数エラー
# 変数名に _ プレフィックスを追加
const _unusedVar = value;

# インポートパスエラー
# .js 拡張子を明示的に追加
import { func } from './module.js';
```

#### 4. Chrome拡張機能読み込みエラー
```bash
# ビルド後のファイル構造確認
ls -la dist/

# 必要ファイル:
# - manifest.json
# - popup.html
# - background.js
# - popup.js
# - icons/
```

## 🎯 Chrome拡張機能開発

### インストール手順
1. `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」
4. `dist` フォルダを選択

### デバッグ方法
```bash
# 1. 拡張機能管理画面で「詳細」をクリック
# 2. 「拡張機能のエラー」を確認
# 3. 「Service Worker」の「検証」でDevToolsを開く
# 4. Console、Network、Storageタブで確認
```

### 権限設定
```json
{
  "permissions": [
    "storage",      // chrome.storage API
    "notifications", // chrome.notifications API
    "alarms"        // chrome.alarms API
  ]
}
```

## 📦 依存関係

### 主要パッケージ
```json
{
  "devDependencies": {
    "@types/chrome": "^0.0.254",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  }
}
```

### パッケージの役割
- `@types/chrome` - Chrome拡張機能API型定義
- `typescript` - TypeScriptコンパイラ
- `vite` - ビルドツール
- `tailwindcss` - CSSフレームワーク
- `postcss` - CSS後処理
- `autoprefixer` - ベンダープレフィックス自動追加

## 🌐 参考リンク

### 公式ドキュメント
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)

### ツール
- [nvm-windows](https://github.com/coreybutler/nvm-windows)
- [pnpm](https://pnpm.io/)
- [Chrome Web Store](https://chrome.google.com/webstore/category/extensions)

---

*このリファレンスは開発中によく使用するコマンドや設定をまとめたものです。ブックマークして活用してください。* 
# 🔧 ビルドエラー防止ルール

## 📋 必須チェックプロセス

### 🚀 コード変更時の必須手順

#### 1. ファイル変更後の即座チェック
```bash
# TypeScriptエラーチェック
pnpm run type-check

# ビルドテスト
pnpm build
```

#### 2. 未使用インポートの確認
- **問題**: 未使用のインポートがTypeScriptエラーを引き起こす
- **チェック方法**: 
  - VSCodeの警告表示を確認
  - `pnpm run type-check`でエラー確認
- **修正**: 未使用インポートを削除

#### 3. インポートパスの確認
- **問題**: 相対パス、拡張子の不整合
- **ルール**: 
  - `.js`拡張子を使用（TypeScript設定による）
  - 相対パスの正確性確認

---

## 🔍 具体的チェックポイント

### TypeScriptエラーの主要原因

#### ❌ 未使用インポート
```typescript
// NG: 使用していないインポート
import { unusedFunction } from './utils.js';

// OK: 使用するもののみインポート
import { usedFunction } from './utils.js';
```

#### ❌ 型エラー
```typescript
// NG: 型の不整合
const value: string = 123;

// OK: 正しい型
const value: string = "123";
```

#### ❌ 存在しないプロパティ・メソッド
```typescript
// NG: 存在しないメソッド
someObject.nonExistentMethod();

// OK: 存在確認後の使用
if ('method' in someObject) {
  someObject.method();
}
```

---

## 🛠️ 自動化ルール

### package.jsonスクリプト追加
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "pre-build": "pnpm run type-check && pnpm run lint",
    "build": "pnpm run pre-build && vite build"
  }
}
```

### VSCode設定（推奨）
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.autoImports": false,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.removeUnusedImports": true
  }
}
```

---

## 📝 変更時チェックリスト

### ✅ ファイル変更後の必須確認

1. **[ ] TypeScriptエラーなし**
   ```bash
   pnpm run type-check
   ```

2. **[ ] ビルド成功**
   ```bash
   pnpm build
   ```

3. **[ ] 未使用インポートなし**
   - VSCodeの警告確認
   - 灰色表示のインポートを削除

4. **[ ] 新しい依存関係の確認**
   - 新しいインポートが正しく解決されるか
   - 循環依存がないか

5. **[ ] 型定義の整合性**
   - 新しい型が正しく定義されているか
   - 既存の型との互換性

---

## 🚨 緊急時の対処法

### ビルドエラーが発生した場合

#### Step 1: エラーメッセージの確認
```bash
pnpm build 2>&1 | tee build-error.log
```

#### Step 2: 最近の変更を確認
```bash
git diff HEAD~1
```

#### Step 3: 段階的な修正
1. 未使用インポートの削除
2. 型エラーの修正
3. パスエラーの修正

#### Step 4: 部分的なビルドテスト
```bash
# 特定ファイルのみチェック
npx tsc --noEmit src/specific-file.ts
```

---

## 🔄 継続的改善

### 定期的なメンテナンス

#### 週次チェック
- [ ] 全ファイルの型チェック
- [ ] 未使用コードの削除
- [ ] 依存関係の更新確認

#### 月次チェック
- [ ] TypeScript設定の見直し
- [ ] ビルド設定の最適化
- [ ] パフォーマンス確認

---

## 📚 参考資料

### TypeScriptエラーの解決方法
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite TypeScript Guide](https://vitejs.dev/guide/features.html#typescript)

### Chrome拡張機能特有の注意点
- Service Workerでの型定義
- Manifest V3の制限事項
- オフスクリーンドキュメントの型

---

*このルールは継続的に更新され、新しいエラーパターンが発見された場合は追加されます。* 
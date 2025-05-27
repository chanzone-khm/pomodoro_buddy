# 📅 日付取得・バックログ管理ユーティリティ

バックログに記入する日付を正確に取得・管理するためのユーティリティ集です。

## 🎯 概要

このユーティリティは以下の問題を解決します：
- バックログに記入した日付が正確でない
- 複数のソースから信頼できる日付情報を取得したい
- 外部APIやターミナルから日付を取得したい
- バックログの日付を自動で更新したい

## 📁 ファイル構成

```
├── src/utils/
│   ├── date.ts           # 日付取得ユーティリティ
│   └── backlog.ts        # バックログ管理ユーティリティ
├── test-date.html        # ブラウザでの日付取得テスト
├── update-backlog-date.js # Node.jsでのバックログ更新スクリプト
└── DATE_UTILS_README.md  # このファイル
```

## 🚀 使用方法

### 1. ブラウザでの日付取得テスト

```bash
# 開発サーバーを起動
pnpm dev

# ブラウザで以下にアクセス
http://localhost:5173/test-date.html
```

テストページでは以下の機能をテストできます：
- ローカル日付取得
- 外部API日付取得（World Time API）
- 信頼できる日付取得（複数ソース比較）
- バックログ用日付文字列生成
- バックログ完了記録

### 2. Node.jsスクリプトでの日付取得・更新

```bash
# 現在の日付情報を表示
node update-backlog-date.js

# または
node update-backlog-date.js show

# バックログアイテムの完了日を更新
node update-backlog-date.js update PBI-001

# バックログアイテムの開始日を更新
node update-backlog-date.js start PBI-002
```

### 3. プログラムでの使用

```typescript
import { 
  getCurrentDateInfo, 
  getExternalDateInfo, 
  getReliableDateInfo, 
  getBacklogDateString 
} from './src/utils/date.js';

import { 
  recordBacklogCompletion,
  completeBacklogItem 
} from './src/utils/backlog.js';

// ローカル日付を取得
const localDate = getCurrentDateInfo();
console.log('ローカル日付:', localDate.datetime);

// 外部APIから日付を取得
const externalDate = await getExternalDateInfo();
console.log('外部API日付:', externalDate?.datetime);

// 最も信頼できる日付を取得
const reliableDate = await getReliableDateInfo();
console.log('信頼できる日付:', reliableDate.datetime);

// バックログ用の日付文字列を生成
const backlogDate = await getBacklogDateString();
console.log('バックログ用:', backlogDate); // 例: "2025-05-27（火曜日）"

// バックログアイテムの完了を記録
const completion = await recordBacklogCompletion(
  'PBI-001',
  'アラーム音機能',
  'アラーム音の実装完了'
);
console.log(completion);
```

## 🔧 機能詳細

### 日付取得方法

1. **ローカル日付取得** (`getCurrentDateInfo()`)
   - ブラウザ/Node.jsのローカル時刻を使用
   - 最も高速だが、システム時刻に依存

2. **外部API日付取得** (`getExternalDateInfo()`)
   - World Time APIから正確な時刻を取得
   - ネットワーク接続が必要
   - より正確だが、レスポンス時間がかかる

3. **信頼できる日付取得** (`getReliableDateInfo()`)
   - ローカルと外部APIの両方を取得
   - 1分以内の差なら外部APIを採用
   - 差が大きい場合やAPI失敗時はローカルを使用

### バックログ管理機能

- **自動日付更新**: バックログファイルの日付を自動更新
- **完了記録**: Chrome拡張機能のストレージに完了履歴を保存
- **日付フォーマット**: 日本語形式での日付表示

## 📊 日付フォーマット

```typescript
// 取得される日付情報の例
{
  date: "2025-05-27",           // YYYY-MM-DD形式
  time: "14:30:15",             // HH:MM:SS形式
  datetime: "2025-05-27 14:30:15", // 日時結合
  timestamp: 1716789015000,     // エポックミリ秒
  timezone: "Asia/Tokyo",       // タイムゾーン
  weekday: "火曜日"             // 日本語曜日
}

// バックログ用日付文字列
"2025-05-27（火曜日）"
```

## 🌐 外部API仕様

### World Time API
- **エンドポイント**: `https://worldtimeapi.org/api/timezone/Asia/Tokyo`
- **レスポンス例**:
```json
{
  "datetime": "2025-05-27T14:30:15.123456+09:00",
  "timezone": "Asia/Tokyo",
  "utc_datetime": "2025-05-27T05:30:15.123456+00:00",
  "utc_offset": "+09:00",
  "day_of_week": 2,
  "day_of_year": 147,
  "week_number": 22
}
```

## 🔍 トラブルシューティング

### よくある問題

1. **外部API接続エラー**
   ```
   外部API日付取得エラー: TypeError: fetch failed
   ```
   - ネットワーク接続を確認
   - ファイアウォール設定を確認
   - ローカル日付が自動的に使用されます

2. **バックログファイル更新エラー**
   ```
   バックログファイル更新エラー: ENOENT: no such file or directory
   ```
   - `pomodoro_buddy/BACKLOG.md`ファイルの存在を確認
   - ファイルパスが正しいか確認

3. **モジュールインポートエラー**
   ```
   Cannot resolve module './src/utils/date.js'
   ```
   - ファイルパスに`.js`拡張子が含まれているか確認
   - TypeScriptの場合でもインポート時は`.js`を使用

### デバッグ方法

```typescript
// デバッグ用ログ出力
import { logCurrentDateInfo } from './src/utils/backlog.js';

await logCurrentDateInfo();
```

## 📝 使用例

### バックログアイテム完了時の処理

```typescript
// PBI-001を完了状態に更新
const completionRecord = await completeBacklogItem(
  'PBI-001',
  'アラーム音機能の実装完了'
);

console.log('完了記録:', completionRecord);

// バックログファイルも自動更新
// - **完了日**: 2025-05-27（火曜日）
```

### 日付の妥当性チェック

```typescript
import { validateDate } from './src/utils/date.js';

const isValid = validateDate('2025-05-27');
console.log('日付妥当性:', isValid); // true
```

## 🎯 今後の拡張予定

- [ ] 複数タイムゾーンサポート
- [ ] 日付フォーマットのカスタマイズ
- [ ] バックログテンプレート機能
- [ ] 自動コミット機能
- [ ] 統計・レポート機能

## 📚 参考資料

- [World Time API](https://worldtimeapi.org/)
- [JavaScript Date API](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

---

**作成日**: 2025-05-27（火曜日）  
**更新日**: 自動更新機能により常に最新 
# スクリプト

このフォルダには、Pomodoro Buddyの開発・運用で使用するスクリプトが含まれています。

## ファイル一覧

- `update-backlog-date.js` - バックログ日付更新スクリプト

## update-backlog-date.js の使用方法

### 日付情報の表示
```bash
node scripts/update-backlog-date.js show
```

### バックログアイテムの完了日更新
```bash
node scripts/update-backlog-date.js update <PBI-ID>
```

### バックログアイテムの開始日更新
```bash
node scripts/update-backlog-date.js start <PBI-ID>
```

## 機能

- 外部API（World Time API）からの正確な日付取得
- フォールバック機能（API失敗時はローカル日付使用）
- バックログMarkdownファイルの自動更新
- エラーハンドリングと詳細ログ出力

## 前提条件

- Node.js 16.0以降
- インターネット接続（外部API使用時）

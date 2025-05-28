# 開発ツール

このフォルダには、Pomodoro Buddyの開発で使用するツールが含まれています。

## ファイル一覧

- `create-icons.html` - Chrome拡張機能用アイコン作成ツール

## create-icons.html の使用方法

1. HTMLファイルをブラウザで開く
2. Canvas上でアイコンをデザイン
3. 「Generate Icons」ボタンでアイコンを生成
4. 生成されたアイコンファイルをダウンロード

## 機能

- リアルタイムアイコンプレビュー
- 複数サイズ（16x16, 48x48, 128x128）対応
- PNG形式での出力
- Chrome拡張機能のmanifest.json向けアイコン生成

## 注意事項

- モダンなブラウザ（Canvas APIサポート）が必要です
- 生成されたアイコンは `public/` フォルダに配置してください

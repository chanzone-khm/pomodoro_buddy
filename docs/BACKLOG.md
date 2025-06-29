# プロダクトバックログ

## 🎯 スプリント計画

### 優先順位の考え方
1. **High**: ユーザー体験に直接影響する基本機能
2. **Medium**: 利便性を向上させる機能
3. **Low**: 高度な機能や将来的な拡張

---

## 🎯 現在のスプリント（スプリント 3）

### 📋 スプリント目標
- タスク管理機能の実装
- UIの改善とモダン化
- ユーザビリティの向上

### 🔄 進行中のPBI

#### **PBI-005: タスク設定機能** - 5ポイント
**ステータス**: ✅ 完了
**担当者**: 開発チーム
**開始日**: 2024年12月26日
**完了日**: 2024年12月26日

**説明**: 各作業ごとのタスクを設定できる機能を追加

**受け入れ条件**:
- [x] タスク名の入力・編集
- [x] タスクの説明（オプション）
- [x] 予想ポモドーロ数の設定
- [x] タスクの開始・完了・削除
- [x] 現在のタスクの表示
- [x] タスクリストの表示
- [x] タスク統計の表示
- [x] ポモドーロ完了時のタスク連携
- [x] ポップアップUIの統合
- [x] 最終テストと調整

**実装済み**:
- ✅ タスク管理の型定義（Task, TaskStatus, TaskSettings）
- ✅ タスク管理ユーティリティ（tasks.ts）
- ✅ ポップアップHTMLにタスク管理UI追加
- ✅ タスクモーダルダイアログ
- ✅ タスク管理用CSSスタイル
- ✅ バックグラウンドスクリプトとの連携
- ✅ テストページ（test-tasks.html）作成
- ✅ ポップアップTypeScriptの統合
- ✅ ビルドエラー修正完了

**技術的詳細**:
- Chrome Storage API使用
- タスクID自動生成
- ポモドーロ数自動カウント
- タスク状態管理（待機中/進行中/完了）

**残作業**:
- ポップアップのリンターエラー修正
- 機能テストと調整
- ドキュメント更新

## 📋 バックログアイテム

### 🔥 Priority: High

#### ✅ DONE - PBI-001: アラーム音機能
- **説明**: タスク完了時と休憩完了時に異なるアラーム音を再生
- **受け入れ条件**:
  - [x] 25分タスク完了時のアラーム音
  - [x] 5分休憩完了時のアラーム音（異なる音）
  - [x] デフォルトでは音を鳴らさない
  - [x] オプションで音を有効/無効にできる
- **見積もり**: 3ポイント
- **完了日**: 2025年5月26日
- **実装内容**: 音声ファイル管理、Web Audio API、設定UI、Chrome拡張機能権限設定

#### ✅ DONE - PBI-002: プログレスバー表示
- **説明**: 現在のセッションの進行状況を視覚的に表示
- **受け入れ条件**:
  - [x] 円形プログレスバーまたはリニアプログレスバー
  - [x] 残り時間に応じてリアルタイム更新
  - [x] 作業セッションと休憩セッションで色分け
- **見積もり**: 2ポイント
- **完了日**: 2025年1月26日
- **実装内容**: プログレスバーユーティリティ、円形・リニア両対応、設定UI、リアルタイム更新機能

#### ✅ DONE - PBI-003: 繰り返し回数設定
- **説明**: ポモドーロサイクルの繰り返し回数を設定可能にする
- **受け入れ条件**:
  - [x] 繰り返し回数を1-10回で設定可能
  - [x] 現在の進行状況を表示（例: 3/5回目）
  - [x] 設定した回数完了時に通知
- **見積もり**: 3ポイント
- **実装内容**: サイクル管理ユーティリティ、進行状況表示、設定UI、通知機能、テスト用HTMLページ

### 🔶 Priority: Medium

#### ✅ DONE - PBI-004: 長い休憩機能
- **説明**: 特定の繰り返し回数ごとに長い休憩を設定
- **受け入れ条件**:
  - [x] デフォルト15分の長い休憩
  - [x] 4回ごとに長い休憩（設定可能）
  - [x] 長い休憩の時間を設定可能（10-30分）
- **見積もり**: 4ポイント
- **完了日**: 2024年12月19日
- **実装内容**: 長い休憩時間範囲拡張（10-30分）、長い休憩間隔拡張（2-8回ごと）、統計計算改善、テスト用HTMLページ

#### 📅 TODO - PBI-005: タスク設定機能
- **説明**: 各ポモドーロサイクルにタスク名を設定
- **受け入れ条件**:
  - [x] タスク名の入力・編集
  - [x] タスクの説明（オプション）
  - [x] 予想ポモドーロ数の設定
  - [x] タスクの開始・完了・削除
  - [x] 現在のタスクの表示
  - [x] タスクリストの表示
  - [x] タスク統計の表示
  - [x] ポモドーロ完了時のタスク連携
  - [ ] ポップアップUIの統合（リンターエラー修正中）
  - [ ] 最終テストと調整
- **見積もり**: 5ポイント

#### 📅 TODO - PBI-006: 新しいタブで開く機能
- **説明**: オプションで新しいタブでタイマーを表示
- **受け入れ条件**:
  - [ ] 設定でタブ表示モードを選択可能
  - [ ] 新しいタブでフルスクリーンタイマー表示
  - [ ] ポップアップとタブ表示の切り替え
- **見積もり**: 3ポイント

### 🔷 Priority: Low

#### 📅 TODO - PBI-007: 常に前面表示機能
- **説明**: オプションでタイマーを常に前面に表示
- **受け入れ条件**:
  - [ ] 設定で常に前面表示を有効/無効
  - [ ] 他のウィンドウより前面に表示
  - [ ] 最小化・復元機能
- **見積もり**: 4ポイント
- **注意**: Chrome拡張機能の制限により実装困難な可能性あり

#### 📅 TODO - PBI-008: サイクル別タスク設定
- **説明**: 開始前に各サイクルのタスクを事前設定
- **受け入れ条件**:
  - [ ] セッション開始前にタスク計画画面
  - [ ] 各サイクルにタスクを割り当て
  - [ ] タスクテンプレートの保存・読み込み
- **見積もり**: 6ポイント

#### ✅ DONE - PBI-009: 時間設定機能
- **説明**: 休憩時間、タスク時間を任意に設定できる（デバッグモード対応）
- **受け入れ条件**:
  - [x] 作業時間を5-60分で設定可能
  - [x] 短い休憩時間を1-30分で設定可能
  - [x] 長い休憩時間を5-60分で設定可能
  - [x] デバッグモード（秒単位設定）でテスト効率化
- **見積もり**: 3ポイント
- **完了日**: 2025年1月26日
- **実装内容**: 時間設定ユーティリティ、デバッグモード、設定UI、バックグラウンド連携、テスト用HTMLページ

#### 📅 TODO - PBI-010: UI改善（円形プログレスバー配置）
- **説明**: 円形プログレスバーを時刻の周りに配置
- **受け入れ条件**:
  - [ ] タイマー表示の周りに円形プログレスバーを配置
  - [ ] 時刻表示とプログレスバーの統合デザイン
  - [ ] レスポンシブ対応
- **見積もり**: 2ポイント

#### 📅 TODO - PBI-011: 設定UI改善
- **説明**: 設定は画面の右上に歯車マークだけで配置
- **受け入れ条件**:
  - [ ] 右上に歯車アイコンのみ表示
  - [ ] クリックで設定パネルを展開
  - [ ] コンパクトで直感的なUI
- **見積もり**: 2ポイント

#### 📅 TODO - PBI-012: タスク設定機能（詳細版）
- **説明**: 各作業セッションごとにタスクを設定できる機能
- **受け入れ条件**:
  - [x] 作業開始前にタスク名を入力可能
  - [x] 現在のタスクをポップアップに表示
  - [x] タスク履歴の保存と表示
  - [x] タスクの編集・削除機能
  - [ ] ポップアップUIの統合（リンターエラー修正中）
  - [ ] 最終テストと調整
- **見積もり**: 5ポイント

#### 📅 TODO - PBI-013: UI モダン化
- **説明**: UIをより現代的でユーザーフレンドリーなデザインに改善
- **受け入れ条件**:
  - [ ] モダンなデザインシステムの採用
  - [ ] アニメーションとトランジション効果
  - [ ] より直感的なユーザーインターフェース
  - [ ] アクセシビリティの向上
- **見積もり**: 4ポイント

#### 📅 TODO - PBI-014: 設定UI配置改善
- **説明**: 設定を歯車アイコンのみにし、画面の右上または右下に配置
- **受け入れ条件**:
  - [ ] 歯車アイコンを右上または右下に配置
  - [ ] UIレイアウトを考慮した最適な位置決定
  - [ ] アイコンクリックで設定パネル展開
  - [ ] コンパクトで邪魔にならないデザイン
- **見積もり**: 2ポイント

#### 📅 TODO - PBI-015: ダークモード対応
- **説明**: ダークモードとライトモードの切り替え機能
- **受け入れ条件**:
  - [ ] ダークモード/ライトモードの切り替えボタン
  - [ ] システム設定に応じた自動切り替え
  - [ ] 全画面でのダークモード対応
  - [ ] 設定の永続化
- **見積もり**: 3ポイント

#### 📅 TODO - PBI-016: 多言語対応（英語）
- **説明**: 英語での表示に対応し、国際的なユーザーに対応
- **受け入れ条件**:
  - [ ] 日本語/英語の言語切り替え機能
  - [ ] 全てのUI要素の英語翻訳
  - [ ] ブラウザの言語設定に応じた自動選択
  - [ ] 言語設定の永続化
- **見積もり**: 4ポイント

---

## 📊 スプリント状況

### 現在のスプリント
- **期間**: 2024年12月 - 2025年1月
- **目標**: アラーム音機能とプログレスバー実装
- **完了**: 2/2 アイテム ✅
- **PBI-001完了**: ✅ アラーム音機能実装完了（2024年12月26日）
- **PBI-002完了**: ✅ プログレスバー表示実装完了（2025年1月26日）

### 次のスプリント計画
1. PBI-005: タスク設定機能
2. PBI-013: UI モダン化
3. PBI-014: 設定UI配置改善
4. PBI-015: ダークモード対応

### 将来のスプリント候補
- PBI-006: 新しいタブで開く機能
- PBI-016: 多言語対応（英語）
- PBI-010: UI改善（円形プログレスバー配置）
- PBI-012: タスク設定機能（詳細版）

---

## 🔄 完了済みアイテム

### ✅ PBI-001: アラーム音機能 (完了)
- **完了日**: 2024年12月
- **実装内容**:
  - アラーム音ファイルの追加
  - 設定画面でのオン/オフ切り替え
  - 作業完了音と休憩完了音の差別化
  - chrome.storage.syncでの設定保存

### ✅ PBI-002: プログレスバー表示 (完了)
- **完了日**: 2025年1月26日
- **実装内容**:
  - 円形・リニアプログレスバーの実装
  - リアルタイム進行状況更新
  - 作業/休憩セッションの色分け
  - 設定UI（形式選択、パーセンテージ表示）
  - プログレスバーユーティリティ関数
  - テスト用HTMLページ

### ✅ PBI-003: 繰り返し回数設定 (完了)
- **実装内容**:
  - サイクル管理ユーティリティ（1-10回設定可能）
  - 進行状況表示（現在のサイクル/総サイクル）
  - 長い休憩間隔設定（2-5回ごと）
  - サイクルリセット機能
  - 完了時通知メッセージ
  - 設定の永続化（Chrome Storage）
  - テスト用HTMLページ

### ✅ PBI-009: 時間設定機能 (完了)
- **実装内容**:
  - 時間設定ユーティリティ（作業・短い休憩・長い休憩）
  - デバッグモード（秒単位設定でテスト効率化）
  - 通常モード（分単位設定で実用）
  - 時間統計計算機能
  - 設定UI（ポップアップ内）
  - バックグラウンドスクリプト連携
  - 設定の永続化（Chrome Storage）
  - テスト用HTMLページ（test-time-settings.html）

### ✅ PBI-004: 長い休憩機能 (完了)
- **完了日**: 2024年12月19日
- **実装内容**:
  - 長い休憩時間の範囲を10-30分に拡張
  - 長い休憩間隔を2-8回ごとに拡張
  - 時間統計計算の改善（動的な長い休憩間隔対応）
  - ポップアップUIの改善（選択肢拡張）
  - 長い休憩間隔設定オプションの追加
  - テスト用HTMLページ（test-long-break-feature.html）
  - 設定の永続化とバリデーション強化

---

## 📝 技術的考慮事項

### Chrome拡張機能の制限
- **常に前面表示**: Chrome拡張機能では技術的に困難
- **音声ファイル**: publicフォルダに配置してmanifest.jsonで権限設定
- **新しいタブ**: chrome.tabs APIの使用が必要

### テスト戦略
- 各PBIに対してユニットテストとE2Eテストを作成
- Vitestを使用したテスト環境
- Chrome拡張機能のテスト用モック

### パフォーマンス考慮
- プログレスバーのアニメーション最適化
- ストレージアクセスの最小化
- メモリリークの防止

---

*このバックログは継続的に更新され、完了したアイテムは適宜アーカイブされます。*

/**
 * セッションタイプの列挙型
 */
export enum SessionType {
  Work = 'work',
  Break = 'break'
}

/**
 * タイマーの状態を表すインターフェース
 */
export interface TimerState {
  type: SessionType; // 現在のセッションタイプ
  startEpoch: number; // 開始時刻（エポックミリ秒）
  durationSec: number; // セッション時間（秒）
  isRunning: boolean; // タイマーが実行中かどうか
  pausedAt?: number; // 一時停止した時刻（エポックミリ秒）
  pausedElapsed?: number; // 一時停止までの経過時間（ミリ秒）
}

/**
 * タイマーの設定を表すインターフェース
 */
export interface TimerSettings {
  workDurationSec: number; // 作業セッションの時間（秒）
  breakDurationSec: number; // 休憩セッションの時間（秒）
  soundEnabled: boolean; // アラーム音を有効にするかどうか
  workCompleteSound: string; // 作業完了音のファイルパス
  breakCompleteSound: string; // 休憩完了音のファイルパス
  dailySlots: number; // 1日のポモドーロスロット数（デフォルト6）
}

/**
 * タイマーの通知メッセージを表すインターフェース
 */
export interface TimerNotification {
  title: string;
  message: string;
  iconUrl: string;
}

/**
 * メッセージングのアクション型
 */
export enum MessageAction {
  START = 'start',
  STOP = 'stop',
  RESET = 'reset',
  GET_STATE = 'getState',
  UPDATE_BADGE = 'updateBadge',
  PLAY_SOUND = 'playSound',
  UPDATE_SETTINGS = 'updateSettings',
  COMPLETE_CURRENT_SLOT = 'completeCurrentSlot',
  GET_CURRENT_TASK_INFO = 'getCurrentTaskInfo'
}

/**
 * メッセージの型定義
 */
export interface Message {
  action: MessageAction;
  payload?: any;
}

/**
 * タスクの状態を表す列挙型
 */
export enum TaskStatus {
  Backlog = 'backlog',    // バックログ（未着手）
  Doing = 'doing',        // 実行中
  Done = 'done'           // 完了
}

/**
 * リピートタスクの種類
 */
export enum RepeatType {
  None = 'none',
  Daily = 'daily',
  Weekly = 'weekly'
}

/**
 * タスクを表すインターフェース
 */
export interface Task {
  id: string; // タスクの一意識別子
  name: string; // タスク名
  description?: string; // タスクの説明（オプション）
  status: TaskStatus; // タスクの状態
  createdAt: number; // 作成日時（エポックミリ秒）
  startedAt?: number; // 開始日時（エポックミリ秒）
  completedAt?: number; // 完了日時（エポックミリ秒）
  actualPomodoros: number; // このタスクで完了したポモドーロ数
  estimatePomodoros: number; // 予想ポモドーロ数（デフォルト1）
  repeatType: RepeatType; // リピートタスク設定
  tags?: string[]; // タグ（オプション）
}

/**
 * ポモドーロスロットを表すインターフェース
 */
export interface PomodoroSlot {
  id: string; // スロットの一意識別子
  taskId?: string; // 割り当てられたタスクID（空の場合はundefined）
  completed: boolean; // このスロットが完了したかどうか
  completedAt?: number; // 完了時刻（エポックミリ秒）
  order: number; // スロットの順序（0から開始）
}

/**
 * 1日のポモドーロ計画を表すインターフェース
 */
export interface DayPlan {
  date: string; // 日付（YYYY-MM-DD形式）
  slots: PomodoroSlot[]; // ポモドーロスロットの配列
  createdAt: number; // 作成日時（エポックミリ秒）
  updatedAt: number; // 更新日時（エポックミリ秒）
}

/**
 * タスクリストの設定を表すインターフェース
 */
export interface TaskSettings {
  currentTaskId?: string; // 現在実行中のタスクID
  currentSlotId?: string; // 現在アクティブなスロットID
  autoStartNextTask: boolean; // 次のタスクを自動開始するか
  showTaskInPopup: boolean; // ポップアップにタスク名を表示するか
  kanbanView: boolean; // カンバンビューを有効にするか（デフォルトtrue）
}

/**
 * 統計データを表すインターフェース
 */
export interface Statistics {
  date: string; // 日付（YYYY-MM-DD形式）
  plannedPomodoros: number; // 計画ポモドーロ数
  completedPomodoros: number; // 完了ポモドーロ数
  completedTasks: number; // 完了タスク数
  totalTasks: number; // 総タスク数
}

/**
 * ストレージのキー
 */
export enum StorageKey {
  TIMER_STATE = 'timerState',
  TIMER_SETTINGS = 'timerSettings',
  TASKS = 'tasks',
  TASK_SETTINGS = 'taskSettings',
  DAY_PLANS = 'dayPlans',
  STATISTICS = 'statistics'
}

/**
 * ストレージデータの型定義
 */
export interface StorageData {
  [StorageKey.TIMER_STATE]?: TimerState;
  [StorageKey.TIMER_SETTINGS]?: TimerSettings;
  [StorageKey.TASKS]?: Task[];
  [StorageKey.TASK_SETTINGS]?: TaskSettings;
  [StorageKey.DAY_PLANS]?: { [date: string]: DayPlan };
  [StorageKey.STATISTICS]?: { [date: string]: Statistics };
}

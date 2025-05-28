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
  UPDATE_SETTINGS = 'updateSettings'
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
  Pending = 'pending',
  InProgress = 'in-progress',
  Completed = 'completed'
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
  pomodoroCount: number; // このタスクで完了したポモドーロ数
  estimatedPomodoros?: number; // 予想ポモドーロ数（オプション）
}

/**
 * タスクリストの設定を表すインターフェース
 */
export interface TaskSettings {
  currentTaskId?: string; // 現在実行中のタスクID
  autoStartNextTask: boolean; // 次のタスクを自動開始するか
  showTaskInPopup: boolean; // ポップアップにタスク名を表示するか
}

/**
 * ストレージのキー
 */
export enum StorageKey {
  TIMER_STATE = 'timerState',
  TIMER_SETTINGS = 'timerSettings',
  TASKS = 'tasks',
  TASK_SETTINGS = 'taskSettings'
}

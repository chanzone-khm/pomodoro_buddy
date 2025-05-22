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
  UPDATE_BADGE = 'updateBadge'
}

/**
 * メッセージの型定義
 */
export interface Message {
  action: MessageAction;
  payload?: any;
}

/**
 * ストレージのキー
 */
export enum StorageKey {
  TIMER_STATE = 'timerState',
  TIMER_SETTINGS = 'timerSettings'
} 
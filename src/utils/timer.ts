import { SessionType, TimerSettings, TimerState } from '../types/index.js';

/**
 * デフォルトのタイマー設定
 */
export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  workDurationSec: 25 * 60, // 25分
  breakDurationSec: 5 * 60, // 5分
  soundEnabled: false, // デフォルトでは音を鳴らさない
  workCompleteSound: 'sounds/work-complete.wav',
  breakCompleteSound: 'sounds/break-complete.wav',
  dailySlots: 6 // 1日のポモドーロスロット数（デフォルト6）
};

/**
 * 新しいTimerStateを作成する
 * @param type セッションタイプ
 * @param settings タイマー設定
 * @returns 新しいTimerState
 */
export function createTimerState(type: SessionType = SessionType.Work, settings: TimerSettings = DEFAULT_TIMER_SETTINGS): TimerState {
  return {
    type,
    startEpoch: Date.now(),
    durationSec: type === SessionType.Work ? settings.workDurationSec : settings.breakDurationSec,
    isRunning: false
  };
}

/**
 * タイマーを開始する
 * @param state 現在のタイマー状態
 * @returns 更新されたタイマー状態
 */
export function startTimer(state: TimerState): TimerState {
  if (state.isRunning) return state;

  const now = Date.now();

  // 一時停止からの再開の場合
  if (state.pausedAt && state.pausedElapsed) {
    return {
      ...state,
      startEpoch: now - state.pausedElapsed, // 経過時間を考慮した開始時間に調整
      isRunning: true,
      pausedAt: undefined,
      pausedElapsed: undefined
    };
  }

  // 新規開始の場合
  return {
    ...state,
    startEpoch: now,
    isRunning: true
  };
}

/**
 * タイマーを一時停止する
 * @param state 現在のタイマー状態
 * @returns 更新されたタイマー状態
 */
export function pauseTimer(state: TimerState): TimerState {
  if (!state.isRunning) return state;

  const now = Date.now();
  const elapsed = now - state.startEpoch;

  return {
    ...state,
    isRunning: false,
    pausedAt: now,
    pausedElapsed: elapsed
  };
}

/**
 * タイマーをリセットする
 * @param state 現在のタイマー状態
 * @param settings タイマー設定
 * @returns 更新されたタイマー状態
 */
export function resetTimer(state: TimerState, settings: TimerSettings = DEFAULT_TIMER_SETTINGS): TimerState {
  return createTimerState(state.type, settings);
}

/**
 * 次のセッションに切り替える
 * @param state 現在のタイマー状態
 * @param settings タイマー設定
 * @returns 更新されたタイマー状態
 */
export function switchSession(state: TimerState, settings: TimerSettings = DEFAULT_TIMER_SETTINGS): TimerState {
  const nextType = state.type === SessionType.Work ? SessionType.Break : SessionType.Work;
  const nextState = createTimerState(nextType, settings);

  // 自動的に開始する場合は以下のようにする
  return startTimer(nextState);
}

/**
 * 残り時間（秒）を計算する
 * @param state 現在のタイマー状態
 * @returns 残り時間（秒）、0以下の場合は0を返す
 */
export function calculateRemainingTime(state: TimerState): number {
  if (!state.isRunning) {
    // 一時停止中の場合
    if (state.pausedElapsed) {
      const elapsedSec = Math.floor(state.pausedElapsed / 1000);
      return Math.max(0, state.durationSec - elapsedSec);
    }
    // まだ開始していない場合
    return state.durationSec;
  }

  // 実行中の場合
  const now = Date.now();
  const elapsedSec = Math.floor((now - state.startEpoch) / 1000);
  return Math.max(0, state.durationSec - elapsedSec);
}

/**
 * タイマーが完了したかどうかを確認する
 * @param state 現在のタイマー状態
 * @returns 完了した場合はtrue
 */
export function isTimerCompleted(state: TimerState): boolean {
  return calculateRemainingTime(state) <= 0;
}

/**
 * 残り時間を分:秒形式の文字列に変換する
 * @param seconds 残り秒数
 * @returns MM:SS形式の文字列
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * バッジ表示用の残り分数を計算する
 * @param state 現在のタイマー状態
 * @returns バッジに表示する文字列（残り分数または空文字）
 */
export function calculateBadgeText(state: TimerState): string {
  if (!state.isRunning) return '';

  const remainingSec = calculateRemainingTime(state);
  const remainingMin = Math.ceil(remainingSec / 60);
  return remainingMin.toString();
}

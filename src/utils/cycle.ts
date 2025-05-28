/**
 * ポモドーロサイクル管理ユーティリティ
 * 繰り返し回数の設定と進行状況の管理を行う
 */

import { SessionType } from '../types/index.js';

/**
 * サイクル設定のインターフェース
 */
export interface CycleSettings {
  totalCycles: number; // 総サイクル数（1-10）
  longBreakInterval: number; // 長い休憩の間隔（デフォルト4）
  currentCycle: number; // 現在のサイクル番号（1から開始）
  isCompleted: boolean; // 全サイクル完了フラグ
}

/**
 * サイクル状態のインターフェース
 */
export interface CycleState {
  currentCycle: number; // 現在のサイクル番号
  totalCycles: number; // 総サイクル数
  isLastCycle: boolean; // 最後のサイクルかどうか
  nextSessionType: SessionType | null; // 次のセッションタイプ
  progressPercentage: number; // 全体の進行率（0-100）
  isCompleted: boolean; // 全サイクル完了フラグ
}

/**
 * デフォルトのサイクル設定
 */
export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  totalCycles: 4,
  longBreakInterval: 4,
  currentCycle: 1,
  isCompleted: false
};

/**
 * 長い休憩間隔の設定オプション
 */
export const LONG_BREAK_INTERVAL_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;

/**
 * サイクル設定を検証
 */
export function validateCycleSettings(settings: Partial<CycleSettings>): CycleSettings {
  return {
    totalCycles: Math.max(1, Math.min(10, settings.totalCycles || DEFAULT_CYCLE_SETTINGS.totalCycles)),
    longBreakInterval: Math.max(2, Math.min(8, settings.longBreakInterval || DEFAULT_CYCLE_SETTINGS.longBreakInterval)),
    currentCycle: Math.max(1, settings.currentCycle || DEFAULT_CYCLE_SETTINGS.currentCycle),
    isCompleted: settings.isCompleted || DEFAULT_CYCLE_SETTINGS.isCompleted
  };
}

/**
 * 現在のサイクル状態を計算
 */
export function calculateCycleState(
  settings: CycleSettings,
  currentSessionType: SessionType
): CycleState {
  const isLastCycle = settings.currentCycle >= settings.totalCycles;
  const progressPercentage = Math.min(100, (settings.currentCycle / settings.totalCycles) * 100);

  // 次のセッションタイプを決定
  let nextSessionType: SessionType | null = null;
  if (!isLastCycle) {
    if (currentSessionType === SessionType.Work) {
      // 作業セッション後は休憩
      nextSessionType = SessionType.Break;
    } else {
      // 休憩セッション後は作業
      nextSessionType = SessionType.Work;
    }
  }

  return {
    currentCycle: settings.currentCycle,
    totalCycles: settings.totalCycles,
    isLastCycle,
    nextSessionType,
    progressPercentage,
    isCompleted: settings.isCompleted
  };
}

/**
 * 次のサイクルに進む
 */
export function advanceCycle(
  settings: CycleSettings,
  currentSessionType: SessionType
): CycleSettings {
  // 作業セッションが完了した場合のみサイクルを進める
  if (currentSessionType === SessionType.Work) {
    const newCycle = settings.currentCycle + 1;
    const isCompleted = newCycle > settings.totalCycles;

    return {
      ...settings,
      currentCycle: isCompleted ? settings.totalCycles : newCycle,
      isCompleted
    };
  }

  return settings;
}

/**
 * サイクルをリセット
 */
export function resetCycle(settings: CycleSettings): CycleSettings {
  return {
    ...settings,
    currentCycle: 1,
    isCompleted: false
  };
}

/**
 * 長い休憩が必要かどうかを判定
 */
export function shouldTakeLongBreak(
  settings: CycleSettings,
  currentSessionType: SessionType
): boolean {
  // 作業セッション完了後で、長い休憩の間隔に達している場合
  return (
    currentSessionType === SessionType.Work &&
    settings.currentCycle % settings.longBreakInterval === 0 &&
    settings.currentCycle < settings.totalCycles
  );
}

/**
 * サイクル進行状況のテキストを生成
 */
export function getCycleProgressText(state: CycleState): string {
  if (state.isCompleted) {
    return `完了！ (${state.totalCycles}/${state.totalCycles})`;
  }
  return `${state.currentCycle}/${state.totalCycles} サイクル`;
}

/**
 * 次のセッション予告テキストを生成
 */
export function getNextSessionText(state: CycleState): string {
  if (state.isCompleted) {
    return '全サイクル完了';
  }

  if (!state.nextSessionType) {
    return '最終セッション';
  }

  return state.nextSessionType === SessionType.Work ? '次: 作業' : '次: 休憩';
}

/**
 * サイクル完了通知メッセージを生成
 */
export function getCycleCompletionMessage(state: CycleState): string {
  if (state.isCompleted) {
    return `🎉 おめでとうございます！${state.totalCycles}サイクルを完了しました！`;
  }

  if (state.isLastCycle) {
    return `🔥 最終サイクルです！あと少しで完了です！`;
  }

  return `✅ サイクル ${state.currentCycle - 1} 完了！次のサイクルに進みます。`;
}

/**
 * サイクル設定を保存
 */
export async function saveCycleSettings(settings: CycleSettings): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const validatedSettings = validateCycleSettings(settings);
      await chrome.storage.sync.set({ cycleSettings: validatedSettings });
      console.log('サイクル設定を保存しました:', validatedSettings);
    } catch (error) {
      console.error('サイクル設定の保存に失敗:', error);
    }
  }
}

/**
 * サイクル設定を読み込み
 */
export async function loadCycleSettings(): Promise<CycleSettings> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const result = await chrome.storage.sync.get('cycleSettings');
      return validateCycleSettings(result.cycleSettings || {});
    } catch (error) {
      console.error('サイクル設定の読み込みに失敗:', error);
      return DEFAULT_CYCLE_SETTINGS;
    }
  }
  return DEFAULT_CYCLE_SETTINGS;
}

/**
 * サイクル統計情報を計算
 */
export function calculateCycleStats(settings: CycleSettings): {
  completedCycles: number;
  remainingCycles: number;
  completionRate: number;
} {
  const completedCycles = Math.max(0, settings.currentCycle - 1);
  const remainingCycles = Math.max(0, settings.totalCycles - settings.currentCycle + 1);
  const completionRate = settings.totalCycles > 0 ? (completedCycles / settings.totalCycles) * 100 : 0;

  return {
    completedCycles,
    remainingCycles,
    completionRate
  };
}

/**
 * 時間設定管理ユーティリティ
 * 作業時間、休憩時間の設定と管理を行う
 */

/**
 * 時間設定のインターフェース
 */
export interface TimeSettings {
  workDuration: number; // 作業時間（分）
  shortBreakDuration: number; // 短い休憩時間（分）
  longBreakDuration: number; // 長い休憩時間（分）
  isDebugMode: boolean; // デバッグモード（短時間設定を有効にする）
}

/**
 * デフォルトの時間設定
 */
export const DEFAULT_TIME_SETTINGS: TimeSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  isDebugMode: false
};

/**
 * デバッグ用の時間設定オプション（秒単位）
 */
export const DEBUG_TIME_OPTIONS = {
  work: [10, 30, 60, 120, 300], // 10秒、30秒、1分、2分、5分
  shortBreak: [5, 10, 30, 60, 120], // 5秒、10秒、30秒、1分、2分
  longBreak: [10, 30, 60, 180, 300] // 10秒、30秒、1分、3分、5分
};

/**
 * 通常の時間設定オプション（分単位）
 */
export const NORMAL_TIME_OPTIONS = {
  work: [15, 20, 25, 30, 35, 40, 45, 50, 55, 60], // 15-60分
  shortBreak: [3, 5, 10, 15, 20, 25, 30], // 3-30分
  longBreak: [10, 15, 20, 25, 30, 45, 60] // 10-60分
};

/**
 * 時間設定を検証
 */
export function validateTimeSettings(settings: Partial<TimeSettings>): TimeSettings {
  const workDuration = settings.workDuration || DEFAULT_TIME_SETTINGS.workDuration;
  const shortBreakDuration = settings.shortBreakDuration || DEFAULT_TIME_SETTINGS.shortBreakDuration;
  const longBreakDuration = settings.longBreakDuration || DEFAULT_TIME_SETTINGS.longBreakDuration;
  const isDebugMode = settings.isDebugMode || DEFAULT_TIME_SETTINGS.isDebugMode;

  // デバッグモードの場合は秒単位、通常モードの場合は分単位で検証
  if (isDebugMode) {
    return {
      workDuration: Math.max(5, Math.min(300, workDuration)), // 5秒-5分
      shortBreakDuration: Math.max(5, Math.min(120, shortBreakDuration)), // 5秒-2分
      longBreakDuration: Math.max(10, Math.min(300, longBreakDuration)), // 10秒-5分
      isDebugMode: true
    };
  } else {
    return {
      workDuration: Math.max(5, Math.min(120, workDuration)), // 5-120分
      shortBreakDuration: Math.max(1, Math.min(60, shortBreakDuration)), // 1-60分
      longBreakDuration: Math.max(5, Math.min(120, longBreakDuration)), // 5-120分
      isDebugMode: false
    };
  }
}

/**
 * 時間設定を秒に変換
 */
export function convertToSeconds(settings: TimeSettings): {
  workDurationSeconds: number;
  shortBreakDurationSeconds: number;
  longBreakDurationSeconds: number;
} {
  if (settings.isDebugMode) {
    // デバッグモードでは既に秒単位
    return {
      workDurationSeconds: settings.workDuration,
      shortBreakDurationSeconds: settings.shortBreakDuration,
      longBreakDurationSeconds: settings.longBreakDuration
    };
  } else {
    // 通常モードでは分を秒に変換
    return {
      workDurationSeconds: settings.workDuration * 60,
      shortBreakDurationSeconds: settings.shortBreakDuration * 60,
      longBreakDurationSeconds: settings.longBreakDuration * 60
    };
  }
}

/**
 * 時間設定の表示用テキストを生成
 */
export function getTimeDisplayText(settings: TimeSettings): {
  workText: string;
  shortBreakText: string;
  longBreakText: string;
} {
  if (settings.isDebugMode) {
    return {
      workText: `${settings.workDuration}秒`,
      shortBreakText: `${settings.shortBreakDuration}秒`,
      longBreakText: `${settings.longBreakDuration}秒`
    };
  } else {
    return {
      workText: `${settings.workDuration}分`,
      shortBreakText: `${settings.shortBreakDuration}分`,
      longBreakText: `${settings.longBreakDuration}分`
    };
  }
}

/**
 * 時間設定を保存
 */
export async function saveTimeSettings(settings: TimeSettings): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const validatedSettings = validateTimeSettings(settings);
      await chrome.storage.sync.set({ timeSettings: validatedSettings });
      console.log('時間設定を保存しました:', validatedSettings);
    } catch (error) {
      console.error('時間設定の保存に失敗:', error);
    }
  }
}

/**
 * 時間設定を読み込み
 */
export async function loadTimeSettings(): Promise<TimeSettings> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const result = await chrome.storage.sync.get('timeSettings');
      return validateTimeSettings(result.timeSettings || {});
    } catch (error) {
      console.error('時間設定の読み込みに失敗:', error);
      return DEFAULT_TIME_SETTINGS;
    }
  }
  return DEFAULT_TIME_SETTINGS;
}

/**
 * デバッグモード切り替え
 */
export function toggleDebugMode(settings: TimeSettings): TimeSettings {
  const newSettings = { ...settings, isDebugMode: !settings.isDebugMode };
  
  // デバッグモードに切り替える場合、デフォルト値を設定
  if (newSettings.isDebugMode) {
    return {
      ...newSettings,
      workDuration: 30, // 30秒
      shortBreakDuration: 10, // 10秒
      longBreakDuration: 30 // 30秒
    };
  } else {
    // 通常モードに戻す場合、デフォルト値を設定
    return {
      ...newSettings,
      workDuration: 25, // 25分
      shortBreakDuration: 5, // 5分
      longBreakDuration: 15 // 15分
    };
  }
}

/**
 * 時間設定の統計情報を計算
 */
export function calculateTimeStats(settings: TimeSettings, cycleCount: number): {
  totalWorkTime: number;
  totalBreakTime: number;
  totalSessionTime: number;
  unit: string;
} {
  const { workDurationSeconds, shortBreakDurationSeconds, longBreakDurationSeconds } = convertToSeconds(settings);
  
  // 長い休憩の回数を計算（4回ごとと仮定）
  const longBreakCount = Math.floor((cycleCount - 1) / 4);
  const shortBreakCount = cycleCount - 1 - longBreakCount;
  
  const totalWorkTime = workDurationSeconds * cycleCount;
  const totalBreakTime = (shortBreakDurationSeconds * shortBreakCount) + (longBreakDurationSeconds * longBreakCount);
  const totalSessionTime = totalWorkTime + totalBreakTime;
  
  const unit = settings.isDebugMode ? '秒' : '分';
  const divisor = settings.isDebugMode ? 1 : 60;
  
  return {
    totalWorkTime: Math.round(totalWorkTime / divisor),
    totalBreakTime: Math.round(totalBreakTime / divisor),
    totalSessionTime: Math.round(totalSessionTime / divisor),
    unit
  };
} 
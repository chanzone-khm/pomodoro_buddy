import {
  Message,
  MessageAction,
  SessionType,
  StorageKey,
  TimerSettings,
  TimerState
} from './types/index.js';
import { playSessionCompleteSound } from './utils/audio.js';
import {
  advanceCycle,
  DEFAULT_CYCLE_SETTINGS,
  loadCycleSettings,
  shouldTakeLongBreak,
  type CycleSettings
} from './utils/cycle.js';
import {
  getCurrentTask,
  incrementTaskPomodoro
} from './utils/tasks.js';
import {
  convertToSeconds,
  DEFAULT_TIME_SETTINGS,
  loadTimeSettings,
  type TimeSettings
} from './utils/time-settings.js';
import {
  calculateBadgeText,
  calculateRemainingTime,
  createTimerState,
  DEFAULT_TIMER_SETTINGS,
  isTimerCompleted,
  pauseTimer,
  resetTimer,
  startTimer
} from './utils/timer.js';

// 初期状態
let currentState: TimerState = createTimerState();
let settings: TimerSettings = DEFAULT_TIMER_SETTINGS;
let timeSettings: TimeSettings = DEFAULT_TIME_SETTINGS;
let cycleSettings: CycleSettings = DEFAULT_CYCLE_SETTINGS;
let checkInterval: ReturnType<typeof setInterval> | null = null;
let badgeUpdateInterval: ReturnType<typeof setInterval> | null = null;

// アラーム名の定数
const TIMER_ALARM = 'pomodoro-timer-check';

/**
 * 初期化処理
 */
async function initialize() {
  // ストレージから状態を復元
  const data = await chrome.storage.sync.get([
    StorageKey.TIMER_STATE,
    StorageKey.TIMER_SETTINGS
  ]);

  if (data[StorageKey.TIMER_SETTINGS]) {
    settings = data[StorageKey.TIMER_SETTINGS] as TimerSettings;
  }

  // 時間設定を読み込み
  timeSettings = await loadTimeSettings();

  // サイクル設定を読み込み
  cycleSettings = await loadCycleSettings();

  // 時間設定をタイマー設定に反映
  updateTimerSettingsFromTimeSettings();

  if (data[StorageKey.TIMER_STATE]) {
    const savedState = data[StorageKey.TIMER_STATE] as TimerState;

    // 実行中だった場合、再開する
    if (savedState.isRunning) {
      currentState = savedState;
      startTimerCheck();
    } else {
      currentState = savedState;
    }
  }

  // バッジを初期化
  updateBadge();

  // アラームのリスナーを設定
  chrome.alarms.onAlarm.addListener(handleAlarm);

  // 1分ごとにアラームを設定
  chrome.alarms.create(TIMER_ALARM, { periodInMinutes: 1 });
}

/**
 * アラームハンドラー
 */
function handleAlarm(alarm: chrome.alarms.Alarm) {
  if (alarm.name === TIMER_ALARM) {
    checkTimerState();
  }
}

/**
 * タイマー状態をチェックし、必要に応じて更新する
 */
function checkTimerState() {
  if (!currentState.isRunning) return;

  if (isTimerCompleted(currentState)) {
    // タイマー完了
    handleTimerComplete();
  } else {
    // バッジを更新
    updateBadge();
  }
}

/**
 * タイマー完了時の処理
 */
async function handleTimerComplete() {
  const isWorkComplete = currentState.type === SessionType.Work;

  // 作業完了時は現在のタスクのポモドーロ数を増加
  if (isWorkComplete) {
    try {
      const currentTask = await getCurrentTask();
      if (currentTask) {
        await incrementTaskPomodoro(currentTask.id);
      }
    } catch (error) {
      console.error('タスクのポモドーロ数更新エラー:', error);
    }
  }

  // セッション完了の通知
  showNotification(isWorkComplete);

  // アラーム音を再生
  if (settings.soundEnabled) {
    await playSessionCompleteSound(currentState.type);
  }

  // サイクル進行を更新（作業完了時のみ）
  if (isWorkComplete) {
    cycleSettings = advanceCycle(cycleSettings, currentState.type);
  }

  // 次のセッションに切り替え（長い休憩の判定を含む）
  currentState = switchToNextSession(currentState, settings);

  // 状態を保存
  saveState();

  // バッジを更新
  updateBadge();
}

/**
 * 通知を表示する
 */
function showNotification(isWorkComplete: boolean) {
  const title = isWorkComplete ? '休憩時間です！' : '作業時間です！';

  let message: string;
  if (isWorkComplete) {
    // 長い休憩かどうかを判定
    const needsLongBreak = shouldTakeLongBreak(cycleSettings, SessionType.Work);
    const { longBreakDurationSeconds, shortBreakDurationSeconds } = convertToSeconds(timeSettings);
    const breakDuration = needsLongBreak ? longBreakDurationSeconds : shortBreakDurationSeconds;
    const unit = timeSettings.isDebugMode ? '秒' : '分';
    const displayTime = timeSettings.isDebugMode ? breakDuration : Math.round(breakDuration / 60);

    message = needsLongBreak
      ? `🛌 長い休憩です！${displayTime}${unit}間しっかり休憩しましょう。`
      : `☕ 短い休憩です！${displayTime}${unit}間休憩しましょう。`;
  } else {
    const unit = timeSettings.isDebugMode ? '秒' : '分';
    const displayTime = timeSettings.isDebugMode ? settings.workDurationSec : Math.round(settings.workDurationSec / 60);
    message = `🔥 次の${displayTime}${unit}間、集中して作業しましょう。`;
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/icons/icon128.png',
    title,
    message,
    priority: 2
  });
}

/**
 * タイマーチェックを開始する
 */
function startTimerCheck() {
  // すでに開始している場合は何もしない
  if (checkInterval) return;

  // 1秒ごとにタイマーの状態をチェック
  checkInterval = setInterval(() => {
    checkTimerState();
  }, 1000);

  // 1分ごとにバッジを更新（バッテリー効率化のため）
  badgeUpdateInterval = setInterval(() => {
    updateBadge();
  }, 60000);
}

/**
 * タイマーチェックを停止する
 */
function stopTimerCheck() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  if (badgeUpdateInterval) {
    clearInterval(badgeUpdateInterval);
    badgeUpdateInterval = null;
  }
}

/**
 * バッジを更新する
 */
function updateBadge() {
  const badgeText = calculateBadgeText(currentState);
  chrome.action.setBadgeText({ text: badgeText });

  // 作業中と休憩中でバッジの色を変える
  const color = currentState.type === SessionType.Work ? '#E53E3E' : '#38A169';
  chrome.action.setBadgeBackgroundColor({ color });
}

/**
 * 時間設定をタイマー設定に反映する
 */
function updateTimerSettingsFromTimeSettings() {
  const { workDurationSeconds, shortBreakDurationSeconds } = convertToSeconds(timeSettings);

  settings = {
    ...settings,
    workDurationSec: workDurationSeconds,
    breakDurationSec: shortBreakDurationSeconds
  };
}

/**
 * 次のセッションに切り替える（長い休憩の判定を含む）
 */
function switchToNextSession(state: TimerState, timerSettings: TimerSettings): TimerState {
  if (state.type === SessionType.Work) {
    // 作業完了後は休憩
    const { longBreakDurationSeconds, shortBreakDurationSeconds } = convertToSeconds(timeSettings);

    // 長い休憩が必要かどうかを判定
    const needsLongBreak = shouldTakeLongBreak(cycleSettings, state.type);
    const breakDuration = needsLongBreak ? longBreakDurationSeconds : shortBreakDurationSeconds;

    const nextState = createTimerState(SessionType.Break, {
      ...timerSettings,
      breakDurationSec: breakDuration
    });

    return startTimer(nextState);
  } else {
    // 休憩完了後は作業
    const nextState = createTimerState(SessionType.Work, timerSettings);
    return startTimer(nextState);
  }
}

/**
 * 状態をストレージに保存する
 */
async function saveState() {
  await chrome.storage.sync.set({
    [StorageKey.TIMER_STATE]: currentState,
    [StorageKey.TIMER_SETTINGS]: settings
  });
}

/**
 * メッセージハンドラー
 */
chrome.runtime.onMessage.addListener(async (message: Message, _sender, sendResponse) => {
  const { action } = message;

  switch (action) {
    case MessageAction.START:
      currentState = startTimer(currentState);
      startTimerCheck();
      break;

    case MessageAction.STOP:
      currentState = pauseTimer(currentState);
      stopTimerCheck();
      break;

    case MessageAction.RESET:
      currentState = resetTimer(currentState, settings);
      // サイクル設定もリセット（作業セッションから開始）
      cycleSettings = {
        ...cycleSettings,
        currentCycle: 1,
        isCompleted: false
      };
      // 作業セッションに戻す
      currentState = createTimerState(SessionType.Work, settings);
      stopTimerCheck();
      break;

    case MessageAction.GET_STATE:
      sendResponse({
        state: currentState,
        settings: settings,
        remainingTime: calculateRemainingTime(currentState),
        cycleSettings: cycleSettings
      });
      break;

    case MessageAction.UPDATE_BADGE:
      updateBadge();
      break;

    case MessageAction.PLAY_SOUND:
      if (settings.soundEnabled && message.payload?.sessionType) {
        playSessionCompleteSound(message.payload.sessionType);
      }
      break;

    case MessageAction.UPDATE_SETTINGS:
      if (message.payload) {
        // 通常のタイマー設定を更新
        if (message.payload.soundEnabled !== undefined) {
          settings = { ...settings, soundEnabled: message.payload.soundEnabled };
        }

        // 時間設定を更新
        if (message.payload.timeSettings) {
          timeSettings = message.payload.timeSettings;
          updateTimerSettingsFromTimeSettings();
        }

        // サイクル設定を更新
        if (message.payload.cycleSettings) {
          cycleSettings = message.payload.cycleSettings;
          // サイクル設定も保存
          await chrome.storage.sync.set({
            'cycleSettings': cycleSettings
          });
        }

        await chrome.storage.sync.set({
          [StorageKey.TIMER_SETTINGS]: settings
        });
      }
      break;
  }

  saveState();
  updateBadge();

  // 非同期にレスポンスを返す場合はtrue
  return action === MessageAction.GET_STATE;
});

// 初期化
initialize();

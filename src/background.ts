import {
  SessionType,
  TimerState,
  TimerSettings,
  StorageKey,
  MessageAction,
  Message
} from './types/index';
import {
  DEFAULT_TIMER_SETTINGS,
  createTimerState,
  startTimer,
  pauseTimer,
  resetTimer,
  switchSession,
  calculateRemainingTime,
  isTimerCompleted,
  calculateBadgeText
} from './utils/timer';

// 初期状態
let currentState: TimerState = createTimerState();
let settings: TimerSettings = DEFAULT_TIMER_SETTINGS;
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
function handleTimerComplete() {
  const isWorkComplete = currentState.type === SessionType.Work;
  
  // セッション完了の通知
  showNotification(isWorkComplete);
  
  // 次のセッションに切り替え
  currentState = switchSession(currentState, settings);
  
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
  const message = isWorkComplete 
    ? `${settings.breakDurationSec / 60}分間の休憩を取りましょう。`
    : `次の${settings.workDurationSec / 60}分間、集中して作業しましょう。`;
  
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
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  const { action, payload } = message;
  
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
      stopTimerCheck();
      break;
      
    case MessageAction.GET_STATE:
      sendResponse({
        state: currentState,
        settings: settings,
        remainingTime: calculateRemainingTime(currentState)
      });
      break;
      
    case MessageAction.UPDATE_BADGE:
      updateBadge();
      break;
  }
  
  saveState();
  updateBadge();
  
  // 非同期にレスポンスを返す場合はtrue
  return action === MessageAction.GET_STATE;
});

// 初期化
initialize(); 
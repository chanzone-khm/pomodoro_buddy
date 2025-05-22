import { MessageAction, SessionType, TimerState } from '../types/index';
import { formatTime } from '../utils/timer';

// HTMLエレメントの取得
const timerDisplay = document.getElementById('timer-display') as HTMLElement;
const sessionIndicator = document.getElementById('session-indicator') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

// タイマーの状態
let timerState: TimerState | null = null;
let remainingTime = 0;
let updateInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 初期化
 */
async function initialize() {
  // 現在の状態を取得
  await fetchTimerState();
  
  // イベントリスナーを設定
  startBtn.addEventListener('click', handleStartClick);
  pauseBtn.addEventListener('click', handlePauseClick);
  resetBtn.addEventListener('click', handleResetClick);
  
  // 最初の表示更新
  updateDisplay();
  
  // 定期的に状態を更新
  startDisplayUpdate();
}

/**
 * タイマー状態をバックグラウンドから取得
 */
async function fetchTimerState() {
  return new Promise<void>((resolve) => {
    chrome.runtime.sendMessage(
      { action: MessageAction.GET_STATE },
      (response) => {
        if (response) {
          timerState = response.state;
          remainingTime = response.remainingTime;
          resolve();
        }
      }
    );
  });
}

/**
 * 表示を更新する
 */
function updateDisplay() {
  if (!timerState) return;
  
  // 残り時間表示
  timerDisplay.textContent = formatTime(remainingTime);
  
  // セッションタイプ表示
  if (timerState.type === SessionType.Work) {
    sessionIndicator.textContent = '作業中';
    sessionIndicator.className = 'session-indicator session-work';
  } else {
    sessionIndicator.textContent = '休憩中';
    sessionIndicator.className = 'session-indicator session-break';
  }
  
  // ボタン状態を更新
  updateButtonState();
}

/**
 * ボタン状態を更新する
 */
function updateButtonState() {
  if (!timerState) return;
  
  if (timerState.isRunning) {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
  } else {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = false;
  }
}

/**
 * 表示更新のインターバルを開始
 */
function startDisplayUpdate() {
  if (updateInterval) clearInterval(updateInterval);
  
  // 毎秒表示を更新
  updateInterval = setInterval(async () => {
    await fetchTimerState();
    updateDisplay();
  }, 1000);
}

/**
 * Start ボタンのクリックハンドラー
 */
function handleStartClick() {
  chrome.runtime.sendMessage({ action: MessageAction.START });
  startBtn.disabled = true;
  pauseBtn.disabled = false;
}

/**
 * Pause ボタンのクリックハンドラー
 */
function handlePauseClick() {
  chrome.runtime.sendMessage({ action: MessageAction.STOP });
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

/**
 * Reset ボタンのクリックハンドラー
 */
function handleResetClick() {
  chrome.runtime.sendMessage({ action: MessageAction.RESET });
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

// 初期化
document.addEventListener('DOMContentLoaded', initialize); 
import { MessageAction, SessionType, TimerState, TimerSettings } from '../types/index.js';
import { formatTime } from '../utils/timer.js';
import { playSessionCompleteSound } from '../utils/audio.js';
import { 
  calculateProgressState, 
  createCircularProgressBar, 
  createLinearProgressBar,
  updateProgressBarElement,
  loadProgressSettings,
  saveProgressSettings,
  DEFAULT_PROGRESS_SETTINGS,
  type ProgressBarSettings,
  type ProgressBarState
} from '../utils/progress.js';

// HTMLエレメントの取得
const timerDisplay = document.getElementById('timer-display') as HTMLElement;
const sessionIndicator = document.getElementById('session-indicator') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

// 設定関連のエレメント
const settingsToggle = document.getElementById('settings-toggle') as HTMLButtonElement;
const settingsPanel = document.getElementById('settings-panel') as HTMLElement;
const soundEnabledCheckbox = document.getElementById('sound-enabled') as HTMLInputElement;
const testWorkSoundBtn = document.getElementById('test-work-sound') as HTMLButtonElement;
const testBreakSoundBtn = document.getElementById('test-break-sound') as HTMLButtonElement;

// プログレスバー関連のエレメント
const progressBarContainer = document.getElementById('progress-bar-container') as HTMLElement;
const progressEnabledCheckbox = document.getElementById('progress-enabled') as HTMLInputElement;
const progressTypeSelect = document.getElementById('progress-type') as HTMLSelectElement;
const progressPercentageCheckbox = document.getElementById('progress-percentage') as HTMLInputElement;

// タイマーの状態
let timerState: TimerState | null = null;
let timerSettings: TimerSettings | null = null;
let remainingTime = 0;
let updateInterval: ReturnType<typeof setInterval> | null = null;

// プログレスバーの状態
let progressSettings: ProgressBarSettings = DEFAULT_PROGRESS_SETTINGS;
let currentProgressState: ProgressBarState | null = null;

/**
 * 初期化
 */
async function initialize() {
  // 現在の状態を取得
  await fetchTimerState();
  
  // プログレスバー設定を読み込み
  progressSettings = await loadProgressSettings();
  
  // イベントリスナーを設定
  startBtn.addEventListener('click', handleStartClick);
  pauseBtn.addEventListener('click', handlePauseClick);
  resetBtn.addEventListener('click', handleResetClick);
  
  // 設定関連のイベントリスナー
  settingsToggle.addEventListener('click', handleSettingsToggle);
  soundEnabledCheckbox.addEventListener('change', handleSoundEnabledChange);
  testWorkSoundBtn.addEventListener('click', () => handleTestSound(SessionType.Work));
  testBreakSoundBtn.addEventListener('click', () => handleTestSound(SessionType.Break));
  
  // プログレスバー関連のイベントリスナー
  progressEnabledCheckbox.addEventListener('change', handleProgressEnabledChange);
  progressTypeSelect.addEventListener('change', handleProgressTypeChange);
  progressPercentageCheckbox.addEventListener('change', handleProgressPercentageChange);
  
  // 最初の表示更新
  updateDisplay();
  updateSettingsDisplay();
  updateProgressSettingsDisplay();
  updateProgressBar();
  
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
          timerSettings = response.settings;
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
  
  // プログレスバーを更新
  updateProgressBar();
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

/**
 * 設定パネルの表示/非表示を切り替える
 */
function handleSettingsToggle() {
  settingsPanel.classList.toggle('hidden');
}

/**
 * アラーム音設定の変更ハンドラー
 */
async function handleSoundEnabledChange() {
  if (!timerSettings) return;
  
  const newSettings = {
    ...timerSettings,
    soundEnabled: soundEnabledCheckbox.checked
  };
  
  // バックグラウンドに設定を送信
  chrome.runtime.sendMessage({
    action: MessageAction.UPDATE_SETTINGS,
    payload: newSettings
  });
  
  // ローカルの設定も更新
  timerSettings = newSettings;
  
  // テストボタンの状態を更新
  updateTestButtonsState();
}

/**
 * テスト音再生ハンドラー
 */
function handleTestSound(sessionType: SessionType) {
  if (!timerSettings?.soundEnabled) return;
  
  playSessionCompleteSound(sessionType);
}

/**
 * 設定表示を更新する
 */
function updateSettingsDisplay() {
  if (!timerSettings) return;
  
  soundEnabledCheckbox.checked = timerSettings.soundEnabled;
  updateTestButtonsState();
}

/**
 * テストボタンの状態を更新する
 */
function updateTestButtonsState() {
  const isEnabled = timerSettings?.soundEnabled || false;
  testWorkSoundBtn.disabled = !isEnabled;
  testBreakSoundBtn.disabled = !isEnabled;
}

/**
 * プログレスバーを更新する
 */
function updateProgressBar() {
  if (!timerState || !progressBarContainer) return;
  
  // プログレスバーが無効の場合は非表示
  if (!progressSettings.enabled || !progressSettings || progressSettings.type === undefined) {
    progressBarContainer.style.display = 'none';
    return;
  }
  
  progressBarContainer.style.display = 'block';
  
  // プログレス状態を計算
  currentProgressState = calculateProgressState(timerState, remainingTime);
  
  // プログレスバーのHTMLを生成
  let progressBarHTML = '';
  if (progressSettings.type === 'circular') {
    progressBarHTML = createCircularProgressBar(currentProgressState, progressSettings, 100);
  } else {
    progressBarHTML = createLinearProgressBar(currentProgressState, progressSettings, 260);
  }
  
  // 既存のプログレスバーがある場合は更新、ない場合は新規作成
  if (progressBarContainer.children.length > 0) {
    // 形式が変わった場合は完全に再生成
    const existingType = progressBarContainer.querySelector('.circular-progress-container') ? 'circular' : 'linear';
    if (existingType !== progressSettings.type) {
      progressBarContainer.innerHTML = progressBarHTML;
    } else {
      updateProgressBarElement(progressBarContainer, currentProgressState, progressSettings);
    }
  } else {
    progressBarContainer.innerHTML = progressBarHTML;
  }
}

/**
 * プログレスバー表示設定の変更ハンドラー
 */
async function handleProgressEnabledChange() {
  const enabled = progressEnabledCheckbox.checked;
  progressSettings.enabled = enabled;
  await saveProgressSettings(progressSettings);
  
  if (enabled) {
    progressBarContainer.style.display = 'block';
    updateProgressBar();
  } else {
    progressBarContainer.style.display = 'none';
  }
}

/**
 * プログレスバー形式の変更ハンドラー
 */
async function handleProgressTypeChange() {
  progressSettings.type = progressTypeSelect.value as 'circular' | 'linear';
  await saveProgressSettings(progressSettings);
  
  // プログレスバーを完全に再生成するためにコンテナをクリア
  progressBarContainer.innerHTML = '';
  updateProgressBar();
}

/**
 * プログレスバーパーセンテージ表示の変更ハンドラー
 */
async function handleProgressPercentageChange() {
  progressSettings.showPercentage = progressPercentageCheckbox.checked;
  await saveProgressSettings(progressSettings);
  
  // プログレスバーを完全に再生成するためにコンテナをクリア
  progressBarContainer.innerHTML = '';
  updateProgressBar();
}

/**
 * プログレスバー設定表示を更新する
 */
function updateProgressSettingsDisplay() {
  progressEnabledCheckbox.checked = progressSettings.enabled;
  progressTypeSelect.value = progressSettings.type;
  progressPercentageCheckbox.checked = progressSettings.showPercentage;
}

// 初期化
document.addEventListener('DOMContentLoaded', initialize); 
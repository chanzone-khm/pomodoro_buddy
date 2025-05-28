import { MessageAction, SessionType, TimerSettings, TimerState } from '../types/index.js';
import { playSessionCompleteSound } from '../utils/audio.js';
import {
    calculateCycleState,
    DEFAULT_CYCLE_SETTINGS,
    getCycleProgressText,
    loadCycleSettings,
    resetCycle,
    saveCycleSettings,
    shouldTakeLongBreak,
    type CycleSettings,
    type CycleState
} from '../utils/cycle.js';
import {
    calculateProgressState,
    createCircularProgressBar,
    createLinearProgressBar,
    DEFAULT_PROGRESS_SETTINGS,
    loadProgressSettings,
    saveProgressSettings,
    updateProgressBarElement,
    type ProgressBarSettings,
    type ProgressBarState
} from '../utils/progress.js';
import {
    calculateTimeStats,
    DEBUG_TIME_OPTIONS,
    DEFAULT_TIME_SETTINGS,
    getTimeDisplayText,
    loadTimeSettings,
    NORMAL_TIME_OPTIONS,
    saveTimeSettings,
    toggleDebugMode,
    type TimeSettings
} from '../utils/time-settings.js';
import { formatTime } from '../utils/timer.js';

// HTMLエレメントの取得
const timerDisplay = document.getElementById('timer-display') as HTMLElement;
const sessionIndicator = document.getElementById('session-indicator') as HTMLElement;
const cycleProgress = document.getElementById('cycle-progress') as HTMLElement;
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

// サイクル関連のエレメント
const cycleCountSelect = document.getElementById('cycle-count') as HTMLSelectElement;
const longBreakIntervalSelect = document.getElementById('long-break-interval') as HTMLSelectElement;
const resetCycleBtn = document.getElementById('reset-cycle') as HTMLButtonElement;

// 時間設定関連のエレメント
const debugModeCheckbox = document.getElementById('debug-mode') as HTMLInputElement;
const workDurationSelect = document.getElementById('work-duration') as HTMLSelectElement;
const shortBreakDurationSelect = document.getElementById('short-break-duration') as HTMLSelectElement;
const longBreakDurationSelect = document.getElementById('long-break-duration') as HTMLSelectElement;
const timeStatsDiv = document.getElementById('time-stats') as HTMLElement;

// タイマーの状態
let timerState: TimerState | null = null;
let timerSettings: TimerSettings | null = null;
let remainingTime = 0;
let updateInterval: ReturnType<typeof setInterval> | null = null;

// プログレスバーの状態
let progressSettings: ProgressBarSettings = DEFAULT_PROGRESS_SETTINGS;
let currentProgressState: ProgressBarState | null = null;

// サイクルの状態
let cycleSettings: CycleSettings = DEFAULT_CYCLE_SETTINGS;
let currentCycleState: CycleState | null = null;

// 時間設定の状態
let timeSettings: TimeSettings = DEFAULT_TIME_SETTINGS;

/**
 * 初期化
 */
async function initialize() {
  // 現在の状態を取得
  await fetchTimerState();

  // プログレスバー設定を読み込み
  progressSettings = await loadProgressSettings();

  // サイクル設定を読み込み
  cycleSettings = await loadCycleSettings();

  // 時間設定を読み込み
  timeSettings = await loadTimeSettings();

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

  // サイクル関連のイベントリスナー
  cycleCountSelect.addEventListener('change', handleCycleCountChange);
  longBreakIntervalSelect.addEventListener('change', handleLongBreakIntervalChange);
  resetCycleBtn.addEventListener('click', handleResetCycle);

  // 時間設定関連のイベントリスナー
  debugModeCheckbox.addEventListener('change', handleDebugModeChange);
  workDurationSelect.addEventListener('change', handleWorkDurationChange);
  shortBreakDurationSelect.addEventListener('change', handleShortBreakDurationChange);
  longBreakDurationSelect.addEventListener('change', handleLongBreakDurationChange);

  // 最初の表示更新
  updateDisplay();
  updateSettingsDisplay();
  updateProgressSettingsDisplay();
  updateCycleSettingsDisplay();
  updateTimeSettingsDisplay();
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

          // サイクル設定も同期
          if (response.cycleSettings) {
            cycleSettings = response.cycleSettings;
          }

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

  // セッションタイプ表示（長い休憩の判定を含む）
  if (timerState.type === SessionType.Work) {
    sessionIndicator.textContent = '作業中';
    sessionIndicator.className = 'session-indicator session-work';
  } else {
    // 休憩中の場合、長い休憩かどうかを判定
    // shouldTakeLongBreak関数を使用して正確に判定
    const isLongBreak = shouldTakeLongBreak(cycleSettings, SessionType.Work);

    if (isLongBreak) {
      sessionIndicator.textContent = '長い休憩中';
      sessionIndicator.className = 'session-indicator session-long-break';
    } else {
      sessionIndicator.textContent = '短い休憩中';
      sessionIndicator.className = 'session-indicator session-break';
    }
  }

  // サイクル進行状況を更新
  updateCycleDisplay();

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

/**
 * サイクル表示を更新する
 */
function updateCycleDisplay() {
  if (!timerState) return;

  currentCycleState = calculateCycleState(cycleSettings, timerState.type);
  cycleProgress.textContent = getCycleProgressText(currentCycleState);

  // 完了時の表示変更
  if (currentCycleState.isCompleted) {
    cycleProgress.className = 'cycle-progress bg-green-50 text-green-600';
  } else {
    cycleProgress.className = 'cycle-progress';
  }
}

/**
 * サイクル設定表示を更新する
 */
function updateCycleSettingsDisplay() {
  cycleCountSelect.value = cycleSettings.totalCycles.toString();
  longBreakIntervalSelect.value = cycleSettings.longBreakInterval.toString();
}

/**
 * サイクル数変更ハンドラー
 */
async function handleCycleCountChange() {
  cycleSettings.totalCycles = parseInt(cycleCountSelect.value);
  await saveCycleSettings(cycleSettings);
  updateCycleDisplay();
  updateTimeStats();

  // バックグラウンドに設定を送信
  chrome.runtime.sendMessage({
    action: MessageAction.UPDATE_SETTINGS,
    payload: { cycleSettings }
  });
}

/**
 * 長い休憩間隔変更ハンドラー
 */
async function handleLongBreakIntervalChange() {
  cycleSettings.longBreakInterval = parseInt(longBreakIntervalSelect.value);
  await saveCycleSettings(cycleSettings);
  updateTimeStats();

  // バックグラウンドに設定を送信
  chrome.runtime.sendMessage({
    action: MessageAction.UPDATE_SETTINGS,
    payload: { cycleSettings }
  });
}

/**
 * サイクルリセットハンドラー
 */
async function handleResetCycle() {
  cycleSettings = resetCycle(cycleSettings);
  await saveCycleSettings(cycleSettings);
  updateCycleDisplay();

  // バックグラウンドに設定を送信
  chrome.runtime.sendMessage({
    action: MessageAction.UPDATE_SETTINGS,
    payload: { cycleSettings }
  });

  // 通知
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Pomodoro Buddy',
      message: 'サイクルをリセットしました'
    });
  }
}

/**
 * 時間設定表示を更新する
 */
function updateTimeSettingsDisplay() {
  debugModeCheckbox.checked = timeSettings.isDebugMode;

  // 時間選択肢を更新
  updateTimeOptions();

  // 現在の値を設定
  workDurationSelect.value = timeSettings.workDuration.toString();
  shortBreakDurationSelect.value = timeSettings.shortBreakDuration.toString();
  longBreakDurationSelect.value = timeSettings.longBreakDuration.toString();

  // 統計情報を更新
  updateTimeStats();
}

/**
 * 時間選択肢を更新する
 */
function updateTimeOptions() {
  const options = timeSettings.isDebugMode ? DEBUG_TIME_OPTIONS : NORMAL_TIME_OPTIONS;
  const unit = timeSettings.isDebugMode ? '秒' : '分';

  // 作業時間の選択肢
  workDurationSelect.innerHTML = '';
  options.work.forEach(value => {
    const option = document.createElement('option');
    option.value = value.toString();
    option.textContent = `${value}${unit}`;
    workDurationSelect.appendChild(option);
  });

  // 短い休憩の選択肢
  shortBreakDurationSelect.innerHTML = '';
  options.shortBreak.forEach(value => {
    const option = document.createElement('option');
    option.value = value.toString();
    option.textContent = `${value}${unit}`;
    shortBreakDurationSelect.appendChild(option);
  });

  // 長い休憩の選択肢
  longBreakDurationSelect.innerHTML = '';
  options.longBreak.forEach(value => {
    const option = document.createElement('option');
    option.value = value.toString();
    option.textContent = `${value}${unit}`;
    longBreakDurationSelect.appendChild(option);
  });
}

/**
 * 時間統計を更新する
 */
function updateTimeStats() {
  const stats = calculateTimeStats(timeSettings, cycleSettings.totalCycles, cycleSettings.longBreakInterval);
  const displayText = getTimeDisplayText(timeSettings);

  timeStatsDiv.innerHTML = `
    <div><strong>現在の設定:</strong></div>
    <div>作業: ${displayText.workText} | 短い休憩: ${displayText.shortBreakText} | 長い休憩: ${displayText.longBreakText}</div>
    <div class="mt-1"><strong>予想時間 (${cycleSettings.totalCycles}サイクル):</strong></div>
    <div>作業: ${stats.totalWorkTime}${stats.unit} | 休憩: ${stats.totalBreakTime}${stats.unit} | 合計: ${stats.totalSessionTime}${stats.unit}</div>
    <div class="mt-1 text-xs text-gray-500">長い休憩: ${cycleSettings.longBreakInterval}回ごと</div>
  `;
}

/**
 * デバッグモード変更ハンドラー
 */
async function handleDebugModeChange() {
  timeSettings = toggleDebugMode(timeSettings);
  await saveTimeSettings(timeSettings);
  updateTimeSettingsDisplay();

  // タイマーに新しい設定を送信
  chrome.runtime.sendMessage({
    action: MessageAction.UPDATE_SETTINGS,
    payload: { timeSettings }
  });

  // デバッグモード切り替え時にタイマーを自動リセット
  chrome.runtime.sendMessage({ action: MessageAction.RESET });
}

/**
 * 作業時間変更ハンドラー
 */
async function handleWorkDurationChange() {
  timeSettings.workDuration = parseInt(workDurationSelect.value);
  await saveTimeSettings(timeSettings);
  updateTimeStats();

  // タイマーに新しい設定を送信
  chrome.runtime.sendMessage({
    action: MessageAction.UPDATE_SETTINGS,
    payload: { timeSettings }
  });

  // 時間設定変更時にタイマーを自動リセット
  chrome.runtime.sendMessage({ action: MessageAction.RESET });
}

/**
 * 短い休憩時間変更ハンドラー
 */
async function handleShortBreakDurationChange() {
  timeSettings.shortBreakDuration = parseInt(shortBreakDurationSelect.value);
  await saveTimeSettings(timeSettings);
  updateTimeStats();

  // タイマーに新しい設定を送信
  chrome.runtime.sendMessage({
    action: MessageAction.UPDATE_SETTINGS,
    payload: { timeSettings }
  });

  // 時間設定変更時にタイマーを自動リセット
  chrome.runtime.sendMessage({ action: MessageAction.RESET });
}

/**
 * 長い休憩時間変更ハンドラー
 */
async function handleLongBreakDurationChange() {
  timeSettings.longBreakDuration = parseInt(longBreakDurationSelect.value);
  await saveTimeSettings(timeSettings);
  updateTimeStats();

  // タイマーに新しい設定を送信
  chrome.runtime.sendMessage({
    action: MessageAction.UPDATE_SETTINGS,
    payload: { timeSettings }
  });

  // 時間設定変更時にタイマーを自動リセット
  chrome.runtime.sendMessage({ action: MessageAction.RESET });
}

// 初期化
document.addEventListener('DOMContentLoaded', initialize);

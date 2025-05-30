import { MessageAction, SessionType, Task, TimerSettings, TimerState } from '../types/index.js';
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
    createTask,
    getAllTasks,
    getCurrentTask,
    saveTask
} from '../utils/tasks.js';
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

// 現在のタスク表示関連のエレメント
const currentTaskName = document.getElementById('current-task-name') as HTMLElement;
const noTaskMessage = document.getElementById('no-task-message') as HTMLElement;

// 次プラン表示関連のエレメント
const nextPlanSection = document.getElementById('next-plan-section') as HTMLElement;
const nextPlanTask = document.getElementById('next-plan-task') as HTMLElement;
const nextPlanInfo = document.getElementById('next-plan-info') as HTMLElement;

// 設定関連のエレメント
const settingsToggle = document.getElementById('settings-toggle') as HTMLButtonElement;
const settingsPanel = document.getElementById('settings-panel') as HTMLElement;
const soundEnabledCheckbox = document.getElementById('sound-enabled') as HTMLInputElement;
const testWorkSoundBtn = document.getElementById('test-work-sound') as HTMLButtonElement;
const testBreakSoundBtn = document.getElementById('test-break-sound') as HTMLButtonElement;

// タスク管理関連のエレメント（カンバンボタンのみ残す）
const openTaskManagerBtn = document.getElementById('open-task-manager-btn') as HTMLButtonElement;

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

// プラン一覧関連のエレメント
const todayPlanSection = document.getElementById('today-plan-section') as HTMLElement;
const planProgress = document.getElementById('plan-progress') as HTMLElement;
const planList = document.getElementById('plan-list') as HTMLElement;

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

// タスク管理の状態
let currentTask: Task | null = null;
let allTasks: Task[] = [];
let editingTaskId: string | null = null;

// プラン管理の状態
let dayPlan: any = null;
let currentSlot: any = null;
let nextSlot: any = null;

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

  // タスク管理の初期化
  await initializeTasks();

  // カンバンからの変更通知を受信
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TASK_UPDATED' || message.action === 'PLAN_UPDATED') {
      console.log('📩 カンバンからの変更通知を受信:', message.action);
      handleExternalUpdate();
    }
  });

  // ストレージの変更も監視（カンバンからの直接変更を検出）
  chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log('💾 ポップアップでストレージ変更を検出:', changes, areaName);

    // プランやタスクの変更を検出（他のタブ/ウィンドウからの変更）
    if ((changes.day_plans || changes.tasks) && areaName === 'local') {
      console.log('🔄 重要な変更を検出 - ポップアップを更新');
      setTimeout(() => {
        handleExternalUpdate();
      }, 200);
    }
  });

  // イベントリスナーを設定
  startBtn.addEventListener('click', handleStartClick);
  pauseBtn.addEventListener('click', handlePauseClick);
  resetBtn.addEventListener('click', handleResetClick);

  // 設定関連のイベントリスナー
  settingsToggle.addEventListener('click', handleSettingsToggle);
  soundEnabledCheckbox.addEventListener('change', handleSoundEnabledChange);
  testWorkSoundBtn.addEventListener('click', () => handleTestSound(SessionType.Work));
  testBreakSoundBtn.addEventListener('click', () => handleTestSound(SessionType.Break));

  // タスク管理関連のイベントリスナー
  openTaskManagerBtn.addEventListener('click', handleOpenTaskManagerClick);

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

  // 次プラン表示を更新
  updateNextPlanDisplay();
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

/**
 * タスク管理の初期化
 */
async function initializeTasks() {
  console.log('🔄 タスク管理初期化開始');

  // 現在のタスクを取得
  currentTask = await getCurrentTask();
  console.log('📋 現在のタスク:', { currentTask: currentTask?.name || 'なし' });

  // 全タスクを取得（複数回試行して確実に取得）
  allTasks = await getAllTasks();
  console.log('📋 全タスク取得（1回目）:', { count: allTasks.length, tasks: allTasks.map(t => ({ id: t.id, name: t.name, status: t.status })) });

  // タスクが取得できていない場合は少し待ってリトライ
  if (allTasks.length === 0) {
    console.log('⏳ タスクが見つからないため、少し待ってリトライします...');
    await new Promise(resolve => setTimeout(resolve, 100));
    allTasks = await getAllTasks();
    console.log('📋 全タスク取得（2回目）:', { count: allTasks.length, tasks: allTasks.map(t => ({ id: t.id, name: t.name, status: t.status })) });
  }

  // プラン情報を初期化（タスクデータ取得後）
  await initializePlan();

  // 表示を更新
  await updateCurrentTaskDisplay();
  updatePlanDisplay();

  console.log('✅ タスク管理初期化完了');
}

/**
 * プラン情報の初期化
 */
async function initializePlan() {
  try {
    console.log('🔄 プラン初期化開始');
    console.log('📋 initializePlan開始時のallTasks:', { count: allTasks.length, taskIds: allTasks.map(t => t.id) });

    const { getTodayDayPlan } = await import('../utils/storage.js');
    dayPlan = await getTodayDayPlan();
    console.log('📅 取得したプラン:', dayPlan);

    // データ整合性チェック
    console.log('🔍 validatePlanData実行直前のallTasks:', { count: allTasks.length, taskIds: allTasks.map(t => t.id) });
    await validatePlanData();
    console.log('🔍 validatePlanData実行直後のdayPlan:', {
      slots: dayPlan?.slots.map((s: any) => ({ id: s.id, taskId: s.taskId, completed: s.completed }))
    });

    await updateCurrentSlot();
    console.log('✅ プラン初期化完了');
  } catch (error) {
    console.error('❌ プラン初期化に失敗しました:', error);
    dayPlan = null;
    currentSlot = null;
    nextSlot = null;
  }
}

/**
 * プランデータの整合性をチェックし、存在しないタスクIDを参照するスロットをクリア
 */
async function validatePlanData() {
  if (!dayPlan || !dayPlan.slots) {
    console.log('📊 プランデータなし - 整合性チェックスキップ');
    return;
  }

  console.log('🔍 プランデータ整合性チェック開始');
  console.log('📊 チェック対象プラン:', {
    date: dayPlan.date,
    slotsWithTasks: dayPlan.slots.filter((s: any) => s.taskId).map((s: any) => ({ id: s.id, taskId: s.taskId }))
  });

  // 現在のタスクIDリストを取得
  const existingTaskIds = allTasks.map(t => t.id);
  console.log('📋 存在するタスクID:', existingTaskIds);
  console.log('📋 存在するタスク詳細:', allTasks.map(t => ({ id: t.id, name: t.name, status: t.status })));

  // 無効なタスクIDを参照するスロットを特定
  const slotsWithTasks = dayPlan.slots.filter((slot: any) => slot.taskId);
  console.log('📊 タスクIDが設定されているスロット:', slotsWithTasks.map((s: any) => ({ id: s.id, taskId: s.taskId })));

  const invalidSlots = dayPlan.slots.filter((slot: any) =>
    slot.taskId && !existingTaskIds.includes(slot.taskId)
  );

  if (invalidSlots.length > 0) {
    console.log('⚠️ 無効なスロット発見（Storage API統一のため一時的にクリアを無効化）:', invalidSlots.map((s: any) => ({ id: s.id, taskId: s.taskId })));
    console.log('⚠️ 無効な理由の詳細確認:');
    invalidSlots.forEach((slot: any) => {
      const exists = existingTaskIds.includes(slot.taskId);
      console.log(`  - スロット ${slot.id} のタスクID ${slot.taskId}: 存在する=${exists}`);
    });

    // 一時的にクリア処理を無効化
    console.log('🚫 プランデータクリア処理を一時的に無効化しました');
  } else {
    console.log('✅ プランデータ整合性OK - クリアするスロットなし');
  }
}

/**
 * 現在のスロット情報を更新
 */
async function updateCurrentSlot() {
  console.log('🔄 現在スロット更新開始', { dayPlan });

  if (!dayPlan) {
    console.log('❌ プランなし - スロットクリア');
    currentSlot = null;
    nextSlot = null;
    return;
  }

  // プランの順序通りに、未完了の最初のスロットを現在のスロットとする
  const allSlots = dayPlan.slots || [];
  const uncompletedSlots = allSlots.filter((slot: any) => slot.taskId && !slot.completed);

  // プランの順序に基づいて並び替え（スロットIDは順序を保持している前提）
  uncompletedSlots.sort((a: any, b: any) => {
    const aIndex = allSlots.findIndex((s: any) => s.id === a.id);
    const bIndex = allSlots.findIndex((s: any) => s.id === b.id);
    return aIndex - bIndex;
  });

  currentSlot = uncompletedSlots[0] || null;

  // 次のスロットを取得（プランの順序で次に実行すべきスロット）
  if (uncompletedSlots.length > 1) {
    nextSlot = uncompletedSlots[1];
  } else {
    nextSlot = null;
  }

  console.log('📋 スロット情報更新:', {
    currentSlot: currentSlot ? { id: currentSlot.id, taskId: currentSlot.taskId } : null,
    nextSlot: nextSlot ? { id: nextSlot.id, taskId: nextSlot.taskId } : null,
    uncompletedCount: uncompletedSlots.length,
    totalSlots: allSlots.length
  });

  // プラン表示も更新
  updatePlanDisplay();
}

/**
 * 現在のタスク表示を更新
 */
async function updateCurrentTaskDisplay() {
  // プランタスクを優先的に表示
  let displayTask = null;
  let displayText = '';

  if (currentSlot) {
    // プランのタスクが存在する場合
    const planTask = allTasks.find(t => t.id === currentSlot!.taskId);
    if (planTask) {
      displayTask = planTask;

      // プラン内での進捗を表示
      const taskSlots = dayPlan?.slots.filter((s: any) => s.taskId === planTask.id) || [];
      const currentSlotIndex = taskSlots.findIndex((s: any) => s.id === currentSlot!.id) + 1;
      const totalSlots = taskSlots.length;

      displayText = `🍅 ${planTask.name} (${currentSlotIndex}/${totalSlots})`;
    }
  } else if (currentTask) {
    // フリーモードのタスク
    displayTask = currentTask;
    displayText = `📝 ${currentTask.name}`;
  }

  // 常にタスクを表示（showTaskInPopup設定は削除）
  if (displayTask) {
    currentTaskName.textContent = displayText;
    currentTaskName.classList.remove('hidden');
    noTaskMessage.classList.add('hidden');
  } else {
    currentTaskName.classList.add('hidden');
    noTaskMessage.classList.remove('hidden');
  }

  // 次プラン表示も更新
  updateNextPlanDisplay();
}

/**
 * プラン表示を更新する
 */
function updatePlanDisplay() {
  console.log('🔄 プラン表示更新開始', { dayPlan, hasSlots: dayPlan?.slots?.length });

  if (!dayPlan || !dayPlan.slots || dayPlan.slots.length === 0) {
    console.log('❌ プランなし - 非表示');
    todayPlanSection.classList.add('hidden');
    return;
  }

  // プランが存在する場合は表示
  console.log('✅ プランあり - 表示');
  todayPlanSection.classList.remove('hidden');

  // 進捗を計算
  const assignedSlots = dayPlan.slots.filter((slot: any) => slot.taskId);
  const completedSlots = assignedSlots.filter((slot: any) => slot.completed);

  console.log('📊 プラン進捗:', {
    totalSlots: dayPlan.slots.length,
    assignedSlots: assignedSlots.length,
    completedSlots: completedSlots.length
  });

  // 進捗表示を更新
  planProgress.textContent = `${completedSlots.length}/${assignedSlots.length}`;

  // プラン一覧を描画
  renderPlanList();

  // 次プラン表示も更新
  updateNextPlanDisplay();
}

/**
 * 次プラン表示を更新する
 */
function updateNextPlanDisplay() {
  // セッション状態を確認（休憩中で次のスロットがある場合のみ表示）
  if (!timerState || timerState.type !== 'break' || !nextSlot) {
    nextPlanSection.classList.add('hidden');
    return;
  }

  // 次のタスクを取得
  const nextTask = allTasks.find(t => t.id === nextSlot.taskId);
  if (!nextTask) {
    nextPlanSection.classList.add('hidden');
    return;
  }

  // 次プラン表示を更新
  nextPlanSection.classList.remove('hidden');
  nextPlanTask.textContent = nextTask.name;

  // 追加情報（ポモドーロ数など）
  const taskSlots = dayPlan?.slots.filter((s: any) => s.taskId === nextTask.id) || [];
  const completedCount = taskSlots.filter((s: any) => s.completed).length;
  const totalCount = taskSlots.length;

  nextPlanInfo.textContent = `ポモドーロ ${completedCount + 1}/${totalCount}`;
}

/**
 * プラン一覧を描画する
 */
function renderPlanList() {
  console.log('🔄 プラン一覧描画開始', { dayPlan, allTasks: allTasks?.length });

  if (!dayPlan) {
    console.log('❌ dayPlanがnull');
    return;
  }

  planList.innerHTML = '';

  // スロットが割り当てられているもののみ表示
  const assignedSlots = dayPlan.slots.filter((slot: any) => slot.taskId);

  console.log('📊 スロット詳細:', {
    totalSlots: dayPlan.slots.length,
    assignedSlots: assignedSlots.length,
    slotsData: dayPlan.slots.map((s: any) => ({ id: s.id, taskId: s.taskId, completed: s.completed })),
    assignedSlotsData: assignedSlots.map((s: any) => ({ id: s.id, taskId: s.taskId, completed: s.completed }))
  });

  // DEBUG: プランデータの詳細ログ
  console.log('🔍 プランデータ詳細確認:', {
    dayPlanExists: !!dayPlan,
    slotsExists: !!dayPlan.slots,
    slotsLength: dayPlan.slots?.length,
    rawSlots: dayPlan.slots,
    assignedSlotsLength: assignedSlots.length,
    allTasksLength: allTasks.length,
    allTasksData: allTasks
  });

  if (assignedSlots.length === 0) {
    console.log('❌ 割り当て済みスロットなし - 空メッセージ表示');
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'plan-empty';
    emptyMessage.textContent = 'プランが設定されていません';
    planList.appendChild(emptyMessage);
    return;
  }

  // タスクごとにグループ化（プランの順序を保持）
  const taskGroups = new Map();
  const taskOrder: string[] = [];

  assignedSlots.forEach((slot: any) => {
    if (!taskGroups.has(slot.taskId)) {
      taskGroups.set(slot.taskId, []);
      taskOrder.push(slot.taskId);
    }
    taskGroups.get(slot.taskId).push(slot);
  });

  console.log('📋 タスクグループ:', {
    groupCount: taskGroups.size,
    taskOrder: taskOrder,
    allTasksIds: allTasks?.map(t => t.id) || []
  });

  // プランの順序でタスクグループを描画
  taskOrder.forEach((taskId: string) => {
    const slots = taskGroups.get(taskId);
    const task = allTasks.find(t => t.id === taskId);

    console.log('🔍 タスク検索:', { taskId, found: !!task, taskName: task?.name });

    if (!task) {
      console.log('❌ タスクが見つからない:', taskId);
      return;
    }

    const completedCount = slots.filter((s: any) => s.completed).length;
    const totalCount = slots.length;
    const isCurrentTask = currentSlot && slots.some((s: any) => s.id === currentSlot.id);

    const planItem = createPlanItem(task, completedCount, totalCount, isCurrentTask);
    planList.appendChild(planItem);

    console.log('✅ プランアイテム追加:', { taskName: task.name, completedCount, totalCount, isCurrentTask });
  });

  console.log('✅ プラン一覧描画完了');
}

/**
 * プランアイテムを作成する
 */
function createPlanItem(task: any, completedCount: number, totalCount: number, isCurrent: boolean): HTMLElement {
  const planItem = document.createElement('div');
  planItem.className = `plan-item ${isCurrent ? 'current' : ''} ${completedCount === totalCount ? 'completed' : ''}`;
  planItem.setAttribute('data-task-id', task.id);
  planItem.setAttribute('draggable', 'true');

  // ドラッグ&ドロップイベント
  planItem.addEventListener('dragstart', handlePlanDragStart);
  planItem.addEventListener('dragover', handlePlanDragOver);
  planItem.addEventListener('drop', handlePlanDrop);
  planItem.addEventListener('dragend', handlePlanDragEnd);

  // ステータスアイコン
  const status = document.createElement('div');
  status.className = `plan-item-status ${
    completedCount === totalCount ? 'completed' : isCurrent ? 'current' : 'pending'
  }`;

  if (completedCount === totalCount) {
    status.textContent = '✓';
  } else if (isCurrent) {
    status.textContent = '▶';
  } else {
    status.textContent = (completedCount + 1).toString();
  }

  // タスク名
  const name = document.createElement('div');
  name.className = 'plan-item-name';
  name.textContent = task.name;
  name.title = task.name; // ツールチップ

  // 進捗表示
  const progress = document.createElement('div');
  progress.className = 'plan-item-progress';
  progress.textContent = `${completedCount}/${totalCount}`;

  // アクションボタン（現在のタスクで未完了の場合のみ）
  let actions = null;
  if (isCurrent && completedCount < totalCount) {
    actions = document.createElement('div');
    actions.className = 'plan-item-actions';

    const completeBtn = document.createElement('button');
    completeBtn.className = 'plan-complete-btn';
    completeBtn.title = '完了';
    completeBtn.innerHTML = `
      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
      </svg>
    `;
    completeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handlePlanItemComplete(task.id);
    });

    actions.appendChild(completeBtn);
  }

  planItem.appendChild(status);
  planItem.appendChild(name);
  planItem.appendChild(progress);
  if (actions) {
    planItem.appendChild(actions);
  }

  return planItem;
}

/**
 * プランアイテムの完了処理
 */
async function handlePlanItemComplete(taskId: string) {
  if (!currentSlot || currentSlot.taskId !== taskId) {
    console.error('現在のスロットと一致しないタスクです');
    return;
  }

  try {
    console.log('🎯 プランアイテム完了処理開始:', { taskId, slotId: currentSlot.id });

    // 現在のスロットを完了状態にする
    const { completePomodoro, updateTask } = await import('../utils/storage.js');
    await completePomodoro(currentSlot.id);
    console.log('✅ ポモドーロ完了マーク完了');

    // タスクの実績ポモドーロ数を更新
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      await updateTask(taskId, {
        actualPomodoros: task.actualPomodoros + 1
      });
      console.log('✅ タスクの実績ポモドーロ数更新完了');
    }

    // 即座にカンバンに変更を通知（複数回送信で確実性を向上）
    console.log('📤 カンバンに完了通知送信中...');
    const notificationMessage = {
      action: 'PLAN_UPDATED',
      data: {
        completed: true,
        taskId: taskId,
        slotId: currentSlot.id,
        timestamp: Date.now()
      }
    };

    // 即座に送信
    chrome.runtime.sendMessage(notificationMessage);

    // 少し遅延してから再送信（確実性のため）
    setTimeout(() => {
      chrome.runtime.sendMessage(notificationMessage);
      console.log('📤 カンバンに再送信完了');
    }, 50);

    // プラン情報を再読み込み
    await initializePlan();

    // タスク情報も再読み込み
    allTasks = await getAllTasks();
    currentTask = await getCurrentTask();

    // 表示を更新
    await updateCurrentTaskDisplay();
    updatePlanDisplay();

    console.log('✅ プランアイテム完了処理完了');

  } catch (error) {
    console.error('❌ プラン完了処理に失敗しました:', error);
  }
}

/**
 * プランアイテムのドラッグ開始処理
 */
function handlePlanDragStart(event: DragEvent) {
  const target = event.target as HTMLElement;
  const taskId = target.getAttribute('data-task-id');

  if (taskId && event.dataTransfer) {
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
    target.style.opacity = '0.5';
    target.classList.add('dragging');
  }
}

/**
 * プランアイテムのドラッグオーバー処理
 */
function handlePlanDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  const target = event.target as HTMLElement;
  const planItem = target.closest('.plan-item') as HTMLElement;
  if (planItem && !planItem.classList.contains('dragging')) {
    planItem.classList.add('drag-over');
  }
}

/**
 * プランアイテムのドロップ処理
 */
async function handlePlanDrop(event: DragEvent) {
  event.preventDefault();

  const target = event.target as HTMLElement;
  const dropTarget = target.closest('.plan-item') as HTMLElement;
  const draggedTaskId = event.dataTransfer?.getData('text/plain');
  const targetTaskId = dropTarget?.getAttribute('data-task-id');

  if (draggedTaskId && targetTaskId && draggedTaskId !== targetTaskId) {
    try {
      await reorderPlanTasks(draggedTaskId, targetTaskId);
    } catch (error) {
      console.error('プラン並び替えに失敗しました:', error);
    }
  }

  // スタイルをクリア
  document.querySelectorAll('.plan-item').forEach(item => {
    item.classList.remove('drag-over');
  });
}

/**
 * プランアイテムのドラッグ終了処理
 */
function handlePlanDragEnd(event: DragEvent) {
  const target = event.target as HTMLElement;
  target.style.opacity = '1';
  target.classList.remove('dragging');

  // 全ての drag-over クラスを削除
  document.querySelectorAll('.plan-item').forEach(item => {
    item.classList.remove('drag-over');
  });
}

/**
 * プランタスクの順序を変更する
 */
async function reorderPlanTasks(draggedTaskId: string, targetTaskId: string) {
  if (!dayPlan) return;

  try {
    console.log('🔄 プランタスク並び替え開始:', { draggedTaskId, targetTaskId });

    // ドラッグされたタスクのスロットを取得
    const draggedSlots = dayPlan.slots.filter((slot: any) => slot.taskId === draggedTaskId);
    const targetSlots = dayPlan.slots.filter((slot: any) => slot.taskId === targetTaskId);

    if (draggedSlots.length === 0 || targetSlots.length === 0) return;

    // 最初のスロットの位置を基準に並び替え
    const draggedFirstSlotIndex = dayPlan.slots.findIndex((slot: any) => slot.id === draggedSlots[0].id);
    const targetFirstSlotIndex = dayPlan.slots.findIndex((slot: any) => slot.id === targetSlots[0].id);

    if (draggedFirstSlotIndex === -1 || targetFirstSlotIndex === -1) return;

    // スロットを移動
    const updatedSlots = [...dayPlan.slots];

    // ドラッグされたタスクのスロットを削除
    draggedSlots.reverse().forEach(() => {
      updatedSlots.splice(draggedFirstSlotIndex, 1);
    });

    // 新しい位置を計算（削除後のインデックス調整）
    const newTargetIndex = targetFirstSlotIndex > draggedFirstSlotIndex
      ? targetFirstSlotIndex - draggedSlots.length
      : targetFirstSlotIndex;

    // 新しい位置に挿入
    updatedSlots.splice(newTargetIndex, 0, ...draggedSlots);

    // プランを更新
    const { updateDayPlan } = await import('../utils/storage.js');
    const updatedPlan = { ...dayPlan, slots: updatedSlots };
    await updateDayPlan(updatedPlan);

    console.log('✅ プラン並び替え完了');

    // カンバンに変更を通知
    console.log('📤 カンバンに並び替え通知送信');
    chrome.runtime.sendMessage({
      action: 'PLAN_UPDATED',
      data: { reordered: true }
    });

    // プラン情報を再読み込み
    await initializePlan();

    console.log('✅ プランタスク並び替え完了');

  } catch (error) {
    console.error('❌ プラン並び替えエラー:', error);
    throw error;
  }
}

/**
 * デバッグ用: テストタスクを作成してプランに追加
 * コンソールで createTestTaskAndAddToPlan('タスク名', ポモドーロ数) を実行
 */
async function createTestTaskAndAddToPlan(taskName: string = 'テストタスク', pomodoros: number = 2) {
  try {
    console.log('🧪 テストタスク作成開始:', { taskName, pomodoros });

    // タスクを作成
    const newTask = createTask(taskName, `${taskName}の説明`, pomodoros);
    await saveTask(newTask);
    console.log('✅ タスク作成完了:', newTask);

    // allTasksを更新
    allTasks = await getAllTasks();
    console.log('📋 タスクリスト更新:', { count: allTasks.length, taskIds: allTasks.map(t => t.id) });

    // プランに自動追加
    if (dayPlan) {
      console.log('📅 プラン追加前のdayPlan:', {
        slots: dayPlan.slots.map((s: any) => ({ id: s.id, taskId: s.taskId, completed: s.completed }))
      });

      const { assignTaskToSlot } = await import('../utils/storage.js');
      const emptySlots = dayPlan.slots.filter((slot: any) => !slot.taskId);

      if (emptySlots.length >= pomodoros) {
        const firstEmptySlotId = emptySlots[0].id;
        console.log('🎯 プラン追加実行中:', { taskId: newTask.id, slotId: firstEmptySlotId, pomodoros });

        await assignTaskToSlot(firstEmptySlotId, newTask.id, pomodoros);
        console.log('✅ assignTaskToSlot完了');

        // assignTaskToSlot直後のプラン状態を確認
        const { getTodayDayPlan } = await import('../utils/storage.js');
        const updatedPlan = await getTodayDayPlan();
        console.log('📅 assignTaskToSlot直後のdayPlan:', {
          slots: updatedPlan.slots.map((s: any) => ({ id: s.id, taskId: s.taskId, completed: s.completed }))
        });

        // プラン情報を再読み込み
        console.log('🔄 initializePlan実行前 - allTasks:', allTasks.map(t => ({ id: t.id, name: t.name })));
        await initializePlan();
        console.log('🔄 initializePlan実行後 - dayPlan:', {
          slots: dayPlan?.slots.map((s: any) => ({ id: s.id, taskId: s.taskId, completed: s.completed }))
        });

        // 表示を更新
        await updateCurrentTaskDisplay();
        updatePlanDisplay();

        console.log('🎉 テストタスク作成とプラン追加が完了しました！');
      } else {
        console.log('❌ 空きスロットが不足:', { required: pomodoros, available: emptySlots.length });
      }
    }
  } catch (error) {
    console.error('❌ テストタスク作成に失敗:', error);
  }
}

// デバッグ関数をglobalにエクスポート（開発時のみ）
if (typeof window !== 'undefined') {
  (window as any).createTestTaskAndAddToPlan = createTestTaskAndAddToPlan;
  (window as any).debugPomodoro = {
    createTestTask: createTestTaskAndAddToPlan,
    clearInvalidSlots: validatePlanData,
    forceUpdatePlan: async () => {
      console.log('🔄 強制プラン更新開始');
      await initializePlan();
      await updateCurrentTaskDisplay();
      updatePlanDisplay();
      console.log('✅ 強制プラン更新完了');
    },
    testKanbanSync: () => {
      console.log('🧪 カンバン同期テスト送信');
      chrome.runtime.sendMessage({
        action: 'PLAN_UPDATED',
        data: { test: true, timestamp: Date.now() }
      });
    },
    showCurrentState: () => ({
      dayPlan,
      allTasks,
      currentSlot,
      nextSlot
    })
  };
}

/**
 * 外部（カンバン）からの変更通知ハンドラー
 */
async function handleExternalUpdate() {
  console.log('🔄 外部変更による更新開始');

  try {
    // タスクデータを再取得（少し待ってからリトライ）
    await new Promise(resolve => setTimeout(resolve, 100));
    allTasks = await getAllTasks();
    console.log('📋 タスクデータ再取得:', { count: allTasks.length });

    // 現在のタスクも更新
    currentTask = await getCurrentTask();

    // プラン情報を再初期化
    await initializePlan();

    // 表示を更新
    await updateCurrentTaskDisplay();
    updatePlanDisplay();

    console.log('✅ 外部変更による更新完了');
  } catch (error) {
    console.error('❌ 外部変更による更新に失敗:', error);
  }
}

/**
 * タスクマネージャーを開くハンドラー
 */
function handleOpenTaskManagerClick() {
  window.open(chrome.runtime.getURL('src/popup/task-manager.html'), '_blank', 'width=900,height=700');
}

// 初期化時に実行
initialize();

import { MessageAction, SessionType, Task, TaskStatus, TimerSettings, TimerState } from '../types/index.js';
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
    completeTask,
    createTask,
    deleteTask,
    getAllTasks,
    getCurrentTask,
    getTaskSettings,
    getTaskStatistics,
    saveTask,
    saveTaskSettings,
    setCurrentTask,
    startTask,
    updateTask
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

// 設定関連のエレメント
const settingsToggle = document.getElementById('settings-toggle') as HTMLButtonElement;
const settingsPanel = document.getElementById('settings-panel') as HTMLElement;
const soundEnabledCheckbox = document.getElementById('sound-enabled') as HTMLInputElement;
const testWorkSoundBtn = document.getElementById('test-work-sound') as HTMLButtonElement;
const testBreakSoundBtn = document.getElementById('test-break-sound') as HTMLButtonElement;

// タスク管理関連のエレメント
const addTaskBtn = document.getElementById('add-task-btn') as HTMLButtonElement;
const currentTaskSelect = document.getElementById('current-task-select') as HTMLSelectElement;
const taskList = document.getElementById('task-list') as HTMLElement;
const taskStats = document.getElementById('task-stats') as HTMLElement;
const showTaskInPopupCheckbox = document.getElementById('show-task-in-popup') as HTMLInputElement;

// タスクモーダル関連のエレメント
const taskModal = document.getElementById('task-modal') as HTMLElement;
const taskModalTitle = document.getElementById('task-modal-title') as HTMLElement;
const closeTaskModalBtn = document.getElementById('close-task-modal') as HTMLButtonElement;
const taskForm = document.getElementById('task-form') as HTMLFormElement;
const taskNameInput = document.getElementById('task-name-input') as HTMLInputElement;
const taskDescriptionInput = document.getElementById('task-description-input') as HTMLTextAreaElement;
const estimatedPomodorosInput = document.getElementById('estimated-pomodoros-input') as HTMLSelectElement;
const cancelTaskBtn = document.getElementById('cancel-task-btn') as HTMLButtonElement;

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

// タスク管理の状態
let currentTask: Task | null = null;
let allTasks: Task[] = [];
let editingTaskId: string | null = null;

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
  addTaskBtn.addEventListener('click', handleAddTaskClick);
  currentTaskSelect.addEventListener('change', handleCurrentTaskChange);
  showTaskInPopupCheckbox.addEventListener('change', handleShowTaskInPopupChange);

  // タスクモーダル関連のイベントリスナー
  closeTaskModalBtn.addEventListener('click', closeTaskModal);
  cancelTaskBtn.addEventListener('click', closeTaskModal);
  taskForm.addEventListener('submit', handleTaskFormSubmit);
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeTaskModal();
  });

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

/**
 * タスク管理の初期化
 */
async function initializeTasks() {
  // 現在のタスクを取得
  currentTask = await getCurrentTask();

  // 全タスクを取得
  allTasks = await getAllTasks();

  // タスク設定を読み込み
  const taskSettings = await getTaskSettings();
  showTaskInPopupCheckbox.checked = taskSettings.showTaskInPopup;

  // 表示を更新
  await updateCurrentTaskDisplay();
  updateTaskList();
  updateTaskSelect();
  updateTaskStats();
}

/**
 * 現在のタスク表示を更新
 */
async function updateCurrentTaskDisplay() {
  const taskSettings = await getTaskSettings();

  if (currentTask && taskSettings.showTaskInPopup) {
    currentTaskName.textContent = currentTask.name;
    currentTaskName.classList.remove('hidden');
    noTaskMessage.classList.add('hidden');
  } else {
    currentTaskName.classList.add('hidden');
    noTaskMessage.classList.remove('hidden');
  }
}

/**
 * タスクリストを更新
 */
function updateTaskList() {
  taskList.innerHTML = '';

  // 進行中のタスクを最初に表示
  const inProgressTasks = allTasks.filter(task => task.status === TaskStatus.InProgress);
  const pendingTasks = allTasks.filter(task => task.status === TaskStatus.Pending);
  const completedTasks = allTasks.filter(task => task.status === TaskStatus.Completed).slice(0, 3); // 最新3件のみ

  const tasksToShow = [...inProgressTasks, ...pendingTasks, ...completedTasks];

  if (tasksToShow.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'text-xs text-gray-400 text-center py-2';
    emptyMessage.textContent = 'タスクがありません';
    taskList.appendChild(emptyMessage);
    return;
  }

  tasksToShow.forEach(task => {
    const taskItem = createTaskItem(task);
    taskList.appendChild(taskItem);
  });
}

/**
 * タスクアイテムのHTML要素を作成
 */
function createTaskItem(task: Task): HTMLElement {
  const taskItem = document.createElement('div');
  taskItem.className = `task-item task-${task.status}`;

  const taskInfo = document.createElement('div');
  taskInfo.className = 'flex-1 min-w-0';

  const taskName = document.createElement('div');
  taskName.className = 'task-name';
  taskName.textContent = task.name;
  taskName.title = task.description || task.name;

  const taskMeta = document.createElement('div');
  taskMeta.className = 'flex items-center gap-2 mt-1';

  const statusBadge = document.createElement('span');
  statusBadge.className = `task-status-badge task-status-${task.status}`;
  statusBadge.textContent = getStatusText(task.status);

  const pomodoroCount = document.createElement('span');
  pomodoroCount.className = 'task-pomodoro-count';
  pomodoroCount.textContent = `🍅 ${task.pomodoroCount}`;
  if (task.estimatedPomodoros) {
    pomodoroCount.textContent += `/${task.estimatedPomodoros}`;
  }

  taskMeta.appendChild(statusBadge);
  taskMeta.appendChild(pomodoroCount);

  taskInfo.appendChild(taskName);
  taskInfo.appendChild(taskMeta);

  const taskActions = document.createElement('div');
  taskActions.className = 'task-actions';

  // アクションボタンを作成
  if (task.status === TaskStatus.Pending) {
    const startBtn = createTaskActionButton('▶', 'start', () => handleTaskStart(task.id));
    taskActions.appendChild(startBtn);
  } else if (task.status === TaskStatus.InProgress) {
    const completeBtn = createTaskActionButton('✓', 'complete', () => handleTaskComplete(task.id));
    taskActions.appendChild(completeBtn);
  }

  const editBtn = createTaskActionButton('✏', 'edit', () => handleTaskEdit(task.id));
  const deleteBtn = createTaskActionButton('🗑', 'delete', () => handleTaskDelete(task.id));

  taskActions.appendChild(editBtn);
  taskActions.appendChild(deleteBtn);

  taskItem.appendChild(taskInfo);
  taskItem.appendChild(taskActions);

  return taskItem;
}

/**
 * タスクアクションボタンを作成
 */
function createTaskActionButton(text: string, className: string, onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.className = `task-action-btn ${className}`;
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * タスクステータスのテキストを取得
 */
function getStatusText(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.Pending:
      return '待機中';
    case TaskStatus.InProgress:
      return '進行中';
    case TaskStatus.Completed:
      return '完了';
    default:
      return '不明';
  }
}

/**
 * タスク選択セレクトボックスを更新
 */
function updateTaskSelect() {
  currentTaskSelect.innerHTML = '<option value="">タスクを選択...</option>';

  const availableTasks = allTasks.filter(task =>
    task.status === TaskStatus.Pending || task.status === TaskStatus.InProgress
  );

  availableTasks.forEach(task => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = task.name;
    if (currentTask && currentTask.id === task.id) {
      option.selected = true;
    }
    currentTaskSelect.appendChild(option);
  });
}

/**
 * タスク統計を更新
 */
async function updateTaskStats() {
  const stats = await getTaskStatistics();

  taskStats.innerHTML = `
    <div class="flex justify-between text-xs">
      <span>総タスク: ${stats.total}</span>
      <span>完了: ${stats.completed}</span>
      <span>🍅: ${stats.totalPomodoros}</span>
    </div>
  `;
}

/**
 * タスク追加ボタンのクリックハンドラー
 */
function handleAddTaskClick() {
  editingTaskId = null;
  taskModalTitle.textContent = '新しいタスク';
  taskNameInput.value = '';
  taskDescriptionInput.value = '';
  estimatedPomodorosInput.value = '';
  openTaskModal();
}

/**
 * 現在のタスク選択の変更ハンドラー
 */
async function handleCurrentTaskChange() {
  const selectedTaskId = currentTaskSelect.value;

  if (selectedTaskId) {
    await setCurrentTask(selectedTaskId);
    currentTask = await getCurrentTask();

    // 選択したタスクを進行中にする
    if (currentTask && currentTask.status === TaskStatus.Pending) {
      await startTask(selectedTaskId);
      allTasks = await getAllTasks();
      updateTaskList();
    }
  } else {
    await setCurrentTask(undefined);
    currentTask = null;
  }

  await updateCurrentTaskDisplay();
}

/**
 * ポップアップにタスク名表示設定の変更ハンドラー
 */
async function handleShowTaskInPopupChange() {
  await saveTaskSettings({
    showTaskInPopup: showTaskInPopupCheckbox.checked
  });

  await updateCurrentTaskDisplay();
}

/**
 * タスクモーダルを開く
 */
function openTaskModal() {
  taskModal.classList.remove('hidden');
  taskNameInput.focus();
}

/**
 * タスクモーダルを閉じる
 */
function closeTaskModal() {
  taskModal.classList.add('hidden');
  editingTaskId = null;
}

/**
 * タスクフォームの送信ハンドラー
 */
async function handleTaskFormSubmit(e: Event) {
  e.preventDefault();

  const name = taskNameInput.value.trim();
  if (!name) return;

  const description = taskDescriptionInput.value.trim() || undefined;
  const estimatedPomodoros = estimatedPomodorosInput.value ?
    parseInt(estimatedPomodorosInput.value) : undefined;

  if (editingTaskId) {
    // 既存タスクの編集
    await updateTask(editingTaskId, {
      name,
      description,
      estimatedPomodoros
    });
  } else {
    // 新しいタスクの作成
    const newTask = createTask(name, description, estimatedPomodoros);
    await saveTask(newTask);
  }

  // データを再読み込みして表示を更新
  allTasks = await getAllTasks();
  updateTaskList();
  updateTaskSelect();
  updateTaskStats();

  closeTaskModal();
}

/**
 * タスク開始ハンドラー
 */
async function handleTaskStart(taskId: string) {
  await startTask(taskId);
  await setCurrentTask(taskId);

  currentTask = await getCurrentTask();
  allTasks = await getAllTasks();

  await updateCurrentTaskDisplay();
  updateTaskList();
  updateTaskSelect();
}

/**
 * タスク完了ハンドラー
 */
async function handleTaskComplete(taskId: string) {
  await completeTask(taskId);

  // 現在のタスクが完了した場合はクリア
  if (currentTask && currentTask.id === taskId) {
    currentTask = null;
  }

  allTasks = await getAllTasks();

  await updateCurrentTaskDisplay();
  updateTaskList();
  updateTaskSelect();
  updateTaskStats();
}

/**
 * タスク編集ハンドラー
 */
async function handleTaskEdit(taskId: string) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  editingTaskId = taskId;
  taskModalTitle.textContent = 'タスクを編集';
  taskNameInput.value = task.name;
  taskDescriptionInput.value = task.description || '';
  estimatedPomodorosInput.value = task.estimatedPomodoros?.toString() || '';

  openTaskModal();
}

/**
 * タスク削除ハンドラー
 */
async function handleTaskDelete(taskId: string) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  if (confirm(`タスク「${task.name}」を削除しますか？`)) {
    await deleteTask(taskId);

    // 現在のタスクが削除された場合はクリア
    if (currentTask && currentTask.id === taskId) {
      currentTask = null;
    }

    allTasks = await getAllTasks();

    await updateCurrentTaskDisplay();
    updateTaskList();
    updateTaskSelect();
    updateTaskStats();
  }
}

// 初期化時に実行
initialize();

import { TaskManager } from '../components/TaskManager';
import { StorageKey, TaskSettings, TimerSettings } from '../types';
import {
    createDayPlan,
    getStorageData,
    setStorageData,
    updateDayPlan,
    updateTodayStatistics
} from '../utils/storage';

// HTMLエレメントの取得
const taskManagerContainer = document.getElementById('task-manager-container') as HTMLElement;
const daySummary = document.getElementById('day-summary') as HTMLElement;
const backToTimerBtn = document.getElementById('back-to-timer') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const settingsPanel = document.getElementById('settings-panel') as HTMLElement;

// 設定関連エレメント
const dailySlotsSelect = document.getElementById('daily-slots') as HTMLSelectElement;
const autoStartNextTaskCheckbox = document.getElementById('auto-start-next-task') as HTMLInputElement;
const kanbanViewEnabledCheckbox = document.getElementById('kanban-view-enabled') as HTMLInputElement;
const clearTodayPlanBtn = document.getElementById('clear-today-plan') as HTMLButtonElement;
const clearAllTasksBtn = document.getElementById('clear-all-tasks') as HTMLButtonElement;

// 統計関連エレメント
const statisticsToggle = document.getElementById('statistics-toggle') as HTMLButtonElement;
const statisticsContent = document.getElementById('statistics-content') as HTMLElement;
const statisticsArrow = document.getElementById('statistics-arrow') as HTMLElement;
const dailyStatistics = document.getElementById('daily-statistics') as HTMLElement;

// 確認モーダル関連エレメント
const confirmationModal = document.getElementById('confirmation-modal') as HTMLElement;
const confirmationTitle = document.getElementById('confirmation-title') as HTMLElement;
const confirmationMessage = document.getElementById('confirmation-message') as HTMLElement;
const confirmationCancel = document.getElementById('confirmation-cancel') as HTMLButtonElement;
const confirmationConfirm = document.getElementById('confirmation-confirm') as HTMLButtonElement;

// グローバル変数
let taskManager: TaskManager | null = null;
let currentConfirmAction: (() => Promise<void>) | null = null;

/**
 * 初期化
 */
async function initialize() {
  try {
    // スタイルを読み込み
    TaskManager.loadStyles();

    // タスクマネージャーを初期化
    taskManager = new TaskManager(taskManagerContainer);

    // 初期データを読み込み
    await loadSettings();
    await updateDaySummary();
    await updateStatistics();

    // イベントリスナーを設定
    setupEventListeners();

    console.log('タスクマネージャーが初期化されました');
  } catch (error) {
    console.error('初期化エラー:', error);
    showError('初期化に失敗しました。ページをリロードしてください。');
  }
}

/**
 * 設定を読み込み
 */
async function loadSettings() {
  const timerSettings = await getStorageData(StorageKey.TIMER_SETTINGS);
  const taskSettings = await getStorageData(StorageKey.TASK_SETTINGS);

  // スロット数設定
  if (timerSettings?.dailySlots) {
    dailySlotsSelect.value = timerSettings.dailySlots.toString();
  }

  // タスク設定
  if (taskSettings) {
    autoStartNextTaskCheckbox.checked = taskSettings.autoStartNextTask || false;
    kanbanViewEnabledCheckbox.checked = taskSettings.kanbanView !== false;
  }
}

/**
 * 今日のサマリーを更新
 */
async function updateDaySummary() {
  if (!taskManager) return;

  try {
    const summary = await taskManager.getDayPlanSummary();
    const todayString = new Date().toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });

    daySummary.innerHTML = `
      <div class="flex items-center gap-4">
        <span class="text-gray-500">${todayString}</span>
        <div class="flex items-center gap-2">
          <span class="text-green-600 font-medium">${summary.completed}</span>
          <span class="text-gray-400">/</span>
          <span class="text-blue-600 font-medium">${summary.planned}</span>
          <span class="text-gray-500 text-xs">🍅</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('サマリー更新エラー:', error);
    daySummary.textContent = 'エラー';
  }
}

/**
 * 統計情報を更新
 */
async function updateStatistics() {
  try {
    await updateTodayStatistics();
    const statistics = await getStorageData(StorageKey.STATISTICS);
    const todayKey = new Date().toISOString().split('T')[0];
    const todayStats = statistics?.[todayKey];

    if (todayStats) {
      const achievementRate = todayStats.plannedPomodoros > 0
        ? Math.round((todayStats.completedPomodoros / todayStats.plannedPomodoros) * 100)
        : 0;

      dailyStatistics.innerHTML = `
        <div class="bg-blue-50 p-3 rounded-lg">
          <div class="text-blue-800 font-medium text-xs mb-1">計画ポモドーロ</div>
          <div class="text-blue-900 font-bold text-lg">${todayStats.plannedPomodoros}</div>
        </div>
        <div class="bg-green-50 p-3 rounded-lg">
          <div class="text-green-800 font-medium text-xs mb-1">完了ポモドーロ</div>
          <div class="text-green-900 font-bold text-lg">${todayStats.completedPomodoros}</div>
        </div>
        <div class="bg-purple-50 p-3 rounded-lg">
          <div class="text-purple-800 font-medium text-xs mb-1">完了タスク</div>
          <div class="text-purple-900 font-bold text-lg">${todayStats.completedTasks}</div>
        </div>
        <div class="bg-orange-50 p-3 rounded-lg">
          <div class="text-orange-800 font-medium text-xs mb-1">達成率</div>
          <div class="text-orange-900 font-bold text-lg">${achievementRate}%</div>
        </div>
      `;
    } else {
      dailyStatistics.innerHTML = `
        <div class="col-span-2 text-center text-gray-500 text-sm py-4">
          まだデータがありません
        </div>
      `;
    }
  } catch (error) {
    console.error('統計更新エラー:', error);
  }
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // ナビゲーション
  backToTimerBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
  });

  // 設定パネル切り替え
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // 統計パネル切り替え
  statisticsToggle.addEventListener('click', () => {
    statisticsContent.classList.toggle('hidden');
    statisticsArrow.classList.toggle('rotate-180');
  });

  // 設定変更
  dailySlotsSelect.addEventListener('change', handleDailySlotsChange);
  autoStartNextTaskCheckbox.addEventListener('change', handleAutoStartChange);
  kanbanViewEnabledCheckbox.addEventListener('change', handleKanbanViewChange);

  // データクリア
  clearTodayPlanBtn.addEventListener('click', () => {
    showConfirmation(
      '今日のプランをクリア',
      '今日のポモドーロプランをすべてクリアします。この操作は取り消せません。',
      handleClearTodayPlan
    );
  });

  clearAllTasksBtn.addEventListener('click', () => {
    showConfirmation(
      '全タスクを削除',
      'すべてのタスクとプランを削除します。この操作は取り消せません。',
      handleClearAllTasks
    );
  });

  // 確認モーダル
  confirmationCancel.addEventListener('click', hideConfirmation);
  confirmationConfirm.addEventListener('click', executeConfirmAction);
  confirmationModal.addEventListener('click', (e) => {
    if (e.target === confirmationModal) hideConfirmation();
  });

  // 定期更新
  setInterval(async () => {
    await updateDaySummary();
    await updateStatistics();
  }, 30000); // 30秒ごと
}

/**
 * スロット数変更処理
 */
async function handleDailySlotsChange() {
  try {
    const newSlotCount = parseInt(dailySlotsSelect.value, 10);
    const timerSettings = await getStorageData(StorageKey.TIMER_SETTINGS) || {} as TimerSettings;

    timerSettings.dailySlots = newSlotCount;
    await setStorageData(StorageKey.TIMER_SETTINGS, timerSettings);

    // 今日のプランを更新
    const todayKey = new Date().toISOString().split('T')[0];
    const dayPlans = await getStorageData(StorageKey.DAY_PLANS) || {};

    if (dayPlans[todayKey]) {
      const currentPlan = dayPlans[todayKey];
      const newPlan = createDayPlan(todayKey, newSlotCount);

      // 既存のスロット割り当てを可能な限り保持
      for (let i = 0; i < Math.min(currentPlan.slots.length, newPlan.slots.length); i++) {
        newPlan.slots[i].taskId = currentPlan.slots[i].taskId;
        newPlan.slots[i].completed = currentPlan.slots[i].completed;
        newPlan.slots[i].completedAt = currentPlan.slots[i].completedAt;
      }

      await updateDayPlan(newPlan);
    }

    // タスクマネージャーを更新
    if (taskManager) {
      await taskManager.refresh();
    }
    await updateDaySummary();

    showSuccess('スロット数を更新しました');
  } catch (error) {
    console.error('スロット数更新エラー:', error);
    showError('スロット数の更新に失敗しました');
  }
}

/**
 * 自動開始設定変更処理
 */
async function handleAutoStartChange() {
  try {
    const taskSettings = await getStorageData(StorageKey.TASK_SETTINGS) || {} as TaskSettings;
    taskSettings.autoStartNextTask = autoStartNextTaskCheckbox.checked;
    await setStorageData(StorageKey.TASK_SETTINGS, taskSettings);

    showSuccess('自動開始設定を更新しました');
  } catch (error) {
    console.error('自動開始設定更新エラー:', error);
    showError('設定の更新に失敗しました');
  }
}

/**
 * カンバンビュー設定変更処理
 */
async function handleKanbanViewChange() {
  try {
    const taskSettings = await getStorageData(StorageKey.TASK_SETTINGS) || {} as TaskSettings;
    taskSettings.kanbanView = kanbanViewEnabledCheckbox.checked;
    await setStorageData(StorageKey.TASK_SETTINGS, taskSettings);

    showSuccess('カンバンビュー設定を更新しました');
  } catch (error) {
    console.error('カンバンビュー設定更新エラー:', error);
    showError('設定の更新に失敗しました');
  }
}

/**
 * 今日のプランクリア処理
 */
async function handleClearTodayPlan() {
  try {
    const todayKey = new Date().toISOString().split('T')[0];
    const timerSettings = await getStorageData(StorageKey.TIMER_SETTINGS);
    const slotCount = timerSettings?.dailySlots || 6;

    const newPlan = createDayPlan(todayKey, slotCount);
    await updateDayPlan(newPlan);

    if (taskManager) {
      await taskManager.refresh();
    }
    await updateDaySummary();
    await updateStatistics();

    showSuccess('今日のプランをクリアしました');
  } catch (error) {
    console.error('プランクリアエラー:', error);
    showError('プランのクリアに失敗しました');
  }
}

/**
 * 全タスク削除処理
 */
async function handleClearAllTasks() {
  try {
    // 全タスクを削除
    await setStorageData(StorageKey.TASKS, []);

    // 今日のプランもクリア
    await handleClearTodayPlan();

    showSuccess('全タスクを削除しました');
  } catch (error) {
    console.error('全タスク削除エラー:', error);
    showError('タスクの削除に失敗しました');
  }
}

/**
 * 確認モーダルを表示
 */
function showConfirmation(title: string, message: string, action: () => Promise<void>) {
  confirmationTitle.textContent = title;
  confirmationMessage.textContent = message;
  currentConfirmAction = action;
  confirmationModal.classList.remove('hidden');
}

/**
 * 確認モーダルを非表示
 */
function hideConfirmation() {
  confirmationModal.classList.add('hidden');
  currentConfirmAction = null;
}

/**
 * 確認アクション実行
 */
async function executeConfirmAction() {
  if (currentConfirmAction) {
    try {
      await currentConfirmAction();
    } catch (error) {
      console.error('確認アクション実行エラー:', error);
      showError('操作に失敗しました');
    }
  }
  hideConfirmation();
}

/**
 * 成功メッセージ表示
 */
function showSuccess(message: string) {
  showToast(message, 'success');
}

/**
 * エラーメッセージ表示
 */
function showError(message: string) {
  showToast(message, 'error');
}

/**
 * トースト通知表示
 */
function showToast(message: string, type: 'success' | 'error') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 text-white text-sm ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  }`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 初期化を実行
initialize();

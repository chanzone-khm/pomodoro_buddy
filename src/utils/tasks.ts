import { RepeatType, StorageKey, Task, TaskSettings, TaskStatus } from '../types/index.js';

/**
 * タスクのデフォルト設定
 */
const DEFAULT_TASK_SETTINGS: TaskSettings = {
  autoStartNextTask: false,
  showTaskInPopup: true,
  kanbanView: true
};

/**
 * 新しいタスクを作成する
 */
export function createTask(name: string, description?: string, estimatePomodoros: number = 1): Task {
  return {
    id: generateTaskId(),
    name: name.trim(),
    description: description?.trim(),
    status: TaskStatus.Backlog,
    createdAt: Date.now(),
    actualPomodoros: 0,
    estimatePomodoros,
    repeatType: RepeatType.None,
    tags: []
  };
}

/**
 * タスクIDを生成する
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * すべてのタスクを取得する
 */
export async function getAllTasks(): Promise<Task[]> {
  try {
    const result = await chrome.storage.sync.get(StorageKey.TASKS);
    return result[StorageKey.TASKS] || [];
  } catch (error) {
    console.error('タスク取得エラー:', error);
    return [];
  }
}

/**
 * タスクを保存する
 */
export async function saveTask(task: Task): Promise<void> {
  try {
    const tasks = await getAllTasks();
    const existingIndex = tasks.findIndex(t => t.id === task.id);

    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }

    await chrome.storage.sync.set({
      [StorageKey.TASKS]: tasks
    });
  } catch (error) {
    console.error('タスク保存エラー:', error);
    throw error;
  }
}

/**
 * タスクを削除する
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const tasks = await getAllTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);

    await chrome.storage.sync.set({
      [StorageKey.TASKS]: filteredTasks
    });

    // 削除したタスクが現在のタスクの場合はクリア
    const currentTask = await getCurrentTask();
    if (currentTask && currentTask.id === taskId) {
      await setCurrentTask(undefined);
    }
  } catch (error) {
    console.error('タスク削除エラー:', error);
    throw error;
  }
}

/**
 * タスクを更新する
 */
export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  try {
    const tasks = await getAllTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex >= 0) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await chrome.storage.sync.set({
        [StorageKey.TASKS]: tasks
      });
    } else {
      throw new Error(`タスクが見つかりません: ${taskId}`);
    }
  } catch (error) {
    console.error('タスク更新エラー:', error);
    throw error;
  }
}

/**
 * タスクを開始する
 */
export async function startTask(taskId: string): Promise<void> {
  try {
    await updateTask(taskId, {
      status: TaskStatus.Doing,
      startedAt: Date.now()
    });
  } catch (error) {
    console.error('タスク開始エラー:', error);
    throw error;
  }
}

/**
 * タスクを完了する
 */
export async function completeTask(taskId: string): Promise<void> {
  try {
    await updateTask(taskId, {
      status: TaskStatus.Done,
      completedAt: Date.now()
    });

    // 完了したタスクが現在のタスクの場合はクリア
    const currentTask = await getCurrentTask();
    if (currentTask && currentTask.id === taskId) {
      await setCurrentTask(undefined);
    }
  } catch (error) {
    console.error('タスク完了エラー:', error);
    throw error;
  }
}

/**
 * タスクのポモドーロ数を増加する
 */
export async function incrementTaskPomodoro(taskId: string): Promise<void> {
  try {
    const tasks = await getAllTasks();
    const task = tasks.find(t => t.id === taskId);

    if (task) {
      await updateTask(taskId, {
        actualPomodoros: task.actualPomodoros + 1
      });
    }
  } catch (error) {
    console.error('ポモドーロ数更新エラー:', error);
    throw error;
  }
}

/**
 * 現在のタスクを取得する
 */
export async function getCurrentTask(): Promise<Task | null> {
  try {
    const settings = await getTaskSettings();
    if (!settings.currentTaskId) {
      return null;
    }

    const tasks = await getAllTasks();
    return tasks.find(task => task.id === settings.currentTaskId) || null;
  } catch (error) {
    console.error('現在のタスク取得エラー:', error);
    return null;
  }
}

/**
 * 現在のタスクを設定する
 */
export async function setCurrentTask(taskId?: string): Promise<void> {
  try {
    const settings = await getTaskSettings();
    await saveTaskSettings({
      ...settings,
      currentTaskId: taskId
    });
  } catch (error) {
    console.error('現在のタスク設定エラー:', error);
    throw error;
  }
}

/**
 * タスク設定を取得する
 */
export async function getTaskSettings(): Promise<TaskSettings> {
  try {
    const result = await chrome.storage.sync.get(StorageKey.TASK_SETTINGS);
    return { ...DEFAULT_TASK_SETTINGS, ...result[StorageKey.TASK_SETTINGS] };
  } catch (error) {
    console.error('タスク設定取得エラー:', error);
    return DEFAULT_TASK_SETTINGS;
  }
}

/**
 * タスク設定を保存する
 */
export async function saveTaskSettings(settings: Partial<TaskSettings>): Promise<void> {
  try {
    const currentSettings = await getTaskSettings();
    const newSettings = { ...currentSettings, ...settings };

    await chrome.storage.sync.set({
      [StorageKey.TASK_SETTINGS]: newSettings
    });
  } catch (error) {
    console.error('タスク設定保存エラー:', error);
    throw error;
  }
}

/**
 * タスク統計を取得する
 */
export async function getTaskStatistics(): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  totalPomodoros: number;
}> {
  try {
    const tasks = await getAllTasks();

    const stats = {
      total: tasks.length,
      pending: tasks.filter(task => task.status === TaskStatus.Backlog).length,
      inProgress: tasks.filter(task => task.status === TaskStatus.Doing).length,
      completed: tasks.filter(task => task.status === TaskStatus.Done).length,
      totalPomodoros: tasks.reduce((sum, task) => sum + task.actualPomodoros, 0)
    };

    return stats;
  } catch (error) {
    console.error('タスク統計取得エラー:', error);
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      totalPomodoros: 0
    };
  }
}

/**
 * 待機中のタスクを取得する
 */
export async function getPendingTasks(): Promise<Task[]> {
  try {
    const tasks = await getAllTasks();
    return tasks.filter(task => task.status === TaskStatus.Backlog);
  } catch (error) {
    console.error('待機中タスク取得エラー:', error);
    return [];
  }
}

/**
 * 進行中のタスクを取得する
 */
export async function getInProgressTasks(): Promise<Task[]> {
  try {
    const tasks = await getAllTasks();
    return tasks.filter(task => task.status === TaskStatus.Doing);
  } catch (error) {
    console.error('進行中タスク取得エラー:', error);
    return [];
  }
}

/**
 * 完了済みのタスクを取得する
 */
export async function getCompletedTasks(): Promise<Task[]> {
  try {
    const tasks = await getAllTasks();
    return tasks.filter(task => task.status === TaskStatus.Done);
  } catch (error) {
    console.error('完了済みタスク取得エラー:', error);
    return [];
  }
}

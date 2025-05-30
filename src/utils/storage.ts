import {
    DayPlan,
    PomodoroSlot,
    RepeatType,
    Statistics,
    StorageData,
    StorageKey,
    Task,
    TaskStatus
} from '../types';

/**
 * ストレージからデータを取得
 */
export async function getStorageData<K extends keyof StorageData>(
  key: K
): Promise<StorageData[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

/**
 * ストレージにデータを保存
 */
export async function setStorageData<K extends keyof StorageData>(
  key: K,
  data: StorageData[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: data });
}

/**
 * 全タスクを取得
 */
export async function getAllTasks(): Promise<Task[]> {
  const tasks = await getStorageData(StorageKey.TASKS);
  return tasks || [];
}

/**
 * タスクを保存
 */
export async function saveTasks(tasks: Task[]): Promise<void> {
  await setStorageData(StorageKey.TASKS, tasks);
}

/**
 * 新しいタスクを作成
 */
export function createTask(
  name: string,
  description?: string,
  estimatePomodoros: number = 1,
  repeatType: RepeatType = RepeatType.None
): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    status: TaskStatus.Backlog,
    createdAt: Date.now(),
    actualPomodoros: 0,
    estimatePomodoros,
    repeatType,
    tags: []
  };
}

/**
 * タスクを追加
 */
export async function addTask(task: Task): Promise<void> {
  const tasks = await getAllTasks();
  tasks.push(task);
  await saveTasks(tasks);
}

/**
 * タスクを更新
 */
export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  const tasks = await getAllTasks();
  const index = tasks.findIndex(task => task.id === taskId);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    await saveTasks(tasks);
  }
}

/**
 * タスクを削除
 */
export async function deleteTask(taskId: string): Promise<void> {
  const tasks = await getAllTasks();
  const filteredTasks = tasks.filter(task => task.id !== taskId);
  await saveTasks(filteredTasks);
}

/**
 * 今日の日付文字列を取得（YYYY-MM-DD形式）
 */
export function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * 新しいポモドーロスロットを作成
 */
export function createPomodoroSlot(order: number, taskId?: string): PomodoroSlot {
  return {
    id: `slot-${Date.now()}-${order}-${Math.random().toString(36).substr(2, 9)}`,
    taskId,
    completed: false,
    order
  };
}

/**
 * 新しいデイプランを作成
 */
export function createDayPlan(date: string, slotCount: number = 6): DayPlan {
  const slots: PomodoroSlot[] = [];
  for (let i = 0; i < slotCount; i++) {
    slots.push(createPomodoroSlot(i));
  }

  return {
    date,
    slots,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * 今日のデイプランを取得（存在しなければ作成）
 */
export async function getTodayDayPlan(): Promise<DayPlan> {
  const dayPlans = await getStorageData(StorageKey.DAY_PLANS) || {};
  const today = getTodayString();

  if (!dayPlans[today]) {
    // 設定からスロット数を取得
    const timerSettings = await getStorageData(StorageKey.TIMER_SETTINGS);
    const slotCount = timerSettings?.dailySlots || 6;

    dayPlans[today] = createDayPlan(today, slotCount);
    await setStorageData(StorageKey.DAY_PLANS, dayPlans);
  }

  return dayPlans[today];
}

/**
 * デイプランを更新
 */
export async function updateDayPlan(dayPlan: DayPlan): Promise<void> {
  const dayPlans = await getStorageData(StorageKey.DAY_PLANS) || {};
  dayPlans[dayPlan.date] = {
    ...dayPlan,
    updatedAt: Date.now()
  };
  await setStorageData(StorageKey.DAY_PLANS, dayPlans);
}

/**
 * スロットにタスクを割り当て
 */
export async function assignTaskToSlot(
  slotId: string,
  taskId: string,
  estimatePomodoros: number = 1
): Promise<void> {
  const dayPlan = await getTodayDayPlan();
  const slotIndex = dayPlan.slots.findIndex(slot => slot.id === slotId);

  if (slotIndex !== -1) {
    // 指定されたスロットから連続でestimatePomodoros分のスロットを確保
    for (let i = 0; i < estimatePomodoros && slotIndex + i < dayPlan.slots.length; i++) {
      if (!dayPlan.slots[slotIndex + i].taskId) {
        dayPlan.slots[slotIndex + i].taskId = taskId;
      }
    }

    // タスクのステータスをDoingに更新
    await updateTask(taskId, { status: TaskStatus.Doing, startedAt: Date.now() });
    await updateDayPlan(dayPlan);
  }
}

/**
 * スロットからタスクを削除
 */
export async function removeTaskFromSlot(slotId: string): Promise<void> {
  const dayPlan = await getTodayDayPlan();
  const slot = dayPlan.slots.find(s => s.id === slotId);

  if (slot && slot.taskId) {
    const taskId = slot.taskId;

    // 同じタスクが割り当てられている全スロットをクリア
    dayPlan.slots.forEach(s => {
      if (s.taskId === taskId) {
        s.taskId = undefined;
        s.completed = false;
        s.completedAt = undefined;
      }
    });

    // タスクのステータスをBacklogに戻す
    await updateTask(taskId, { status: TaskStatus.Backlog, startedAt: undefined });
    await updateDayPlan(dayPlan);
  }
}

/**
 * ポモドーロ完了処理
 */
export async function completePomodoro(slotId: string): Promise<void> {
  const dayPlan = await getTodayDayPlan();
  const slot = dayPlan.slots.find(s => s.id === slotId);

  if (slot && slot.taskId && !slot.completed) {
    // スロットを完了状態に
    slot.completed = true;
    slot.completedAt = Date.now();

    // タスクの実績を更新
    const tasks = await getAllTasks();
    const task = tasks.find(t => t.id === slot.taskId);

    if (task) {
      task.actualPomodoros += 1;

      // 全ての予定ポモドーロが完了した場合、タスクを完了状態に
      if (task.actualPomodoros >= task.estimatePomodoros) {
        task.status = TaskStatus.Done;
        task.completedAt = Date.now();
      }

      await saveTasks(tasks);
    }

    await updateDayPlan(dayPlan);
  }
}

/**
 * 今日の統計を更新
 */
export async function updateTodayStatistics(): Promise<void> {
  const today = getTodayString();
  const dayPlan = await getTodayDayPlan();
  const tasks = await getAllTasks();

  const plannedPomodoros = dayPlan.slots.filter(slot => slot.taskId).length;
  const completedPomodoros = dayPlan.slots.filter(slot => slot.completed).length;
  const todayTasks = tasks.filter(task =>
    task.startedAt && new Date(task.startedAt).toISOString().split('T')[0] === today
  );
  const completedTasks = todayTasks.filter(task => task.status === TaskStatus.Done).length;

  const statistics: Statistics = {
    date: today,
    plannedPomodoros,
    completedPomodoros,
    completedTasks,
    totalTasks: todayTasks.length
  };

  const allStatistics = await getStorageData(StorageKey.STATISTICS) || {};
  allStatistics[today] = statistics;
  await setStorageData(StorageKey.STATISTICS, allStatistics);
}

/**
 * スロット間でタスク割り当てを交換
 */
export async function swapSlotAssignments(sourceSlotId: string, targetSlotId: string): Promise<void> {
  const dayPlan = await getTodayDayPlan();
  const sourceSlot = dayPlan.slots.find(s => s.id === sourceSlotId);
  const targetSlot = dayPlan.slots.find(s => s.id === targetSlotId);

  if (sourceSlot && targetSlot) {
    // スロットの内容を交換
    const tempTaskId = sourceSlot.taskId;
    const tempCompleted = sourceSlot.completed;
    const tempCompletedAt = sourceSlot.completedAt;

    sourceSlot.taskId = targetSlot.taskId;
    sourceSlot.completed = targetSlot.completed;
    sourceSlot.completedAt = targetSlot.completedAt;

    targetSlot.taskId = tempTaskId;
    targetSlot.completed = tempCompleted;
    targetSlot.completedAt = tempCompletedAt;

    await updateDayPlan(dayPlan);
  }
}

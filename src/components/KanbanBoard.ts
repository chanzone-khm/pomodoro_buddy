import { DayPlan, Task, TaskStatus } from '../types';
import { getAllTasks, getTodayDayPlan, updateTask } from '../utils/storage';

export class KanbanBoard {
  private container: HTMLElement;
  private tasks: Task[] = [];
  private dayPlan: DayPlan | null = null;
  private onTaskUpdate?: () => void;
  private isRendering: boolean = false; // render重複防止フラグ

  // イベントハンドラーをメンバ変数として保存
  private boundHandleDragStart: (event: DragEvent) => void;
  private boundHandleDragOver: (event: DragEvent) => void;
  private boundHandleDrop: (event: DragEvent) => Promise<void>;
  private boundHandleClick: (event: Event) => Promise<void>;

  constructor(container: HTMLElement, onTaskUpdate?: () => void) {
    this.container = container;
    this.onTaskUpdate = onTaskUpdate;

    // イベントハンドラーをバインド
    this.boundHandleDragStart = this.handleDragStart.bind(this);
    this.boundHandleDragOver = this.handleDragOver.bind(this);
    this.boundHandleDrop = this.handleDrop.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);

    this.init();
  }

  private async init() {
    await this.loadData();
    this.render();
  }

  private async loadData() {
    this.tasks = await getAllTasks();
    this.dayPlan = await getTodayDayPlan();
  }

  private render() {
    if (this.isRendering) return;
    this.isRendering = true;

    this.container.innerHTML = `
      <div class="kanban-board">
        <div class="kanban-columns">
          ${this.renderColumn('Backlog', TaskStatus.Backlog)}
          ${this.renderColumn('Doing', TaskStatus.Doing)}
          ${this.renderColumn('Done', TaskStatus.Done)}
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.isRendering = false; // フラグリセット
  }

  private renderColumn(title: string, status: TaskStatus): string {
    const filteredTasks = this.tasks.filter(task => task.status === status);

    return `
      <div class="kanban-column" data-status="${status}">
        <div class="kanban-column-header">
          <h3 class="kanban-column-title">${title}</h3>
          <span class="kanban-column-count">${filteredTasks.length}</span>
        </div>
        <div class="kanban-column-content" data-droppable="${status}">
          ${filteredTasks.map(task => this.renderTaskCard(task)).join('')}
          ${status === TaskStatus.Backlog ? this.renderAddTaskButton() : ''}
        </div>
      </div>
    `;
  }

  private renderTaskCard(task: Task): string {
    const progressText = task.estimatePomodoros > 0
      ? `🍅 ${task.actualPomodoros}/${task.estimatePomodoros}`
      : `🍅 ${task.actualPomodoros}`;

    const assignedSlots = this.dayPlan?.slots.filter(slot => slot.taskId === task.id) || [];
    const completedSlots = assignedSlots.filter(slot => slot.completed).length;
    const isInProgress = task.status === TaskStatus.Doing && assignedSlots.length > 0;
    const isInPlan = assignedSlots.length > 0;

    const shouldShowPlanButton = task.status === TaskStatus.Backlog && !isInPlan;

    const planButtonHtml = shouldShowPlanButton ? `
              <button class="task-add-to-plan-btn" data-task-id="${task.id}" title="今日のプランに追加">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </button>
            ` : '';

    return `
      <div class="task-card ${isInPlan ? 'task-in-plan' : ''}" data-task-id="${task.id}" draggable="true">
        <div class="task-card-header">
          <span class="task-card-title">${task.name}</span>
          <div class="task-card-actions">
            ${planButtonHtml}
            ${task.status === TaskStatus.Backlog ? `
              <button class="task-card-delete" data-task-id="${task.id}" title="タスクを削除">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
        ${task.description ? `<div class="task-card-description">${task.description}</div>` : ''}
        <div class="task-card-progress">
          <span class="progress-text">${progressText}</span>
          ${isInProgress ? `<span class="progress-slots">(${completedSlots}/${assignedSlots.length})</span>` : ''}
          ${isInPlan && !isInProgress ? `<span class="plan-indicator">📅 プラン済み</span>` : ''}
        </div>
        ${task.status === TaskStatus.Done && task.completedAt ? `
          <div class="task-card-completed">
            完了: ${new Date(task.completedAt).toLocaleString('ja-JP')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderAddTaskButton(): string {
    return `
      <button class="add-task-button" id="addTaskButton">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        新しいタスク
      </button>
    `;
  }

  private attachEventListeners() {
    // ドラッグ&ドロップイベント
    this.container.addEventListener('dragstart', this.boundHandleDragStart);
    this.container.addEventListener('dragover', this.boundHandleDragOver);
    this.container.addEventListener('drop', this.boundHandleDrop);

    // クリックイベント（タスク削除、プラン追加）
    this.container.addEventListener('click', this.boundHandleClick);

    // 新しいタスク追加ボタン
    const addButton = this.container.querySelector('#addTaskButton');
    if (addButton) {
      addButton.addEventListener('click', this.handleAddTask.bind(this));
    }
  }

  private handleDragStart(event: DragEvent) {
    if (event.target instanceof HTMLElement && event.target.classList.contains('task-card')) {
      const taskId = event.target.dataset.taskId;
      if (taskId && event.dataTransfer) {
        event.dataTransfer.setData('text/plain', taskId);
        event.dataTransfer.effectAllowed = 'move';
      }
    }
  }

  private handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  private async handleDrop(event: DragEvent) {
    event.preventDefault();

    if (event.target instanceof HTMLElement && event.dataTransfer) {
      const taskId = event.dataTransfer.getData('text/plain');
      const dropZone = event.target.closest('[data-droppable]');

      if (dropZone && taskId) {
        const newStatus = dropZone.getAttribute('data-droppable') as TaskStatus;
        const task = this.tasks.find(t => t.id === taskId);

        if (task && task.status !== newStatus) {
          await this.moveTaskToStatus(taskId, newStatus);
          await this.refresh();
        }
      }
    }
  }

  private async handleClick(event: Event) {
    try {
      // HTMLElementまたはSVGElementの場合に処理
      if (event.target instanceof HTMLElement || event.target instanceof SVGElement) {
        const target = event.target as Element;

        // プラン追加ボタン（SVGクリックにも対応）
        const planButtonElement = target.closest('.task-add-to-plan-btn');
        if (planButtonElement) {
          event.stopPropagation(); // イベント伝搬を止める
          const button = planButtonElement as HTMLElement;
          const taskId = button.dataset.taskId;
          if (taskId) {
            await this.addTaskToPlan(taskId);
          }
          return;
        }

        // タスク削除（SVGクリックにも対応）
        const deleteButtonElement = target.closest('.task-card-delete');
        if (deleteButtonElement) {
          event.stopPropagation(); // イベント伝搬を止める
          const button = deleteButtonElement as HTMLElement;
          const taskId = button.dataset.taskId;
          if (taskId) {
            await this.deleteTask(taskId);
          }
          return;
        }
      }
    } catch (error) {
      console.error('🚨 Error in handleClick:', error);
    }
  }

  private async handleAddTask() {
    const taskName = prompt('新しいタスク名を入力してください:');
    if (taskName && taskName.trim()) {
      const description = prompt('タスクの説明（省略可）:');
      const estimateStr = prompt('予想ポモドーロ数（デフォルト: 1）:');
      const estimate = estimateStr ? parseInt(estimateStr, 10) : 1;

      if (estimate > 0) {
        await this.addNewTask(taskName.trim(), description || undefined, estimate);
      }
    }
  }

  private async addNewTask(name: string, description?: string, estimatePomodoros: number = 1) {
    const { createTask, addTask } = await import('../utils/storage');
    const newTask = createTask(name, description, estimatePomodoros);
    await addTask(newTask);
    await this.refreshSilent();

    if (this.onTaskUpdate) {
      this.onTaskUpdate();
    }

    // ポップアップに変更通知を送信
    try {
      chrome.runtime.sendMessage({ action: 'TASK_UPDATED' });
    } catch (error) {
      console.log('⚠️ 変更通知送信失敗:', error);
    }
  }

  private async deleteTask(taskId: string) {
    if (confirm('このタスクを削除してもよろしいですか？')) {
      const { deleteTask } = await import('../utils/storage');
      await deleteTask(taskId);
      await this.refreshSilent();

      if (this.onTaskUpdate) {
        this.onTaskUpdate();
      }

      // ポップアップに変更通知を送信
      try {
        chrome.runtime.sendMessage({ action: 'TASK_UPDATED' });
      } catch (error) {
        console.log('⚠️ 変更通知送信失敗:', error);
      }
    }
  }

  private async addTaskToPlan(taskId: string) {
    console.log('🎯 プラン追加開始:', { taskId });

    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error('❌ タスクが見つかりません:', taskId);
      return;
    }

    console.log('✅ タスク発見:', { id: task.id, name: task.name, estimate: task.estimatePomodoros });
    console.log('📅 現在のdayPlan:', {
      exists: !!this.dayPlan,
      slotsCount: this.dayPlan?.slots?.length,
      dayPlanData: this.dayPlan
    });

    try {
      // 空のスロットを見つけて、必要な分だけ連続して割り当て
      const { assignTaskToSlot } = await import('../utils/storage');
      const emptySlots = this.dayPlan?.slots.filter(slot => !slot.taskId) || [];

      console.log('📊 スロット状況:', {
        totalSlots: this.dayPlan?.slots?.length,
        emptySlots: emptySlots.length,
        requiredSlots: task.estimatePomodoros,
        emptySlotIds: emptySlots.map(s => s.id)
      });

      if (emptySlots.length < task.estimatePomodoros) {
        console.warn('❌ 空きスロット不足');
        alert(`空きスロットが不足しています。必要: ${task.estimatePomodoros}個、利用可能: ${emptySlots.length}個`);
        return;
      }

      // 最初の空きスロットから必要な分だけ割り当て
      const firstEmptySlotId = emptySlots[0].id;
      console.log('🎯 スロット割り当て実行:', { slotId: firstEmptySlotId, taskId, pomodoros: task.estimatePomodoros });

      await assignTaskToSlot(firstEmptySlotId, taskId, task.estimatePomodoros);
      console.log('✅ assignTaskToSlot完了');

      console.log('🔄 データ更新開始');
      await this.refreshSilent();
      console.log('✅ refreshSilent完了');

      if (this.onTaskUpdate) {
        console.log('🔄 onTaskUpdate実行');
        this.onTaskUpdate();
        console.log('✅ onTaskUpdate完了');
      }

      // ポップアップに変更通知を送信
      console.log('📤 ポップアップに変更通知送信');
      try {
        chrome.runtime.sendMessage({ action: 'PLAN_UPDATED' });
        console.log('✅ 変更通知送信完了');
      } catch (error) {
        console.log('⚠️ 変更通知送信失敗（ポップアップが開いていない可能性）:', error);
      }

      console.log(`✅ プラン追加成功: 「${task.name}」を今日のプランに追加しました`);

    } catch (error) {
      console.error('❌ プランへの追加に失敗しました:', error);
      alert('プランへの追加に失敗しました。');
    }
  }

  private async moveTaskToStatus(taskId: string, newStatus: TaskStatus) {
    const updates: Partial<Task> = { status: newStatus };

    if (newStatus === TaskStatus.Done) {
      updates.completedAt = Date.now();
    } else if (newStatus === TaskStatus.Backlog) {
      updates.startedAt = undefined;
      updates.completedAt = undefined;
    } else if (newStatus === TaskStatus.Doing) {
      updates.startedAt = Date.now();
    }

    await updateTask(taskId, updates);
  }

  public async refresh() {
    await this.loadData();
    this.render();
    if (this.onTaskUpdate) {
      this.onTaskUpdate();
    }
  }

  public async refreshSilent() {
    // onTaskUpdateコールバックを呼ばないrefresh
    await this.loadData();
    this.render();
  }

  public getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks.filter(task => task.status === status);
  }
}

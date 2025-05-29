import { DayPlan, Task, TaskStatus } from '../types';
import { getAllTasks, getTodayDayPlan, updateTask } from '../utils/storage';

export class KanbanBoard {
  private container: HTMLElement;
  private tasks: Task[] = [];
  private dayPlan: DayPlan | null = null;
  private onTaskUpdate?: () => void;

  constructor(container: HTMLElement, onTaskUpdate?: () => void) {
    this.container = container;
    this.onTaskUpdate = onTaskUpdate;
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

    return `
      <div class="task-card" data-task-id="${task.id}" draggable="true">
        <div class="task-card-header">
          <span class="task-card-title">${task.name}</span>
          ${task.status === TaskStatus.Backlog ? `
            <button class="task-card-delete" data-task-id="${task.id}" title="タスクを削除">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          ` : ''}
        </div>
        ${task.description ? `<div class="task-card-description">${task.description}</div>` : ''}
        <div class="task-card-progress">
          <span class="progress-text">${progressText}</span>
          ${isInProgress ? `<span class="progress-slots">(${completedSlots}/${assignedSlots.length})</span>` : ''}
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
    this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));

    // タスク削除
    this.container.addEventListener('click', this.handleClick.bind(this));

    // 新しいタスク追加
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
    if (event.target instanceof HTMLElement) {
      // タスク削除
      if (event.target.classList.contains('task-card-delete') ||
          event.target.closest('.task-card-delete')) {
        const button = event.target.closest('.task-card-delete') as HTMLElement;
        const taskId = button?.dataset.taskId;
        if (taskId) {
          await this.deleteTask(taskId);
        }
      }
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
    await this.refresh();
  }

  private async deleteTask(taskId: string) {
    if (confirm('このタスクを削除してもよろしいですか？')) {
      const { deleteTask } = await import('../utils/storage');
      await deleteTask(taskId);
      await this.refresh();
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

  public getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks.filter(task => task.status === status);
  }
}

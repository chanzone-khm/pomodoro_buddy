import { DayPlan, PomodoroSlot, Task, TaskStatus } from '../types';
import { assignTaskToSlot, getAllTasks, getTodayDayPlan, removeTaskFromSlot } from '../utils/storage';

export class PomodoroSlots {
  private container: HTMLElement;
  private dayPlan: DayPlan | null = null;
  private tasks: Task[] = [];
  private onSlotUpdate?: () => void;

  constructor(container: HTMLElement, onSlotUpdate?: () => void) {
    this.container = container;
    this.onSlotUpdate = onSlotUpdate;
    this.init();
  }

  private async init() {
    await this.loadData();
    this.render();
  }

  private async loadData() {
    this.dayPlan = await getTodayDayPlan();
    this.tasks = await getAllTasks();
  }

  private render() {
    if (!this.dayPlan) return;

    const usedSlots = this.dayPlan.slots.filter(slot => slot.taskId).length;
    const totalSlots = this.dayPlan.slots.length;

    this.container.innerHTML = `
      <div class="pomodoro-slots">
        <div class="slots-header">
          <h3 class="slots-title">今日の🍅プラン</h3>
          <div class="slots-counter">
            <span class="used-count">${usedSlots}</span>
            <span class="separator">/</span>
            <span class="total-count">${totalSlots}</span>
          </div>
        </div>
        <div class="slots-grid">
          ${this.dayPlan.slots.map(slot => this.renderSlot(slot)).join('')}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderSlot(slot: PomodoroSlot): string {
    const task = slot.taskId ? this.tasks.find(t => t.id === slot.taskId) : null;
    const isEmpty = !slot.taskId;
    const isCompleted = slot.completed;

    let slotClass = 'slot';
    if (isEmpty) {
      slotClass += ' slot-empty';
    } else if (isCompleted) {
      slotClass += ' slot-completed';
    } else {
      slotClass += ' slot-assigned';
    }

    return `
      <div class="${slotClass}"
           data-slot-id="${slot.id}"
           data-droppable="true"
           ${isEmpty ? 'title="タスクをドラッグ&ドロップするか、クリックして選択"' : ''}>
        ${isEmpty ? this.renderEmptySlot() : this.renderAssignedSlot(task!, slot)}
      </div>
    `;
  }

  private renderEmptySlot(): string {
    return `
      <div class="slot-content slot-empty-content">
        <div class="empty-icon">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
        </div>
      </div>
    `;
  }

  private renderAssignedSlot(task: Task, slot: PomodoroSlot): string {
    const completionIcon = slot.completed
      ? `<div class="completion-icon">✓</div>`
      : `<div class="progress-icon">🍅</div>`;

    return `
      <div class="slot-content slot-assigned-content">
        ${completionIcon}
        <div class="task-info">
          <div class="task-name" title="${task.name}">${this.truncateText(task.name, 12)}</div>
          <div class="task-progress">${task.actualPomodoros}/${task.estimatePomodoros}</div>
        </div>
        <button class="slot-remove-btn" data-slot-id="${slot.id}" title="タスクを削除">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  private attachEventListeners() {
    // ドラッグ&ドロップイベント
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));

    // クリックイベント
    this.container.addEventListener('click', this.handleClick.bind(this));
  }

  private handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }

    // ドロップ可能な空のスロットをハイライト
    const slot = (event.target as HTMLElement).closest('.slot');
    if (slot && slot.classList.contains('slot-empty')) {
      slot.classList.add('slot-dragover');
    }

    // 他のスロットのハイライトを削除
    this.container.querySelectorAll('.slot-dragover').forEach(el => {
      if (el !== slot) {
        el.classList.remove('slot-dragover');
      }
    });
  }

  private async handleDrop(event: DragEvent) {
    event.preventDefault();

    // ハイライトを削除
    this.container.querySelectorAll('.slot-dragover').forEach(el => {
      el.classList.remove('slot-dragover');
    });

    if (event.target instanceof HTMLElement && event.dataTransfer) {
      const taskId = event.dataTransfer.getData('text/plain');
      const slot = event.target.closest('.slot[data-droppable="true"]') as HTMLElement;

      if (slot && taskId) {
        const slotId = slot.dataset.slotId;
        if (slotId && slot.classList.contains('slot-empty')) {
          await this.assignTaskToSlot(slotId, taskId);
        }
      }
    }
  }

  private async handleClick(event: Event) {
    if (event.target instanceof HTMLElement) {
      // スロット削除ボタン
      if (event.target.classList.contains('slot-remove-btn') ||
          event.target.closest('.slot-remove-btn')) {
        const button = event.target.closest('.slot-remove-btn') as HTMLElement;
        const slotId = button?.dataset.slotId;
        if (slotId) {
          await this.removeTaskFromSlot(slotId);
        }
        return;
      }

      // 空のスロットクリック（タスク選択）
      const slot = event.target.closest('.slot') as HTMLElement;
      if (slot && slot.classList.contains('slot-empty')) {
        const slotId = slot.dataset.slotId;
        if (slotId) {
          await this.showTaskSelectionModal(slotId);
        }
      }
    }
  }

  private async showTaskSelectionModal(slotId: string) {
    const backlogTasks = this.tasks.filter(task => task.status === TaskStatus.Backlog);

    if (backlogTasks.length === 0) {
      alert('割り当て可能なタスクがありません。先にBacklogにタスクを追加してください。');
      return;
    }

    // 簡易的なタスク選択モーダル
    const taskOptions = backlogTasks.map((task, index) =>
      `${index + 1}. ${task.name} (🍅${task.estimatePomodoros})`
    ).join('\n');

    const selectedIndex = prompt(
      `タスクを選択してください:\n\n${taskOptions}\n\n番号を入力:`
    );

    if (selectedIndex) {
      const index = parseInt(selectedIndex, 10) - 1;
      if (index >= 0 && index < backlogTasks.length) {
        const selectedTask = backlogTasks[index];
        await this.assignTaskToSlot(slotId, selectedTask.id);
      }
    }
  }

  private async assignTaskToSlot(slotId: string, taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await assignTaskToSlot(slotId, taskId, task.estimatePomodoros);
      await this.refresh();
    } catch (error) {
      console.error('タスクの割り当てに失敗しました:', error);
      alert('タスクの割り当てに失敗しました。');
    }
  }

  private async removeTaskFromSlot(slotId: string) {
    if (confirm('このスロットからタスクを削除してもよろしいですか？')) {
      try {
        await removeTaskFromSlot(slotId);
        await this.refresh();
      } catch (error) {
        console.error('タスクの削除に失敗しました:', error);
        alert('タスクの削除に失敗しました。');
      }
    }
  }

  public async refresh() {
    await this.loadData();
    this.render();
    if (this.onSlotUpdate) {
      this.onSlotUpdate();
    }
  }

  public getCurrentSlot(): PomodoroSlot | null {
    if (!this.dayPlan) return null;

    // 未完了の最初のスロットを返す
    return this.dayPlan.slots.find(slot =>
      slot.taskId && !slot.completed
    ) || null;
  }

  public async completeCurrentSlot(): Promise<boolean> {
    const currentSlot = this.getCurrentSlot();
    if (!currentSlot) return false;

    try {
      const { completePomodoro } = await import('../utils/storage');
      await completePomodoro(currentSlot.id);
      await this.refresh();
      return true;
    } catch (error) {
      console.error('ポモドーロの完了処理に失敗しました:', error);
      return false;
    }
  }
}

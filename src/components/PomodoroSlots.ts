import { DayPlan, PomodoroSlot, Task, TaskStatus } from '../types';
import { assignTaskToSlot, getAllTasks, getTodayDayPlan, removeTaskFromSlot } from '../utils/storage';

export class PomodoroSlots {
  private container: HTMLElement;
  private dayPlan: DayPlan | null = null;
  private tasks: Task[] = [];
  private onSlotUpdate?: () => void;
  private isProcessing: boolean = false;

  // イベントハンドラーをメンバ変数として保存
  private boundHandleDragOver: (event: DragEvent) => void;
  private boundHandleDrop: (event: DragEvent) => Promise<void>;
  private boundHandleClick: (event: Event) => Promise<void>;

  constructor(container: HTMLElement, onSlotUpdate?: () => void) {
    this.container = container;
    this.onSlotUpdate = onSlotUpdate;

    // イベントハンドラーをバインド
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
           ${!isEmpty ? `draggable="true" data-task-id="${task!.id}"` : ''}
           ${isEmpty ? 'title="タスクをドラッグ&ドロップするか、クリックして選択"' : 'title="ドラッグで並び替え"'}>
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

    // このタスクの全スロットを取得
    const taskSlots = this.dayPlan?.slots.filter(s => s.taskId === task.id) || [];
    // 現在のスロットが何番目かを計算
    const currentSlotIndex = taskSlots.findIndex(s => s.id === slot.id) + 1;
    const totalSlots = taskSlots.length;

    // ポモドーロ進捗表示を「現在/総数」形式に
    const pomodoroProgress = `${currentSlotIndex}/${totalSlots}`;

    return `
      <div class="slot-content slot-assigned-content">
        ${completionIcon}
        <div class="task-info">
          <div class="task-name" title="${task.name}">${this.truncateText(task.name, 12)}</div>
          <div class="task-progress">${pomodoroProgress}</div>
        </div>
        <div class="slot-actions">
          ${!slot.completed ? `
            <button class="slot-complete-btn" data-slot-id="${slot.id}" title="完了">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </button>
          ` : ''}
          <button class="slot-remove-btn" data-slot-id="${slot.id}" title="タスクを削除">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  private attachEventListeners() {
    // 既存のイベントリスナーを削除（重複を防ぐため）
    this.container.removeEventListener('dragover', this.boundHandleDragOver);
    this.container.removeEventListener('drop', this.boundHandleDrop);
    this.container.removeEventListener('click', this.boundHandleClick);

    // 新しいイベントリスナーを追加
    // ドラッグ&ドロップイベント
    this.container.addEventListener('dragstart', this.handleSlotDragStart.bind(this));
    this.container.addEventListener('dragover', this.boundHandleDragOver);
    this.container.addEventListener('drop', this.handleSlotDrop.bind(this));

    // クリックイベント
    this.container.addEventListener('click', this.boundHandleClick);
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
    try {
      // HTMLElementまたはSVGElementの場合に処理
      if (event.target instanceof HTMLElement || event.target instanceof SVGElement) {
        const target = event.target as Element;

        // スロット完了ボタン（SVGクリックにも対応）
        const completeButtonElement = target.closest('.slot-complete-btn');
        if (completeButtonElement) {
          event.stopPropagation(); // イベント伝搬を止める
          const button = completeButtonElement as HTMLElement;
          const slotId = button.dataset.slotId;
          if (slotId) {
            await this.completeSlotAndTask(slotId);
          }
          return;
        }

        // スロット削除ボタン（SVGクリックにも対応）
        const removeButtonElement = target.closest('.slot-remove-btn');
        if (removeButtonElement) {
          event.stopPropagation(); // イベント伝搬を止める
          const button = removeButtonElement as HTMLElement;
          const slotId = button.dataset.slotId;
          if (slotId) {
            await this.removeTaskFromSlot(slotId);
          }
          return;
        }

        // 空のスロットクリック（タスク選択）
        const slot = target.closest('.slot') as HTMLElement;
        if (slot && slot.classList.contains('slot-empty')) {
          const slotId = slot.dataset.slotId;
          if (slotId) {
            await this.showTaskSelectionModal(slotId);
          }
          return;
        }
      }
    } catch (error) {
      console.error('🚨 Error in PomodoroSlots handleClick:', error);
    }
  }

  private async showTaskSelectionModal(slotId: string) {
    // 既に処理中の場合は何もしない
    if (this.isProcessing) {
      console.log('Already processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const backlogTasks = this.tasks.filter(task => task.status === TaskStatus.Backlog);

      if (backlogTasks.length === 0) {
        alert('割り当て可能なタスクがありません。先にBacklogにタスクを追加してください。');
        return;
      }

      // 簡易的なタスク選択モーダル
      const taskOptions = backlogTasks.map((task, index) =>
        `${index + 1}. ${task.name} (🍅${task.estimatePomodoros})`
      ).join('\n');

      let selectedIndex: string | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        selectedIndex = prompt(
          `タスクを選択してください:\n\n${taskOptions}\n\n番号を入力 (1-${backlogTasks.length}):`
        );

        // キャンセルされた場合（null または 空文字列をキャンセルとして扱う）
        if (selectedIndex === null) {
          console.log('タスク選択がキャンセルされました（null）');
          return;
        }

        // 空文字列の場合もキャンセルとして扱う
        if (selectedIndex.trim() === '') {
          console.log('タスク選択がキャンセルされました（空文字列）');
          return;
        }

        // 有効な番号が入力された場合
        const index = parseInt(selectedIndex.trim(), 10) - 1;
        console.log(`入力値: "${selectedIndex}", 解析結果: ${index + 1}, 有効範囲: 1-${backlogTasks.length}`);

        if (!isNaN(index) && index >= 0 && index < backlogTasks.length) {
          const selectedTask = backlogTasks[index];
          console.log(`選択されたタスク: ${selectedTask.name}`);
          await this.assignTaskToSlot(slotId, selectedTask.id);
          return;
        }

        // 無効な入力の場合
        alert(`無効な番号です。1から${backlogTasks.length}の間の数字を入力してください。\n入力された値: "${selectedIndex}"`);
        attempts++;
      }

      // 最大試行回数に達した場合
      alert('タスクの選択がキャンセルされました。');
    } finally {
      // 処理完了後にフラグをリセット
      this.isProcessing = false;
    }
  }

  private async assignTaskToSlot(slotId: string, taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await assignTaskToSlot(slotId, taskId, task.estimatePomodoros);
      await this.refreshSilent();

      if (this.onSlotUpdate) {
        this.onSlotUpdate();
      }
    } catch (error) {
      console.error('タスクの割り当てに失敗しました:', error);
      alert('タスクの割り当てに失敗しました。');
    }
  }

  private async removeTaskFromSlot(slotId: string) {
    if (confirm('このスロットからタスクを削除してもよろしいですか？')) {
      try {
        await removeTaskFromSlot(slotId);
        await this.refreshSilent();

        if (this.onSlotUpdate) {
          this.onSlotUpdate();
        }
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

  public async refreshSilent() {
    await this.loadData();
    this.render();
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

  private async completeSlotAndTask(slotId: string) {
    try {
      const { completePomodoro, updateTask } = await import('../utils/storage');

      // スロットを完了状態にする
      await completePomodoro(slotId);

      // 該当するタスクを取得
      const slot = this.dayPlan?.slots.find(s => s.id === slotId);
      if (!slot || !slot.taskId) return;

      const task = this.tasks.find(t => t.id === slot.taskId);
      if (!task) return;

      // このタスクの全スロットが完了したかチェック
      const taskSlots = this.dayPlan?.slots.filter(s => s.taskId === task.id) || [];
      const completedSlots = taskSlots.filter(s => s.completed).length + 1; // +1は今完了したスロット

      // 全スロットが完了した場合、タスクをDoneに移動
      if (completedSlots >= task.estimatePomodoros) {
        await updateTask(task.id, {
          status: TaskStatus.Done,
          completedAt: Date.now(),
          actualPomodoros: task.actualPomodoros + 1
        });
      } else {
        // まだ完了していない場合はポモドーロ実績のみ更新
        await updateTask(task.id, {
          actualPomodoros: task.actualPomodoros + 1
        });
      }

      await this.refreshSilent();

      if (this.onSlotUpdate) {
        this.onSlotUpdate();
      }

    } catch (error) {
      console.error('スロットの完了処理に失敗しました:', error);
      alert('スロットの完了処理に失敗しました。');
    }
  }

  private handleSlotDragStart(event: DragEvent) {
    if (event.target instanceof HTMLElement && event.target.hasAttribute('draggable')) {
      const taskId = event.target.dataset.taskId;
      const slotId = event.target.dataset.slotId;
      if (taskId && slotId && event.dataTransfer) {
        event.dataTransfer.setData('text/plain', JSON.stringify({ taskId, slotId, source: 'slot' }));
        event.dataTransfer.effectAllowed = 'move';
        event.target.style.opacity = '0.5';
      }
    }
  }

  private async handleSlotDrop(event: DragEvent) {
    event.preventDefault();

    // ハイライトを削除
    this.container.querySelectorAll('.slot-dragover').forEach(el => {
      el.classList.remove('slot-dragover');
    });

    if (event.target instanceof HTMLElement && event.dataTransfer) {
      const dropData = event.dataTransfer.getData('text/plain');

      try {
        const { taskId: _taskId, slotId, source } = JSON.parse(dropData);

        if (source === 'slot') {
          // スロット間での並び替え
          const targetSlot = event.target.closest('.slot[data-droppable="true"]') as HTMLElement;
          if (targetSlot) {
            const targetSlotId = targetSlot.dataset.slotId;
            if (targetSlotId && targetSlotId !== slotId) {
              await this.reorderSlots(slotId, targetSlotId);
            }
          }
        } else {
          // 既存のカンバンからのドロップ処理
          await this.handleDrop(event);
        }
      } catch (error) {
        // JSON parsing failed, fall back to existing drop handler
        await this.handleDrop(event);
      }
    }

    // ドラッグ中の透明度をリセット
    this.container.querySelectorAll('[draggable="true"]').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
  }

  private async reorderSlots(sourceSlotId: string, targetSlotId: string) {
    try {
      const { swapSlotAssignments } = await import('../utils/storage');
      await swapSlotAssignments(sourceSlotId, targetSlotId);

      await this.refreshSilent();

      if (this.onSlotUpdate) {
        this.onSlotUpdate();
      }
    } catch (error) {
      console.error('スロットの並び替えに失敗しました:', error);
      alert('スロットの並び替えに失敗しました。');
    }
  }
}

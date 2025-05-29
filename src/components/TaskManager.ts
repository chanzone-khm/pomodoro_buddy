import { getTodayDayPlan, updateTodayStatistics } from '../utils/storage';
import { KanbanBoard } from './KanbanBoard';
import { PomodoroSlots } from './PomodoroSlots';

export class TaskManager {
  private container: HTMLElement;
  private kanbanBoard: KanbanBoard | null = null;
  private pomodoroSlots: PomodoroSlots | null = null;
  private viewMode: 'kanban' | 'list' = 'kanban';

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private async init() {
    await this.render();
    await this.initializeComponents();
  }

  private async render() {
    this.container.innerHTML = `
      <div class="task-manager">
        <!-- ポモドーロスロット表示エリア -->
        <div id="pomodoro-slots-container"></div>

        <!-- ビュー切り替えヘッダー -->
        <div class="view-controls">
          <div class="view-toggle">
            <button class="view-btn ${this.viewMode === 'kanban' ? 'active' : ''}"
                    data-view="kanban">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7"/>
              </svg>
              カンバン
            </button>
            <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}"
                    data-view="list">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              リスト
            </button>
          </div>

          <div class="view-actions">
            <button id="refresh-btn" class="action-btn" title="更新">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- タスク表示エリア -->
        <div id="task-content-container" class="task-content">
          <div id="kanban-container" class="${this.viewMode === 'kanban' ? 'visible' : 'hidden'}"></div>
          <div id="list-container" class="${this.viewMode === 'list' ? 'visible' : 'hidden'}">
            <div class="list-view">
              <p>リストビューは開発中です。現在はカンバンビューをご利用ください。</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.attachEventListeners();
  }

  private async initializeComponents() {
    // ポモドーロスロットを初期化
    const slotsContainer = this.container.querySelector('#pomodoro-slots-container') as HTMLElement;
    if (slotsContainer) {
      this.pomodoroSlots = new PomodoroSlots(slotsContainer, () => {
        this.handleComponentUpdate();
      });
    }

    // カンバンボードを初期化
    const kanbanContainer = this.container.querySelector('#kanban-container') as HTMLElement;
    if (kanbanContainer) {
      this.kanbanBoard = new KanbanBoard(kanbanContainer, () => {
        this.handleComponentUpdate();
      });
    }
  }

  private async attachEventListeners() {
    // ビュー切り替えボタン
    this.container.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement) {
        // ビュー切り替え
        if (event.target.classList.contains('view-btn') || event.target.closest('.view-btn')) {
          const button = event.target.closest('.view-btn') as HTMLElement;
          const newView = button?.dataset.view as 'kanban' | 'list';
          if (newView && newView !== this.viewMode) {
            this.switchView(newView);
          }
        }

        // 更新ボタン
        if (event.target.closest('#refresh-btn')) {
          this.refresh();
        }
      }
    });
  }

  private switchView(newView: 'kanban' | 'list') {
    this.viewMode = newView;

    // ボタンの状態を更新
    this.container.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = this.container.querySelector(`[data-view="${newView}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // コンテナの表示を切り替え
    const kanbanContainer = this.container.querySelector('#kanban-container') as HTMLElement;
    const listContainer = this.container.querySelector('#list-container') as HTMLElement;

    if (kanbanContainer && listContainer) {
      if (newView === 'kanban') {
        kanbanContainer.classList.remove('hidden');
        kanbanContainer.classList.add('visible');
        listContainer.classList.remove('visible');
        listContainer.classList.add('hidden');
      } else {
        kanbanContainer.classList.remove('visible');
        kanbanContainer.classList.add('hidden');
        listContainer.classList.remove('hidden');
        listContainer.classList.add('visible');
      }
    }
  }

  private async handleComponentUpdate() {
    // 統計を更新
    await updateTodayStatistics();

    // 他のコンポーネントも更新
    if (this.pomodoroSlots) {
      await this.pomodoroSlots.refresh();
    }
    if (this.kanbanBoard) {
      await this.kanbanBoard.refresh();
    }
  }

  public async refresh() {
    // 全コンポーネントを更新
    if (this.pomodoroSlots) {
      await this.pomodoroSlots.refresh();
    }
    if (this.kanbanBoard) {
      await this.kanbanBoard.refresh();
    }
    await updateTodayStatistics();
  }

  public async completeCurrentPomodoro(): Promise<boolean> {
    // 現在のポモドーロを完了
    if (this.pomodoroSlots) {
      const success = await this.pomodoroSlots.completeCurrentSlot();
      if (success) {
        await this.handleComponentUpdate();
        return true;
      }
    }
    return false;
  }

  public getCurrentTaskInfo(): { taskId?: string; slotId?: string } | null {
    // 現在アクティブなタスク情報を取得
    const currentSlot = this.pomodoroSlots?.getCurrentSlot();
    return currentSlot ? {
      taskId: currentSlot.taskId,
      slotId: currentSlot.id
    } : null;
  }

  public async getDayPlanSummary(): Promise<{ planned: number; completed: number; remaining: number }> {
    const dayPlan = await getTodayDayPlan();
    const planned = dayPlan.slots.filter(slot => slot.taskId).length;
    const completed = dayPlan.slots.filter(slot => slot.completed).length;
    const remaining = planned - completed;

    return { planned, completed, remaining };
  }

  // CSS読み込み用のメソッド
  public static loadStyles(): void {
    const existingLink = document.querySelector('link[href*="kanban.css"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('src/components/kanban.css');
      document.head.appendChild(link);
    }

    // 追加のタスクマネージャー用スタイル
    if (!document.querySelector('#task-manager-styles')) {
      const style = document.createElement('style');
      style.id = 'task-manager-styles';
      style.textContent = `
        .task-manager {
          width: 100%;
          max-width: 100%;
        }

        .view-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .view-toggle {
          display: flex;
          gap: 4px;
          background: #f1f5f9;
          border-radius: 6px;
          padding: 2px;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: none;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-btn.active {
          background: white;
          color: #374151;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .view-btn:hover:not(.active) {
          color: #475569;
        }

        .view-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: #f8fafc;
          color: #374151;
          border-color: #cbd5e1;
        }

        .task-content {
          width: 100%;
        }

        .task-content .visible {
          display: block;
        }

        .task-content .hidden {
          display: none;
        }

        .list-view {
          padding: 40px 20px;
          text-align: center;
          color: #6b7280;
        }
      `;
      document.head.appendChild(style);
    }
  }
}

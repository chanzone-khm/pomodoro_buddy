/**
 * プログレスバーユーティリティ
 * タイマーの進行状況を視覚的に表示するための機能
 */

import { TimerState, SessionType } from '../types/index.js';

/**
 * プログレスバーの設定インターフェース
 */
export interface ProgressBarSettings {
  type: 'circular' | 'linear';
  showPercentage: boolean;
  enabled: boolean; // プログレスバーの表示/非表示
  animationDuration: number; // ミリ秒
  workColor: string;
  breakColor: string;
  backgroundColor: string;
}

/**
 * プログレスバーの状態インターフェース
 */
export interface ProgressBarState {
  percentage: number; // 0-100
  remainingTime: number; // 秒
  totalTime: number; // 秒
  sessionType: SessionType;
  isRunning: boolean;
}

/**
 * デフォルトのプログレスバー設定
 */
export const DEFAULT_PROGRESS_SETTINGS: ProgressBarSettings = {
  type: 'circular',
  showPercentage: true,
  enabled: true,
  animationDuration: 1000,
  workColor: '#ef4444', // red-500
  breakColor: '#22c55e', // green-500
  backgroundColor: '#e5e7eb' // gray-200
};

/**
 * タイマー状態からプログレスバー状態を計算
 */
export function calculateProgressState(
  timerState: TimerState,
  remainingTime: number
): ProgressBarState {
  const totalTime = timerState.durationSec;
  const elapsedTime = totalTime - remainingTime;
  const percentage = totalTime > 0 ? Math.max(0, Math.min(100, (elapsedTime / totalTime) * 100)) : 0;

  return {
    percentage,
    remainingTime,
    totalTime,
    sessionType: timerState.type,
    isRunning: timerState.isRunning
  };
}

/**
 * 円形プログレスバーのSVGパスを生成
 */
export function generateCircularProgressPath(
  percentage: number,
  radius: number = 45,
  strokeWidth: number = 8
): string {
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return `
    <circle
      stroke="currentColor"
      fill="transparent"
      stroke-width="${strokeWidth}"
      stroke-dasharray="${strokeDasharray}"
      stroke-dashoffset="${strokeDashoffset}"
      stroke-linecap="round"
      r="${normalizedRadius}"
      cx="${radius}"
      cy="${radius}"
      transform="rotate(-90 ${radius} ${radius})"
      style="transition: stroke-dashoffset 0.5s ease-in-out;"
    />
  `;
}

/**
 * 円形プログレスバーのHTML要素を生成
 */
export function createCircularProgressBar(
  state: ProgressBarState,
  settings: ProgressBarSettings,
  size: number = 120
): string {
  const radius = size / 2;
  const color = state.sessionType === SessionType.Work ? settings.workColor : settings.breakColor;
  
  return `
    <div class="circular-progress-container" style="width: ${size}px; height: ${size}px; position: relative;">
      <svg width="${size}" height="${size}" class="circular-progress-svg">
        <!-- 背景円 -->
        <circle
          stroke="${settings.backgroundColor}"
          fill="transparent"
          stroke-width="8"
          r="${radius - 16}"
          cx="${radius}"
          cy="${radius}"
        />
        <!-- プログレス円 -->
        <circle
          stroke="${color}"
          fill="transparent"
          stroke-width="8"
          stroke-dasharray="${(radius - 16) * 2 * Math.PI}"
          stroke-dashoffset="${(radius - 16) * 2 * Math.PI - (state.percentage / 100) * (radius - 16) * 2 * Math.PI}"
          stroke-linecap="round"
          r="${radius - 16}"
          cx="${radius}"
          cy="${radius}"
          transform="rotate(-90 ${radius} ${radius})"
          style="transition: stroke-dashoffset 0.5s ease-in-out;"
        />
      </svg>
      ${settings.showPercentage ? `
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-sm font-medium text-gray-600">
            ${Math.round(state.percentage)}%
          </span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * リニアプログレスバーのHTML要素を生成
 */
export function createLinearProgressBar(
  state: ProgressBarState,
  settings: ProgressBarSettings,
  width: number = 280
): string {
  const color = state.sessionType === SessionType.Work ? settings.workColor : settings.breakColor;
  
  return `
    <div class="linear-progress-container" style="width: ${width}px;">
      <div class="linear-progress-track" style="
        width: 100%;
        height: 8px;
        background-color: ${settings.backgroundColor};
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      ">
        <div class="linear-progress-bar" style="
          width: ${state.percentage}%;
          height: 100%;
          background-color: ${color};
          border-radius: 4px;
          transition: width 0.5s ease-in-out;
        "></div>
      </div>
      ${settings.showPercentage ? `
        <div class="text-center mt-2">
          <span class="text-sm font-medium text-gray-600">
            ${Math.round(state.percentage)}% 完了
          </span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * プログレスバーの色を取得
 */
export function getProgressColor(
  sessionType: SessionType,
  settings: ProgressBarSettings
): string {
  return sessionType === SessionType.Work ? settings.workColor : settings.breakColor;
}

/**
 * 残り時間をフォーマット
 */
export function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * プログレスバーの状態をアニメーション付きで更新
 */
export function updateProgressBarElement(
  element: HTMLElement,
  state: ProgressBarState,
  settings: ProgressBarSettings
): void {
  const isCircular = settings.type === 'circular';
  
  if (isCircular) {
    const svg = element.querySelector('.circular-progress-svg circle:last-child') as SVGCircleElement;
    if (svg) {
      const radius = parseFloat(svg.getAttribute('r') || '45');
      const circumference = radius * 2 * Math.PI;
      const offset = circumference - (state.percentage / 100) * circumference;
      
      svg.style.strokeDashoffset = offset.toString();
      svg.style.stroke = getProgressColor(state.sessionType, settings);
    }
    
    if (settings.showPercentage) {
      const percentageElement = element.querySelector('.absolute span');
      if (percentageElement) {
        percentageElement.textContent = `${Math.round(state.percentage)}%`;
      }
    }
  } else {
    const progressBar = element.querySelector('.linear-progress-bar') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = `${state.percentage}%`;
      progressBar.style.backgroundColor = getProgressColor(state.sessionType, settings);
    }
    
    if (settings.showPercentage) {
      const percentageElement = element.querySelector('.text-center span');
      if (percentageElement) {
        percentageElement.textContent = `${Math.round(state.percentage)}% 完了`;
      }
    }
  }
}

/**
 * プログレスバーの設定を保存
 */
export async function saveProgressSettings(settings: ProgressBarSettings): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      await chrome.storage.sync.set({ progressBarSettings: settings });
      console.log('プログレスバー設定を保存しました:', settings);
    } catch (error) {
      console.error('プログレスバー設定の保存に失敗:', error);
    }
  }
}

/**
 * プログレスバーの設定を読み込み
 */
export async function loadProgressSettings(): Promise<ProgressBarSettings> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const result = await chrome.storage.sync.get('progressBarSettings');
      return result.progressBarSettings || DEFAULT_PROGRESS_SETTINGS;
    } catch (error) {
      console.error('プログレスバー設定の読み込みに失敗:', error);
      return DEFAULT_PROGRESS_SETTINGS;
    }
  }
  return DEFAULT_PROGRESS_SETTINGS;
} 
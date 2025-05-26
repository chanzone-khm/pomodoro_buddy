import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createTimerState,
  startTimer,
  pauseTimer,
  calculateRemainingTime,
  formatTime,
  calculateBadgeText,
  DEFAULT_TIMER_SETTINGS
} from './timer';
import { SessionType } from '../types/index.js';

describe('Timer Utility Functions', () => {
  // Date.nowのモック
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createTimerState', () => {
    it('デフォルト値で作業セッションを作成する', () => {
      const state = createTimerState();
      expect(state).toEqual({
        type: SessionType.Work,
        startEpoch: Date.now(),
        durationSec: DEFAULT_TIMER_SETTINGS.workDurationSec,
        isRunning: false
      });
    });

    it('休憩セッションを作成する', () => {
      const state = createTimerState(SessionType.Break);
      expect(state).toEqual({
        type: SessionType.Break,
        startEpoch: Date.now(),
        durationSec: DEFAULT_TIMER_SETTINGS.breakDurationSec,
        isRunning: false
      });
    });
  });

  describe('startTimer', () => {
    it('タイマーを開始する', () => {
      const state = createTimerState();
      const startedState = startTimer(state);
      expect(startedState.isRunning).toBe(true);
    });

    it('一時停止から再開する', () => {
      const now = Date.now();
      const pausedState = {
        type: SessionType.Work,
        startEpoch: now - 60000, // 1分前に開始
        durationSec: 25 * 60,
        isRunning: false,
        pausedAt: now,
        pausedElapsed: 60000 // 1分経過して一時停止
      };
      
      // 10秒後に再開
      vi.advanceTimersByTime(10000);
      
      const resumedState = startTimer(pausedState);
      expect(resumedState.isRunning).toBe(true);
      expect(resumedState.pausedAt).toBeUndefined();
      expect(resumedState.pausedElapsed).toBeUndefined();
      
      // 開始時間が正しく調整されているか
      const adjustedStartTime = Date.now() - 60000; // 現在時刻から一時停止までの経過時間を引く
      expect(resumedState.startEpoch).toBe(adjustedStartTime);
    });
  });

  describe('pauseTimer', () => {
    it('実行中のタイマーを一時停止する', () => {
      const now = Date.now();
      const runningState = {
        type: SessionType.Work,
        startEpoch: now - 120000, // 2分前に開始
        durationSec: 25 * 60,
        isRunning: true
      };
      
      const pausedState = pauseTimer(runningState);
      expect(pausedState.isRunning).toBe(false);
      expect(pausedState.pausedAt).toBe(now);
      expect(pausedState.pausedElapsed).toBe(120000); // 2分経過
    });
  });

  describe('calculateRemainingTime', () => {
    it('実行中のタイマーの残り時間を計算する', () => {
      const now = Date.now();
      const runningState = {
        type: SessionType.Work,
        startEpoch: now - 120000, // 2分前に開始
        durationSec: 25 * 60,
        isRunning: true
      };
      
      const remaining = calculateRemainingTime(runningState);
      expect(remaining).toBe(25 * 60 - 120); // 総時間 - 経過秒数
    });

    it('一時停止中のタイマーの残り時間を計算する', () => {
      const pausedState = {
        type: SessionType.Work,
        startEpoch: Date.now() - 180000, // 3分前に開始
        durationSec: 25 * 60,
        isRunning: false,
        pausedAt: Date.now(),
        pausedElapsed: 180000 // 3分経過して一時停止
      };
      
      const remaining = calculateRemainingTime(pausedState);
      expect(remaining).toBe(25 * 60 - 180); // 総時間 - 経過秒数
    });
  });

  describe('formatTime', () => {
    it('秒数を MM:SS 形式にフォーマットする', () => {
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(3600)).toBe('60:00');
      expect(formatTime(0)).toBe('00:00');
    });
  });

  describe('calculateBadgeText', () => {
    it('実行中のタイマーのバッジテキストを計算する', () => {
      const now = Date.now();
      const runningState = {
        type: SessionType.Work,
        startEpoch: now - 120000, // 2分経過
        durationSec: 25 * 60,
        isRunning: true
      };
      
      const badgeText = calculateBadgeText(runningState);
      expect(badgeText).toBe('23'); // 残り23分（切り上げ）
    });

    it('停止中のタイマーのバッジテキストは空', () => {
      const stoppedState = {
        type: SessionType.Work,
        startEpoch: Date.now(),
        durationSec: 25 * 60,
        isRunning: false
      };
      
      const badgeText = calculateBadgeText(stoppedState);
      expect(badgeText).toBe('');
    });
  });
}); 
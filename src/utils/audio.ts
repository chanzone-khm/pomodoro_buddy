import { SessionType } from '../types/index.js';

/**
 * アラーム音を再生する
 * @param sessionType セッションタイプ
 * @param soundEnabled 音声が有効かどうか
 */
export async function playAlarmSound(sessionType: SessionType, soundEnabled: boolean): Promise<void> {
  if (!soundEnabled) {
    return;
  }

  try {
    const soundFile = sessionType === SessionType.Work 
      ? 'sounds/work-complete.wav' 
      : 'sounds/break-complete.wav';
    
    const audio = new Audio(chrome.runtime.getURL(soundFile));
    audio.volume = 0.5;
    await audio.play();
  } catch (error) {
    console.error('アラーム音の再生に失敗しました:', error);
  }
}

/**
 * Web Audio APIを使用してビープ音を生成・再生
 * @param frequency 周波数（Hz）
 * @param duration 持続時間（秒）
 * @param volume 音量（0-1）
 */
export function playBeepSound(frequency: number, duration: number, volume: number = 0.3): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.error('ビープ音の再生に失敗しました:', error);
  }
}

/**
 * セッションタイプに応じたアラーム音を再生
 * @param sessionType セッションタイプ
 */
export async function playSessionCompleteSound(sessionType: SessionType): Promise<void> {
  try {
    // オフスクリーンドキュメントを作成（まだ存在しない場合）
    await ensureOffscreenDocument();
    
    // オフスクリーンドキュメントに音声再生を依頼
    await chrome.runtime.sendMessage({
      action: 'playSound',
      sessionType: sessionType === SessionType.Work ? 'work' : 'break'
    });
  } catch (error) {
    console.error('音声再生エラー:', error);
    // フォールバック：直接ビープ音を試す
    playSessionCompleteBeep(sessionType);
  }
}

/**
 * オフスクリーンドキュメントが存在することを確認
 */
async function ensureOffscreenDocument(): Promise<void> {
  try {
    // Chrome API の型定義の問題を回避するため any を使用
    const chrome_any = chrome as any;
    
    // 既存のオフスクリーンドキュメントをチェック
    if (chrome_any.runtime.getContexts) {
      const existingContexts = await chrome_any.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });

      if (existingContexts && existingContexts.length > 0) {
        return; // 既に存在する
      }
    }

    // オフスクリーンドキュメントを作成
    if (chrome_any.offscreen && chrome_any.offscreen.createDocument) {
      await chrome_any.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'ポモドーロタイマーのアラーム音再生のため'
      });
    } else {
      throw new Error('オフスクリーンAPI未対応');
    }
      } catch (error) {
      console.error('オフスクリーンドキュメントの作成に失敗:', error);
    }
}

/**
 * ビープ音でセッション完了を通知
 * @param sessionType セッションタイプ
 */
function playSessionCompleteBeep(sessionType: SessionType): void {
  if (sessionType === SessionType.Work) {
    // 作業完了音：高めの音、2回
    playBeepSound(800, 0.2);
    setTimeout(() => playBeepSound(800, 0.2), 300);
  } else {
    // 休憩完了音：低めの音、3回
    playBeepSound(400, 0.3);
    setTimeout(() => playBeepSound(400, 0.3), 400);
    setTimeout(() => playBeepSound(400, 0.3), 800);
  }
} 
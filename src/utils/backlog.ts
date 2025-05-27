/**
 * バックログ管理ユーティリティ
 * バックログアイテムの日付管理と自動更新を行う
 */

import { getReliableDateInfo, getBacklogDateString, type DateInfo } from './date.js';

/**
 * バックログアイテムのインターフェース
 */
export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'High' | 'Medium' | 'Low';
  estimatePoints: number;
  acceptanceCriteria: string[];
  startDate?: string;
  completionDate?: string;
  implementationDetails?: string;
}

/**
 * バックログ更新履歴のインターフェース
 */
export interface BacklogUpdateHistory {
  timestamp: number;
  action: 'created' | 'updated' | 'completed' | 'started';
  itemId: string;
  oldStatus?: string;
  newStatus?: string;
  dateInfo: DateInfo;
}

/**
 * バックログアイテムを完了状態に更新
 */
export async function completeBacklogItem(
  itemId: string, 
  implementationDetails?: string
): Promise<BacklogUpdateHistory> {
  const dateInfo = await getReliableDateInfo();
  const completionDateString = await getBacklogDateString();
  
  const updateHistory: BacklogUpdateHistory = {
    timestamp: dateInfo.timestamp,
    action: 'completed',
    itemId,
    oldStatus: 'IN_PROGRESS',
    newStatus: 'DONE',
    dateInfo
  };
  
  console.log(`バックログアイテム ${itemId} を完了しました:`, {
    completionDate: completionDateString,
    datetime: dateInfo.datetime,
    implementationDetails
  });
  
  return updateHistory;
}

/**
 * バックログアイテムを開始状態に更新
 */
export async function startBacklogItem(itemId: string): Promise<BacklogUpdateHistory> {
  const dateInfo = await getReliableDateInfo();
  const startDateString = await getBacklogDateString();
  
  const updateHistory: BacklogUpdateHistory = {
    timestamp: dateInfo.timestamp,
    action: 'started',
    itemId,
    oldStatus: 'TODO',
    newStatus: 'IN_PROGRESS',
    dateInfo
  };
  
  console.log(`バックログアイテム ${itemId} を開始しました:`, {
    startDate: startDateString,
    datetime: dateInfo.datetime
  });
  
  return updateHistory;
}

/**
 * 現在の日付情報を取得してログ出力
 */
export async function logCurrentDateInfo(): Promise<DateInfo> {
  const dateInfo = await getReliableDateInfo();
  
  console.log('=== 現在の日付情報 ===');
  console.log(`日付: ${dateInfo.date}`);
  console.log(`時刻: ${dateInfo.time}`);
  console.log(`日時: ${dateInfo.datetime}`);
  console.log(`曜日: ${dateInfo.weekday}`);
  console.log(`タイムゾーン: ${dateInfo.timezone}`);
  console.log(`タイムスタンプ: ${dateInfo.timestamp}`);
  console.log('=====================');
  
  return dateInfo;
}

/**
 * バックログマークダウンの日付部分を更新
 */
export function updateBacklogMarkdownDate(
  markdownContent: string,
  itemId: string,
  dateString: string,
  action: 'completion' | 'start'
): string {
  const lines = markdownContent.split('\n');
  let inTargetItem = false;
  let updatedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // アイテムの開始を検出
    if (line.includes(itemId)) {
      inTargetItem = true;
      updatedLines.push(line);
      continue;
    }
    
    // 次のアイテムの開始を検出（現在のアイテム終了）
    if (inTargetItem && line.startsWith('#### ') && !line.includes(itemId)) {
      inTargetItem = false;
    }
    
    // 対象アイテム内で日付行を更新
    if (inTargetItem) {
      if (action === 'completion' && line.includes('**完了日**:')) {
        updatedLines.push(`- **完了日**: ${dateString}`);
        continue;
      } else if (action === 'start' && line.includes('**開始日**:')) {
        updatedLines.push(`- **開始日**: ${dateString}`);
        continue;
      } else if (action === 'completion' && line.includes('- **見積もり**:')) {
        // 完了日の行が存在しない場合、見積もりの後に追加
        updatedLines.push(line);
        updatedLines.push(`- **完了日**: ${dateString}`);
        continue;
      }
    }
    
    updatedLines.push(line);
  }
  
  return updatedLines.join('\n');
}

/**
 * 日付情報をコンソールに表示するテスト関数
 */
export async function testDateRetrieval(): Promise<void> {
  console.log('=== 日付取得テスト開始 ===');
  
  try {
    // ローカル日付を取得
    const { getCurrentDateInfo } = await import('./date.js');
    const localDate = getCurrentDateInfo();
    console.log('ローカル日付:', localDate);
    
    // 外部API日付を取得
    const { getExternalDateInfo } = await import('./date.js');
    const externalDate = await getExternalDateInfo();
    console.log('外部API日付:', externalDate);
    
    // 信頼できる日付を取得
    const reliableDate = await getReliableDateInfo();
    console.log('信頼できる日付:', reliableDate);
    
    // バックログ用日付文字列を取得
    const backlogDateString = await getBacklogDateString();
    console.log('バックログ用日付文字列:', backlogDateString);
    
  } catch (error) {
    console.error('日付取得テストでエラーが発生:', error);
  }
  
  console.log('=== 日付取得テスト終了 ===');
}

/**
 * バックログアイテムの完了を記録
 */
export async function recordBacklogCompletion(
  itemId: string,
  title: string,
  implementationDetails?: string
): Promise<string> {
  const dateInfo = await getReliableDateInfo();
  const completionDateString = await getBacklogDateString();
  
  const record = {
    itemId,
    title,
    completionDate: completionDateString,
    completionDateTime: dateInfo.datetime,
    implementationDetails: implementationDetails || '実装完了',
    timestamp: dateInfo.timestamp
  };
  
  // ローカルストレージに保存（Chrome拡張機能の場合）
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const existingRecords = await chrome.storage.local.get('backlogCompletions');
      const completions = existingRecords.backlogCompletions || [];
      completions.push(record);
      await chrome.storage.local.set({ backlogCompletions: completions });
      console.log('バックログ完了記録を保存しました:', record);
    } catch (error) {
      console.error('バックログ完了記録の保存に失敗:', error);
    }
  }
  
  return `✅ ${title} - 完了日: ${completionDateString}`;
} 
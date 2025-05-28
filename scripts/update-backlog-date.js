#!/usr/bin/env node

/**
 * バックログ日付更新スクリプト
 * 正確な日付情報を取得してバックログファイルを更新する
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 現在の日付情報を取得
 */
function getCurrentDateInfo() {
  const now = new Date();
  
  const date = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
  
  const time = now.toLocaleTimeString('ja-JP', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const datetime = `${date} ${time}`;
  
  const weekday = now.toLocaleDateString('ja-JP', { weekday: 'long' });
  
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return {
    date,
    time,
    datetime,
    timestamp: now.getTime(),
    timezone,
    weekday
  };
}

/**
 * 外部APIから日付情報を取得
 */
async function getExternalDateInfo(timezone = 'Asia/Tokyo') {
  try {
    const response = await fetch(`https://worldtimeapi.org/api/timezone/${timezone}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // ISO文字列をパース
    const date = new Date(data.datetime);
    
    const dateStr = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    const timeStr = date.toLocaleTimeString('ja-JP', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const datetime = `${dateStr} ${timeStr}`;
    
    const weekday = date.toLocaleDateString('ja-JP', { weekday: 'long' });
    
    return {
      date: dateStr,
      time: timeStr,
      datetime,
      timestamp: date.getTime(),
      timezone: data.timezone,
      weekday
    };
  } catch (error) {
    console.error('外部API日付取得エラー:', error);
    return null;
  }
}

/**
 * 信頼できる日付情報を取得
 */
async function getReliableDateInfo() {
  // まずローカル日付を取得
  const localDate = getCurrentDateInfo();
  
  try {
    // 外部APIから日付を取得
    const externalDate = await getExternalDateInfo();
    
    if (externalDate) {
      // 外部APIとローカルの差が1分以内なら外部APIを信頼
      const timeDiff = Math.abs(externalDate.timestamp - localDate.timestamp);
      if (timeDiff < 60000) { // 1分以内
        console.log('✅ 外部API日付を使用:', externalDate.datetime);
        return externalDate;
      } else {
        console.warn('⚠️ 外部APIとローカル日付に大きな差があります', {
          external: externalDate.datetime,
          local: localDate.datetime,
          diff: timeDiff
        });
      }
    }
  } catch (error) {
    console.warn('⚠️ 外部API日付取得に失敗、ローカル日付を使用:', error);
  }
  
  console.log('📅 ローカル日付を使用:', localDate.datetime);
  return localDate;
}

/**
 * バックログ用の日付文字列を生成
 */
async function getBacklogDateString() {
  const dateInfo = await getReliableDateInfo();
  return `${dateInfo.date}（${dateInfo.weekday}）`;
}

/**
 * バックログファイルの日付を更新
 */
async function updateBacklogFile(itemId, newDate, action = 'completion') {
  const backlogPath = path.join(process.cwd(), 'pomodoro_buddy', 'BACKLOG.md');
  
  try {
    // ファイルを読み込み
    const content = await fs.readFile(backlogPath, 'utf-8');
    const lines = content.split('\n');
    let inTargetItem = false;
    let updatedLines = [];
    let updated = false;
    
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
          updatedLines.push(`- **完了日**: ${newDate}`);
          updated = true;
          continue;
        } else if (action === 'start' && line.includes('**開始日**:')) {
          updatedLines.push(`- **開始日**: ${newDate}`);
          updated = true;
          continue;
        } else if (action === 'completion' && line.includes('- **見積もり**:') && !updated) {
          // 完了日の行が存在しない場合、見積もりの後に追加
          updatedLines.push(line);
          updatedLines.push(`- **完了日**: ${newDate}`);
          updated = true;
          continue;
        }
      }
      
      updatedLines.push(line);
    }
    
    if (updated) {
      // ファイルに書き戻し
      await fs.writeFile(backlogPath, updatedLines.join('\n'), 'utf-8');
      console.log(`✅ バックログファイルを更新しました: ${itemId} - ${newDate}`);
    } else {
      console.log(`⚠️ 対象アイテムが見つかりませんでした: ${itemId}`);
    }
    
    return updated;
  } catch (error) {
    console.error('❌ バックログファイル更新エラー:', error);
    return false;
  }
}

/**
 * 現在の日付情報を表示
 */
async function showCurrentDateInfo() {
  console.log('\n=== 📅 現在の日付情報 ===');
  
  const localDate = getCurrentDateInfo();
  console.log('🏠 ローカル日付:', localDate.datetime);
  console.log('   タイムゾーン:', localDate.timezone);
  console.log('   曜日:', localDate.weekday);
  
  const externalDate = await getExternalDateInfo();
  if (externalDate) {
    console.log('🌐 外部API日付:', externalDate.datetime);
    console.log('   タイムゾーン:', externalDate.timezone);
    console.log('   曜日:', externalDate.weekday);
    
    const timeDiff = Math.abs(externalDate.timestamp - localDate.timestamp);
    console.log('⏱️ 時刻差:', `${Math.round(timeDiff / 1000)}秒`);
  } else {
    console.log('❌ 外部API日付取得に失敗');
  }
  
  const reliableDate = await getReliableDateInfo();
  console.log('🎯 採用日付:', reliableDate.datetime);
  
  const backlogDateString = await getBacklogDateString();
  console.log('📝 バックログ用:', backlogDateString);
  
  console.log('========================\n');
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🕐 日付取得・バックログ更新スクリプト\n');
    console.log('使用方法:');
    console.log('  node update-backlog-date.js show              # 現在の日付情報を表示');
    console.log('  node update-backlog-date.js update PBI-001    # PBI-001の完了日を更新');
    console.log('  node update-backlog-date.js start PBI-002     # PBI-002の開始日を更新');
    console.log('');
    
    // デフォルトで現在の日付情報を表示
    await showCurrentDateInfo();
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'show':
      await showCurrentDateInfo();
      break;
      
    case 'update':
      if (args.length < 2) {
        console.error('❌ エラー: アイテムIDを指定してください');
        console.log('例: node update-backlog-date.js update PBI-001');
        process.exit(1);
      }
      
      const itemId = args[1];
      const completionDate = await getBacklogDateString();
      const success = await updateBacklogFile(itemId, completionDate, 'completion');
      
      if (success) {
        console.log(`✅ ${itemId} の完了日を ${completionDate} に更新しました`);
      } else {
        console.log(`❌ ${itemId} の更新に失敗しました`);
        process.exit(1);
      }
      break;
      
    case 'start':
      if (args.length < 2) {
        console.error('❌ エラー: アイテムIDを指定してください');
        console.log('例: node update-backlog-date.js start PBI-002');
        process.exit(1);
      }
      
      const startItemId = args[1];
      const startDate = await getBacklogDateString();
      const startSuccess = await updateBacklogFile(startItemId, startDate, 'start');
      
      if (startSuccess) {
        console.log(`✅ ${startItemId} の開始日を ${startDate} に更新しました`);
      } else {
        console.log(`❌ ${startItemId} の更新に失敗しました`);
        process.exit(1);
      }
      break;
      
    default:
      console.error(`❌ 不明なコマンド: ${command}`);
      console.log('利用可能なコマンド: show, update, start');
      process.exit(1);
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ スクリプト実行エラー:', error);
    process.exit(1);
  });
} 
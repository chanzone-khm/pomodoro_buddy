/**
 * 日付管理ユーティリティ
 * 正確な日付情報の取得と管理を行う
 */

/**
 * 日付情報のインターフェース
 */
export interface DateInfo {
  date: string; // YYYY-MM-DD形式
  time: string; // HH:MM:SS形式
  datetime: string; // YYYY-MM-DD HH:MM:SS形式
  timestamp: number; // エポックミリ秒
  timezone: string; // タイムゾーン
  weekday: string; // 曜日（日本語）
}

/**
 * 外部API日付情報のインターフェース
 */
export interface ExternalDateInfo {
  datetime: string;
  timezone: string;
  utc_datetime: string;
  utc_offset: string;
  day_of_week: number;
  day_of_year: number;
  week_number: number;
}

/**
 * 現在の日付情報を取得（ローカル）
 */
export function getCurrentDateInfo(): DateInfo {
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
 * World Time APIを使用
 */
export async function getExternalDateInfo(timezone: string = 'Asia/Tokyo'): Promise<DateInfo | null> {
  try {
    const response = await fetch(`https://worldtimeapi.org/api/timezone/${timezone}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ExternalDateInfo = await response.json();
    
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
 * 複数のソースから日付情報を取得し、最も信頼できるものを返す
 */
export async function getReliableDateInfo(): Promise<DateInfo> {
  // まずローカル日付を取得
  const localDate = getCurrentDateInfo();
  
  try {
    // 外部APIから日付を取得
    const externalDate = await getExternalDateInfo();
    
    if (externalDate) {
      // 外部APIとローカルの差が1分以内なら外部APIを信頼
      const timeDiff = Math.abs(externalDate.timestamp - localDate.timestamp);
      if (timeDiff < 60000) { // 1分以内
        console.log('外部API日付を使用:', externalDate.datetime);
        return externalDate;
      } else {
        console.warn('外部APIとローカル日付に大きな差があります', {
          external: externalDate.datetime,
          local: localDate.datetime,
          diff: timeDiff
        });
      }
    }
  } catch (error) {
    console.warn('外部API日付取得に失敗、ローカル日付を使用:', error);
  }
  
  console.log('ローカル日付を使用:', localDate.datetime);
  return localDate;
}

/**
 * 日付を指定フォーマットで取得
 */
export function formatDate(date: Date, format: 'date' | 'time' | 'datetime' | 'iso' = 'datetime'): string {
  switch (format) {
    case 'date':
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
    
    case 'time':
      return date.toLocaleTimeString('ja-JP', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    
    case 'datetime':
      const dateStr = formatDate(date, 'date');
      const timeStr = formatDate(date, 'time');
      return `${dateStr} ${timeStr}`;
    
    case 'iso':
      return date.toISOString();
    
    default:
      return formatDate(date, 'datetime');
  }
}

/**
 * 日付の妥当性をチェック
 */
export function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 現在時刻をJST（日本標準時）で取得
 */
export function getCurrentJSTDate(): Date {
  const now = new Date();
  const jstOffset = 9 * 60; // JST is UTC+9
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (jstOffset * 60000));
}

/**
 * バックログ用の日付文字列を生成
 */
export async function getBacklogDateString(): Promise<string> {
  const dateInfo = await getReliableDateInfo();
  return `${dateInfo.date}（${dateInfo.weekday}）`;
} 
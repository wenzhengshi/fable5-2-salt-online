'use strict';

const storage = require('../config/storage');

const FILE = 'holidays.json';
const TIME_ZONE = 'Asia/Shanghai';
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
const CACHE_TTL_MS = 60 * 1000;
const WORK_WINDOWS = Object.freeze([
  Object.freeze({ start: 0, end: 7 * 60 }),
  Object.freeze({ start: 9 * 60, end: 12 * 60 }),
  Object.freeze({ start: 14 * 60, end: 18 * 60 })
]);
const WORKDAY_LABELS = Object.freeze(['周日', '周一', '周二', '周三', '周四', '周五', '周六']);

const DEFAULT_HOLIDAYS = Object.freeze([
  { date: '2025-01-01', name: '元旦' },
  { date: '2025-01-28', name: '春节' },
  { date: '2025-01-29', name: '春节' },
  { date: '2025-01-30', name: '春节' },
  { date: '2025-01-31', name: '春节' },
  { date: '2025-02-01', name: '春节' },
  { date: '2025-02-02', name: '春节' },
  { date: '2025-02-03', name: '春节' },
  { date: '2025-02-04', name: '春节' },
  { date: '2025-04-04', name: '清明节' },
  { date: '2025-04-05', name: '清明节' },
  { date: '2025-04-06', name: '清明节' },
  { date: '2025-05-01', name: '劳动节' },
  { date: '2025-05-02', name: '劳动节' },
  { date: '2025-05-03', name: '劳动节' },
  { date: '2025-05-04', name: '劳动节' },
  { date: '2025-05-05', name: '劳动节' },
  { date: '2025-05-31', name: '端午节' },
  { date: '2025-06-01', name: '端午节' },
  { date: '2025-06-02', name: '端午节' },
  { date: '2025-10-01', name: '国庆节' },
  { date: '2025-10-02', name: '国庆节' },
  { date: '2025-10-03', name: '国庆节' },
  { date: '2025-10-04', name: '国庆节' },
  { date: '2025-10-05', name: '国庆节' },
  { date: '2025-10-06', name: '国庆节' },
  { date: '2025-10-07', name: '国庆节' },
  { date: '2025-10-08', name: '国庆节' },
  { date: '2026-01-01', name: '元旦' },
  { date: '2026-01-02', name: '元旦' },
  { date: '2026-01-03', name: '元旦' },
  { date: '2026-02-15', name: '春节' },
  { date: '2026-02-16', name: '春节' },
  { date: '2026-02-17', name: '春节' },
  { date: '2026-02-18', name: '春节' },
  { date: '2026-02-19', name: '春节' },
  { date: '2026-02-20', name: '春节' },
  { date: '2026-02-21', name: '春节' },
  { date: '2026-02-22', name: '春节' },
  { date: '2026-04-04', name: '清明节' },
  { date: '2026-04-05', name: '清明节' },
  { date: '2026-04-06', name: '清明节' },
  { date: '2026-05-01', name: '劳动节' },
  { date: '2026-05-02', name: '劳动节' },
  { date: '2026-05-03', name: '劳动节' },
  { date: '2026-05-04', name: '劳动节' },
  { date: '2026-05-05', name: '劳动节' },
  { date: '2026-06-19', name: '端午节' },
  { date: '2026-06-20', name: '端午节' },
  { date: '2026-06-21', name: '端午节' },
  { date: '2026-09-25', name: '中秋节' },
  { date: '2026-09-26', name: '中秋节' },
  { date: '2026-09-27', name: '中秋节' },
  { date: '2026-10-01', name: '国庆节' },
  { date: '2026-10-02', name: '国庆节' },
  { date: '2026-10-03', name: '国庆节' },
  { date: '2026-10-04', name: '国庆节' },
  { date: '2026-10-05', name: '国庆节' },
  { date: '2026-10-06', name: '国庆节' },
  { date: '2026-10-07', name: '国庆节' },
  { date: '2027-01-01', name: '元旦' },
  { date: '2027-01-02', name: '元旦' },
  { date: '2027-01-03', name: '元旦' },
  { date: '2027-02-05', name: '春节' },
  { date: '2027-02-06', name: '春节' },
  { date: '2027-02-07', name: '春节' },
  { date: '2027-02-08', name: '春节' },
  { date: '2027-02-09', name: '春节' },
  { date: '2027-02-10', name: '春节' },
  { date: '2027-02-11', name: '春节' },
  { date: '2027-02-12', name: '春节' },
  { date: '2027-04-03', name: '清明节' },
  { date: '2027-04-04', name: '清明节' },
  { date: '2027-04-05', name: '清明节' },
  { date: '2027-05-01', name: '劳动节' },
  { date: '2027-05-02', name: '劳动节' },
  { date: '2027-05-03', name: '劳动节' },
  { date: '2027-05-04', name: '劳动节' },
  { date: '2027-05-05', name: '劳动节' },
  { date: '2027-06-07', name: '端午节' },
  { date: '2027-06-08', name: '端午节' },
  { date: '2027-06-09', name: '端午节' },
  { date: '2027-09-13', name: '中秋节' },
  { date: '2027-09-14', name: '中秋节' },
  { date: '2027-09-15', name: '中秋节' },
  { date: '2027-10-01', name: '国庆节' },
  { date: '2027-10-02', name: '国庆节' },
  { date: '2027-10-03', name: '国庆节' },
  { date: '2027-10-04', name: '国庆节' },
  { date: '2027-10-05', name: '国庆节' },
  { date: '2027-10-06', name: '国庆节' },
  { date: '2027-10-07', name: '国庆节' }
]);

let formatter = null;
let holidayCache = null;
let holidayCacheAt = 0;
let fileSeeded = false;

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateKey(year, month, day) {
  return String(year) + '-' + pad(month) + '-' + pad(day);
}

function validDateKey(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day;
}

function localFormatter() {
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    });
  }
  return formatter;
}

function localParts(ms) {
  const values = {};
  for (const part of localFormatter().formatToParts(new Date(ms))) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour) % 24;
  const minute = Number(values.minute);
  const second = Number(values.second);
  return { year, month, day, hour, minute, second };
}

function localTimestamp(year, month, day, hour = 0, minute = 0, second = 0) {
  return Date.UTC(year, month - 1, day, hour, minute, second) - CHINA_OFFSET_MS;
}

function formatLocalIso(ms) {
  const parts = localParts(ms);
  return dateKey(parts.year, parts.month, parts.day) + 'T' +
    pad(parts.hour) + ':' + pad(parts.minute) + ':' + pad(parts.second) + '+08:00';
}

function formatClock(minutes) {
  const value = Math.max(0, Math.min(24 * 60, Math.floor(minutes)));
  return pad(Math.floor(value / 60)) + ':' + pad(value % 60);
}

function holidayEntries(raw) {
  const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.holidays) ? raw.holidays : []);
  const rows = [];
  for (const item of list) {
    const date = validDateKey(typeof item === 'string' ? item : item && item.date);
    if (!date) continue;
    const name = typeof item === 'string' ? '' : String(item && item.name || '').trim().slice(0, 40);
    rows.push({ date: String(typeof item === 'string' ? item : item.date).trim(), name });
  }
  return rows;
}

function seedHolidayFile() {
  if (fileSeeded) return;
  fileSeeded = true;
  try {
    storage.writeJson(FILE, {
      updatedAt: new Date().toISOString(),
      timeZone: TIME_ZONE,
      note: 'holidays 中的日期在周一至周五也全天开放；周末默认开放。',
      holidays: DEFAULT_HOLIDAYS
    });
  } catch (error) {
    console.error('[play-schedule] holiday file seed failed:', error && error.message ? error.message : error);
  }
}

function loadHolidays(force) {
  const now = Date.now();
  if (!force && holidayCache && now - holidayCacheAt < CACHE_TTL_MS) return holidayCache;
  let stored = null;
  let missing = false;
  try {
    stored = storage.readJson(FILE);
    if (!stored || (Array.isArray(stored) && stored.length === 0) ||
        (stored && Array.isArray(stored.holidays) && stored.holidays.length === 0)) {
      missing = true;
    }
  } catch (error) {
    console.error('[play-schedule] holiday file read failed:', error && error.message ? error.message : error);
  }
  if (missing) seedHolidayFile();
  const merged = new Map();
  for (const row of DEFAULT_HOLIDAYS) merged.set(row.date, row.name);
  for (const row of holidayEntries(stored)) merged.set(row.date, row.name || merged.get(row.date) || '');
  holidayCache = merged;
  holidayCacheAt = now;
  return holidayCache;
}

function weekdayOf(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function holidaysForStatus() {
  return loadHolidays(false);
}

function statusAt(ms, options) {
  const now = Number.isFinite(Number(ms)) ? Number(ms) : Date.now();
  const parts = localParts(now);
  const key = dateKey(parts.year, parts.month, parts.day);
  const weekday = weekdayOf(parts);
  const holidayMap = options && options.holidays instanceof Map ? options.holidays : holidaysForStatus();
  const holidayName = holidayMap.get(key) || '';
  const holiday = holidayMap.has(key);
  const weekend = weekday === 0 || weekday === 6;
  const workday = weekday >= 1 && weekday <= 5 && !holiday;
  const minuteOfDay = parts.hour * 60 + parts.minute + parts.second / 60;
  const activeWindow = workday
    ? WORK_WINDOWS.find((window) => minuteOfDay >= window.start && minuteOfDay < window.end) || null
    : null;
  const blocked = !!activeWindow;
  let nextPlayableAt = 0;
  if (blocked) {
    const hour = Math.floor(activeWindow.end / 60);
    const minute = activeWindow.end % 60;
    nextPlayableAt = localTimestamp(parts.year, parts.month, parts.day, hour, minute, 0);
  }
  return {
    ok: true,
    blocked,
    playableNow: !blocked,
    reason: blocked ? 'work-hours' : '',
    timeZone: TIME_ZONE,
    serverNow: now,
    serverNowLocal: formatLocalIso(now),
    date: key,
    weekday,
    weekdayLabel: WORKDAY_LABELS[weekday],
    weekend,
    holiday,
    holidayName,
    workday,
    activeWindow: activeWindow ? { start: formatClock(activeWindow.start), end: formatClock(activeWindow.end) } : null,
    windows: WORK_WINDOWS.map((window) => ({ start: formatClock(window.start), end: formatClock(window.end) })),
    nextPlayableAt,
    nextPlayableLocal: blocked ? formatLocalIso(nextPlayableAt) : '',
    remainingMs: blocked ? Math.max(0, nextPlayableAt - now) : 0,
    holidayCount: holidayMap.size
  };
}

function status() {
  return statusAt(Date.now());
}

function descriptor() {
  const holidays = loadHolidays(false);
  return {
    timeZone: TIME_ZONE,
    windows: WORK_WINDOWS.map((window) => ({ start: formatClock(window.start), end: formatClock(window.end) })),
    workdays: [1, 2, 3, 4, 5],
    weekendPlayable: true,
    weekdayHolidayPlayable: true,
    holidayCount: holidays.size,
    storage: FILE,
    endpoint: '/api/game/play-schedule'
  };
}

module.exports = {
  FILE,
  TIME_ZONE,
  WORK_WINDOWS,
  DEFAULT_HOLIDAYS,
  status,
  statusAt,
  descriptor,
  formatLocalIso,
  refresh: () => loadHolidays(true)
};

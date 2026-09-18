/* Bone Quest 2.0 — 저장 · 백업 · v1 변환
   저장 위치: localStorage["bonequest.v2"]. 기록만 저장하고 LV/EXP/CAMP는 rules.js에서 계산한다. */

export const SCHEMA_VERSION = 2;
export const KEY_V2 = "bonequest.v2";
export const KEY_V1 = "bonequest.v1";

/** 빈 상태 */
export function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    log: {},          // { "2026-09-18": ["chair-squat", "s:protein", ...] }
    rest: {},         // { "2026-09-18": true }  의도적 휴식
    two: {},          // { "2026-09-18": true }  2분 퀘스트
    checkpoints: [],  // [{ date, muscleMass, weight, memo }]
    settings: { sfx: true, bgm: false, track: 0 },
    flags: { prologueSeen: false, backupPromptWeek: null, eventsFrom: null },  // backupPromptWeek: 백업 알림을 닫은 주, eventsFrom: 이벤트 적용 시작일(2.0 첫 실행일)
    savedAt: null,
  };
}

const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** 어떤 형태(v1/v2/부분 손상)든 온전한 v2 상태로 만든다 */
export function normalize(raw) {
  const base = emptyState();
  if (!isPlainObject(raw)) return base;

  const log = {};
  if (isPlainObject(raw.log)) {
    for (const [date, items] of Object.entries(raw.log)) {
      if (!isDate(date) || !Array.isArray(items)) continue;
      const clean = [...new Set(items.filter((i) => typeof i === "string" && i))];
      if (clean.length) log[date] = clean;
    }
  }
  const boolMap = (src) => {
    const out = {};
    if (isPlainObject(src)) for (const [date, on] of Object.entries(src)) if (isDate(date) && on) out[date] = true;
    return out;
  };
  const checkpoints = Array.isArray(raw.checkpoints)
    ? raw.checkpoints
        .filter((c) => isPlainObject(c) && isDate(c.date))
        .map((c) => ({
          date: c.date,
          muscleMass: Number.isFinite(+c.muscleMass) ? +c.muscleMass : null,
          weight: Number.isFinite(+c.weight) ? +c.weight : null,
          memo: typeof c.memo === "string" ? c.memo : "",
        }))
    : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    log,
    rest: boolMap(raw.rest),
    two: boolMap(raw.two),
    checkpoints,
    settings: {
      sfx: raw.settings?.sfx ?? raw.sfx ?? base.settings.sfx,
      bgm: raw.settings?.bgm ?? raw.bgm ?? base.settings.bgm,
      track: Number.isInteger(raw.settings?.track ?? raw.track) ? (raw.settings?.track ?? raw.track) : 0,
    },
    flags: {
      prologueSeen: !!(raw.flags?.prologueSeen ?? raw.seen),
      backupPromptWeek: isDate(raw.flags?.backupPromptWeek) ? raw.flags.backupPromptWeek : null,
      eventsFrom: isDate(raw.flags?.eventsFrom) ? raw.flags.eventsFrom : null,
    },
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : (typeof raw.saved === "string" ? raw.saved : null),
  };
}

/** v1(기록만 있는 형태) → v2. 기록·사운드·프롤로그 여부는 살리고 나머지는 새로 계산한다.
 *  이벤트는 2.0을 쓰기 시작한 날부터 적용하므로, 변환 시점을 eventsFrom에 남긴다. */
export function migrateV1(rawV1, today = new Date().toISOString().slice(0, 10)) {
  const state = normalize(rawV1);
  state.migratedFrom = 1;
  state.flags.eventsFrom = state.flags.eventsFrom ?? today;
  return state;
}

/* ---------- localStorage ---------- */
export function load(storage = globalThis.localStorage, today = new Date().toISOString().slice(0, 10)) {
  if (!storage) return { state: emptyState(), migrated: false };
  try {
    const v2 = storage.getItem(KEY_V2);
    if (v2) return { state: normalize(JSON.parse(v2)), migrated: false };
  } catch { /* 손상된 데이터는 아래 v1 경로 / 빈 상태로 */ }
  try {
    const v1 = storage.getItem(KEY_V1);
    if (v1) {
      const state = migrateV1(JSON.parse(v1), today);
      save(state, storage);                       // 변환 결과를 v2 키에 저장 (v1 키는 지우지 않는다)
      return { state, migrated: true };
    }
  } catch { /* noop */ }
  return { state: emptyState(), migrated: false };
}

export function save(state, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.setItem(KEY_V2, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }));
    return true;
  } catch {
    return false;                                  // 저장 공간 초과 등
  }
}

/* ---------- 백업 ---------- */
export function exportObject(state, today) {
  return { ...state, schemaVersion: SCHEMA_VERSION, savedAt: today ?? state.savedAt };
}
export const exportJSON = (state, today) => JSON.stringify(exportObject(state, today), null, 1);
export const backupFileName = (today) => `bone-quest-${today}.json`;

/** 백업 파일 읽기. v1·v2 모두 받아들이고, 못 읽으면 이유를 돌려준다 */
export function parseBackup(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { return { ok: false, reason: "JSON 형식이 아닙니다." }; }
  if (!isPlainObject(raw) || !isPlainObject(raw.log)) return { ok: false, reason: "Bone Quest 백업 파일이 아닌 것 같습니다." };
  const version = Number(raw.schemaVersion) || 1;
  if (version > SCHEMA_VERSION) return { ok: false, reason: `이 앱보다 새로운 백업입니다 (schemaVersion ${version}).` };
  const state = version === 1 ? migrateV1(raw) : normalize(raw);
  return {
    ok: true,
    version,
    state,
    summary: {
      days: Object.keys(state.log).length,
      rest: Object.keys(state.rest).length,
      two: Object.keys(state.two).length,
      checkpoints: state.checkpoints.length,
      savedAt: state.savedAt,
    },
  };
}

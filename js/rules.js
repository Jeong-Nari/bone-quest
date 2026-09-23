/* Bone Quest 2.0 — 규칙 계산 (저장 상태 → 화면에 필요한 값)
   저장된 것은 기록뿐이고, LV/EXP/CAMP/보스는 항상 여기서 다시 계산한다. */

import {
  START, LAUNCH_WEEK, TYPE, DMG, BOSS_HP, EXP, levelNeed, CAMP,
  TWO_MIN_PER_WEEK, REST_PER_WEEK, RUNDAY_ID, LEGACY_MAIN_COUNT,
  ROUTINE, FUEL, ITEM_INDEX, FLEX_IDS, EVENTS, WORLD, WORLD_UNLOCK, REGIONS, CHECKPOINTS,
} from "./data.js";

/* ---------- 날짜 ---------- */
export const parseDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (iso, n) => { const d = parseDate(iso); d.setDate(d.getDate() + n); return toISO(d); };
export const dow = (iso) => parseDate(iso).getDay();
export const mondayOf = (iso) => addDays(iso, -((dow(iso) + 6) % 7));
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 864e5);
export const todayISO = () => toISO(new Date());

/* ---------- 기록 읽기 ---------- */
export const isSide = (id) => id.startsWith("s:") || /^s\d+$/.test(id);           // s0..s3 = 구버전 사이드
const isLegacyMain = (id) => /^m\d+-\d+$/.test(id);
export const logOf = (state, date) => state.log[date] ?? [];
export const mainsOf = (state, date) => logOf(state, date).filter((id) => !isSide(id));
const isLegacyDay = (state, date) => { const m = mainsOf(state, date); return m.length > 0 && m.every(isLegacyMain); };

/** 그 날 메인 퀘스트 개수 */
export function mainCount(state, date) {
  const w = dow(date);
  if (isLegacyDay(state, date) && LEGACY_MAIN_COUNT[w] != null) return LEGACY_MAIN_COUNT[w];
  return ROUTINE[w].items.length;
}
/** 세션 인정 기준 개수 (메인 동작 50% 이상) */
export const halfCount = (state, date) => Math.ceil(mainCount(state, date) / 2);

/** 세션 인정 여부: 근력·리커버리 = 메인 50%+, 러닝 = Runday 완료 */
export function isRecognized(state, date) {
  if (state.rest[date]) return false;
  const mains = mainsOf(state, date);
  if (!mains.length) return false;
  if (TYPE[dow(date)] === "RUN") return isLegacyDay(state, date) || mains.includes(RUNDAY_ID);
  return mains.length >= halfCount(state, date);
}
export const isDayCleared = (state, date) => mainsOf(state, date).length >= mainCount(state, date);
export const sessionType = (date) => TYPE[dow(date)];
export const damageOf = (state, date) => (isRecognized(state, date) ? DMG[sessionType(date)] : 0);
/** 인정일: 캠프 계산의 단위 (하루에 여러 세션을 해도 1일) */
export const isActiveDay = (state, date) => isRecognized(state, date) || !!state.two[date];

/* ---------- 이벤트 (날짜 seed, 등장 가능 요일만) ---------- */
export function eventOf(date) {
  const w = dow(date);
  const pool = ["DOUBLE", "FUEL"];
  if (TYPE[w] === "RUN") pool.push("RUN");
  if (ROUTINE[w].items.some((i) => FLEX_IDS.has(i.id))) pool.push("STRETCH");
  pool.sort();
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const key = pool[h % pool.length];
  return { key, ...EVENTS[key] };
}

/** 이벤트가 적용되는 날인지: 2.0을 쓰기 시작한 날부터, REST일 제외 */
export const eventsActiveOn = (state, date) => {
  const from = state.flags?.eventsFrom ?? LAUNCH_WEEK;
  return date >= from && !state.rest[date];
};

/** 그 날 한 항목의 EXP (이벤트 배수 포함) */
export function expOfItem(state, date, id, firstSideId) {
  const base = isSide(id) ? EXP.side : EXP.main;
  if (!eventsActiveOn(state, date)) return base;
  const { key } = eventOf(date);
  if (key === "DOUBLE") return base * 2;
  if (key === "RUN" && id === RUNDAY_ID) return 15;
  if (key === "STRETCH" && FLEX_IDS.has(id)) return 15;
  if (key === "FUEL" && isSide(id) && id === firstSideId) return base * 2;
  return base;
}

/* ---------- 주간 보스 ---------- */
export function weekOf(state, mondayISO, today = todayISO()) {
  const days = [];
  let damage = 0, str = 0, run = 0, rec = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(mondayISO, i);
    const inRange = date >= START && date <= today;
    const dmg = inRange ? damageOf(state, date) : 0;
    damage += dmg;
    if (dmg) { const t = sessionType(date); if (t === "STR") str++; else if (t === "RUN") run++; else rec++; }
    days.push({ date, damage: dmg, future: date > today, rest: !!state.rest[date] });
  }
  return {
    monday: mondayISO, days, damage, str, run, rec,
    hp: Math.max(0, BOSS_HP - damage),
    killed: damage >= BOSS_HP,
    finished: addDays(mondayISO, 6) < today,
  };
}

export function allWeeks(state, today = todayISO()) {
  const out = [];
  for (let m = mondayOf(START); m <= today; m = addDays(m, 7)) out.push(weekOf(state, m, today));
  return out;
}

/* ---------- 캠프 · EXP · 레벨 ---------- */
export function compute(state, today = todayISO()) {
  const dates = [];
  for (let d = START; d <= today; d = addDays(d, 1)) dates.push(d);

  const stats = { bone: 0, str: 0, flex: 0, sta: 0, nut: 0 };
  let exp = 0;
  for (const date of Object.keys(state.log)) {
    const items = logOf(state, date);
    if (!items.length) continue;
    const firstSide = items.find(isSide);
    for (const id of items) {
      exp += expOfItem(state, date, id, firstSide);
      const item = ITEM_INDEX.get(id);
      if (item && stats[item.stat] != null) stats[item.stat]++;
    }
    if (mainsOf(state, date).length && isDayCleared(state, date)) exp += EXP.dayClear;
  }
  for (const date of Object.keys(state.two)) if (state.two[date]) exp += EXP.twoMin;

  let camp = CAMP.minLevel, inactiveRun = 0, gapRun = 0;
  let week = null, weekActive = 0, weekRaised = false, lastGap = null;
  const history = [];
  for (const date of dates) {
    if (mondayOf(date) !== week) { week = mondayOf(date); weekActive = 0; weekRaised = false; }
    if (state.rest[date]) { inactiveRun = 0; gapRun = 0; history.push({ date, kind: "rest", text: "REST 사용 · 불꽃 유지" }); continue; }

    const recognized = isRecognized(state, date);
    if (isActiveDay(state, date)) {
      if (gapRun >= CAMP.comebackGap) { exp += EXP.comeback; history.push({ date, kind: "comeback", text: `WELCOME BACK · +${EXP.comeback} EXP` }); }
      if (gapRun > 0) lastGap = { days: gapRun, returnedOn: date };
      inactiveRun = 0; gapRun = 0;
    } else if (date !== today) {                 // 오늘은 아직 끝나지 않았으므로 무행동으로 세지 않는다
      inactiveRun++; gapRun++;
      if (inactiveRun >= CAMP.inactiveForDrop) {
        const before = camp;
        camp = Math.max(CAMP.minLevel, camp - 1);
        inactiveRun = 0;
        history.push({ date, kind: "down", text: `CAMPFIRE RESTS · Lv.${before} → Lv.${camp}` });
      }
    }
    if (recognized) {
      weekActive++;
      if (weekActive >= CAMP.weekDaysForRise && !weekRaised) {
        weekRaised = true; camp++;
        history.push({ date, kind: "up", text: `CAMPFIRE GROWS · Lv.${camp - 1} → Lv.${camp}` });
      }
    }
  }

  const weeks = allWeeks(state, today);
  for (const w of weeks) if (w.killed && w.monday >= LAUNCH_WEEK) exp += EXP.bossKill;

  let level = 1, need = levelNeed(1), rest = exp;
  while (rest >= need) { rest -= need; level++; need = levelNeed(level); }

  const currentWeek = weeks[weeks.length - 1];
  const finishedWeeks = weeks.filter((w) => w.finished);
  const strengthWeeks = finishedWeeks.filter((w) => w.str >= 3).length;

  const weekStart = mondayOf(today);
  const fuelWeek = {};
  for (const f of FUEL) {
    let n = 0;
    for (let i = 0; i < 7; i++) { const d = addDays(weekStart, i); if (d <= today && logOf(state, d).includes(f.id)) n++; }
    fuelWeek[f.id] = n;
  }
  let twoWeek = 0, restWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (state.two[d]) twoWeek++;
    if (state.rest[d]) restWeek++;
  }

  const month = { STR: [0, 0], RUN: [0, 0], REC: [0, 0] };
  let protein = 0, monthDays = 0;
  const monthPrefix = today.slice(0, 7);
  for (const date of dates) {
    if (!date.startsWith(monthPrefix)) continue;
    monthDays++;
    const t = sessionType(date);
    month[t][1]++;
    if (isRecognized(state, date)) month[t][0]++;
    if (logOf(state, date).includes("s:protein")) protein++;
  }

  return {
    today, exp, level, levelRest: rest, levelNeed: need,
    camp, campHistory: history, lastGap,
    stats, weeks, currentWeek,
    strengthWeekRate: { hit: strengthWeeks, of: finishedWeeks.length },
    fuelWeek, twoWeek, twoLeft: Math.max(0, TWO_MIN_PER_WEEK - twoWeek),
    restWeek, restLeft: Math.max(0, REST_PER_WEEK - restWeek),
    month, protein, monthDays,
    event: eventsActiveOn(state, today) ? eventOf(today) : null,
    checkpoints: CHECKPOINTS.map((c) => ({
      ...c,
      dday: daysBetween(today, c.date),
      record: (state.checkpoints ?? []).find((r) => r.date === c.date) ?? null,
    })),
    world: worldProgress(state, today),
    worldUnlock: worldUnlock(state, today),
  };
}

/* ---------- WORLD 해금 ---------- */
/** 2.0을 쓰기 시작한 주부터 몇 주가 지났는지, 그중 인정일 3일 이상인 주가 몇 주인지.
 *  한 번 열리면 flags.worldUnlockedOn에 남아 다시 닫히지 않는다. */
export function worldUnlock(state, today = todayISO()) {
  const startWeek = mondayOf(state.flags?.eventsFrom ?? LAUNCH_WEEK);
  const curWeek = mondayOf(today);
  let weeksUsed = 0;
  for (let m = startWeek; m <= curWeek; m = addDays(m, 7)) weeksUsed++;

  let campWeeks = 0;
  for (let m = startWeek; m <= curWeek; m = addDays(m, 7)) {
    let days = 0;
    for (let i = 0; i < 7; i++) { const d = addDays(m, i); if (d <= today && isRecognized(state, d)) days++; }
    if (days >= WORLD_UNLOCK.recognizedPerWeek) campWeeks++;
  }
  const already = state.flags?.worldUnlockedOn ?? null;
  const met = weeksUsed >= WORLD_UNLOCK.weeksUsed && campWeeks >= WORLD_UNLOCK.campWeeks;
  return {
    unlocked: !!already || met,
    justNow: !already && met,
    since: already,
    weeksUsed, weeksNeed: WORLD_UNLOCK.weeksUsed,
    campWeeks, campNeed: WORLD_UNLOCK.campWeeks,
  };
}

/* ---------- WORLD (Phase 2) ---------- */
/** 지역 n(0부터)의 기간. START에서 n달 뒤 같은 날 ~ 그 다음 달 전날 */
function regionRange(n) {
  const start = parseDate(START);
  const from = toISO(new Date(start.getFullYear(), start.getMonth() + n, start.getDate()));
  const to = addDays(toISO(new Date(start.getFullYear(), start.getMonth() + n + 1, start.getDate())), -1);
  return { from, to };
}

/** 오늘이 속한 지역 번호(0부터). START 이전이면 0, 12지역을 넘어가면 마지막 지역 */
export function regionIndex(today = todayISO()) {
  const start = parseDate(START), cur = parseDate(today);
  let i = (cur.getFullYear() - start.getFullYear()) * 12 + (cur.getMonth() - start.getMonth());
  if (cur.getDate() < start.getDate()) i--;
  return Math.max(0, Math.min(WORLD.regions - 1, i));
}

const starsOf = (percent) => (percent >= 100 ? 3 : percent >= 70 ? 2 : percent >= 40 ? 1 : 0);

/** 지역 하나의 진행도. 진행률은 시간이 아니라 그 달의 인정일로만 오른다 */
export function regionProgress(state, n, today = todayISO()) {
  const { from, to } = regionRange(n);
  let recognized = 0, bosses = 0;
  for (let d = from; d <= to && d <= today; d = addDays(d, 1)) if (isRecognized(state, d)) recognized++;
  for (const w of allWeeks(state, today)) if (w.killed && w.monday >= from && w.monday <= to) bosses++;
  const percent = Math.min(100, Math.round((recognized / WORLD.recognizedPerRegion) * 100));
  const cur = regionIndex(today);
  return {
    n, region: n + 1, name: REGIONS[n]?.name ?? `${n + 1}지역`, desc: REGIONS[n]?.desc ?? "",
    from, to, recognized, need: WORLD.recognizedPerRegion, bosses, bossNeed: WORLD.bossPerRegion,
    percent, stars: starsOf(percent),
    state: n < cur ? "past" : n === cur ? "current" : "future",
    daysLeft: n === cur ? Math.max(0, daysBetween(today, to)) : null,
  };
}

/** 현재 지역 + 12개 전체 + 다음 지역 */
export function worldProgress(state, today = todayISO()) {
  const cur = regionIndex(today);
  const list = Array.from({ length: WORLD.regions }, (_, i) => regionProgress(state, i, today));
  const done = list.filter((r) => r.state === "past");
  return {
    ...list[cur],
    list,
    next: list[cur + 1] ?? null,
    clearedRegions: done.filter((r) => r.stars > 0).length,
    totalStars: done.reduce((a, r) => a + r.stars, 0) + list[cur].stars,
  };
}

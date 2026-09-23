/* 1단계 검증: v1 백업 → v2 변환 → 규칙 계산 결과가 목업과 같은지 확인
   실행: node test/migration.test.mjs */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { migrateV1, normalize, exportJSON, parseBackup, load, save, KEY_V1, KEY_V2, SCHEMA_VERSION } from "../js/storage.js";
import { compute, isRecognized, halfCount, damageOf, worldProgress, regionProgress, regionIndex, worldUnlock, expOfItem } from "../js/rules.js";
import { REGIONS, WORLD, WORLD_UNLOCK, METRICS, ROUTINE, RUNDAY_ID } from "../js/data.js";

const TODAY = "2026-09-18";
const v1 = JSON.parse(readFileSync(new URL("../fixtures/v1-2026-09-18.json", import.meta.url), "utf8"));
const results = [];
const check = (name, fn) => { try { fn(); results.push(["ok", name]); } catch (e) { results.push(["FAIL", `${name} — ${e.message}`]); } };

/* ---- 변환 ---- */
const state = migrateV1(v1, TODAY);
check("schemaVersion 2로 변환", () => assert.equal(state.schemaVersion, SCHEMA_VERSION));
check("기록 17일 모두 보존", () => assert.equal(Object.keys(state.log).length, Object.keys(v1.log).length));
check("구버전 키 유지 (9/2 m3-*)", () => assert.deepEqual(state.log["2026-09-02"].filter(i => i.startsWith("m")).sort(), ["m3-0","m3-1","m3-2","m3-3","m3-4"]));
check("REST·2분 퀘스트는 빈 상태로 시작", () => { assert.deepEqual(state.rest, {}); assert.deepEqual(state.two, {}); });
check("savedAt 이관", () => assert.equal(state.savedAt, "2026-09-18"));
check("이벤트 적용 시작일 = 변환일", () => assert.equal(state.flags.eventsFrom, TODAY));
check("변환 전 기록에는 이벤트 배수 없음 (9/16 메인 +10)", () => assert.equal(expOfItem(state, "2026-09-16", "towel-row"), 10));

/* ---- 세션 인정 ---- */
check("9/16 상체 6/6 → 인정", () => assert.equal(isRecognized(state, "2026-09-16"), true));
check("9/11 임팩트 3/5 → 인정 (절반 이상)", () => { assert.equal(halfCount(state, "2026-09-11"), 3); assert.equal(isRecognized(state, "2026-09-11"), true); });
check("9/13 리커버리 1/3 → 미인정", () => assert.equal(isRecognized(state, "2026-09-13"), false));
check("9/15 사이드만 → 미인정(무행동)", () => assert.equal(isRecognized(state, "2026-09-15"), false));
check("9/12 러닝 Runday 완료 → 10 DMG", () => assert.equal(damageOf(state, "2026-09-12"), 10));
check("9/5 구버전 러닝일 → 인정 10 DMG", () => assert.equal(damageOf(state, "2026-09-05"), 10));

/* ---- 계산 결과 ---- */
const c = compute(state, TODAY);
check("LV.7 · EXP 205 / 220", () => { assert.equal(c.level, 7); assert.equal(c.levelRest, 205); assert.equal(c.levelNeed, 220); });
check("누적 EXP 1105", () => assert.equal(c.exp, 1105));
check("CAMP Lv.4", () => assert.equal(c.camp, 4));
check("캠프 상승 3회 · 하락 0회", () => {
  assert.equal(c.campHistory.filter(h => h.kind === "up").length, 3);
  assert.equal(c.campHistory.filter(h => h.kind === "down").length, 0);
});
check("이번 주 관성 HP 45 / 100", () => assert.equal(c.currentWeek.hp, 45));
check("이번 주 근력 2 / 3", () => assert.equal(c.currentWeek.str, 2));
check("지난 두 주 보스 처치 없음 (70·75 DMG)", () => {
  const done = c.weeks.filter(w => w.finished).map(w => w.damage);
  assert.deepEqual(done, [70, 75]);
  assert.equal(c.weeks.filter(w => w.killed).length, 0);
});
check("주간 근력 3회 달성률 0 / 2주", () => assert.deepEqual(c.strengthWeekRate, { hit: 0, of: 2 }));
check("최근 공백 1일 · 9/16 복귀", () => assert.deepEqual(c.lastGap, { days: 1, returnedOn: "2026-09-16" }));
check("복귀 보너스 없음 (공백 3일 미만)", () => assert.equal(c.campHistory.filter(h => h.kind === "comeback").length, 0));
check("9월 세션 근력 6/8 · 러닝 3/4 · 리커버리 4/5", () => assert.deepEqual(c.month, { STR: [6, 8], RUN: [3, 4], REC: [4, 5] }));
check("BONE FUEL 이번 주 단백질 4/7", () => assert.equal(c.fuelWeek["s:protein"], 4));
check("2분 퀘스트 0/3 · REST 0/1 남음", () => { assert.equal(c.twoLeft, 3); assert.equal(c.restLeft, 1); });
check("오늘 이벤트 DOUBLE EXP (날짜 seed 고정)", () => { assert.equal(c.event.key, "DOUBLE"); assert.equal(compute(state, TODAY).event.key, "DOUBLE"); });
check("체크포인트 D-day (12개월 = D-337)", () => assert.equal(c.checkpoints.at(-1).dday, 337));
check("WORLD 1지역 · 인정일 13/12(상한 100%) (Phase 2 계산)", () => { const w = worldProgress(state, TODAY); assert.equal(w.region, 1); assert.equal(w.recognized, 13); });

/* ---- 내보내기 / 불러오기 ---- */
const json = exportJSON(state, TODAY);
const back = parseBackup(json);
check("내보낸 파일을 다시 읽으면 같은 기록", () => { assert.equal(back.ok, true); assert.deepEqual(back.state.log, state.log); });
check("불러온 뒤 계산값 동일", () => assert.equal(compute(back.state, TODAY).exp, c.exp));
check("v1 파일도 불러오기 가능", () => { const r = parseBackup(JSON.stringify(v1)); assert.equal(r.ok, true); assert.equal(r.version, 1); });
check("깨진 파일은 이유와 함께 거부", () => { assert.equal(parseBackup("{oops").ok, false); assert.equal(parseBackup('{"a":1}').ok, false); });
check("미래 버전 백업 거부", () => assert.equal(parseBackup('{"schemaVersion":9,"log":{}}').ok, false));

/* ---- localStorage 경로 (v1만 있는 폰에서 첫 실행) ---- */
const fake = (() => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), get size() { return m.size; } }; })();
fake.setItem(KEY_V1, JSON.stringify(v1));
const first = load(fake, TODAY);
check("v1만 있으면 자동 변환하고 v2로 저장", () => { assert.equal(first.migrated, true); assert.ok(fake.getItem(KEY_V2)); });
check("두 번째 실행은 v2를 그대로 읽음", () => assert.equal(load(fake, TODAY).migrated, false));
check("변환 후에도 v1 키 보존 (되돌릴 수 있게)", () => assert.ok(fake.getItem(KEY_V1)));
check("체크포인트 기록 저장 구조", () => {
  const s = normalize({ log: {}, checkpoints: [{ date: "2026-12-02", muscleMass: 18.4, weight: 52.1, memo: "3개월" }] });
  save(s, fake);
  assert.deepEqual(load(fake, TODAY).state.checkpoints[0], { date: "2026-12-02", muscleMass: 18.4, bodyFat: null, weight: 52.1, bmd: null, memo: "3개월" });
});

/* ---- 4단계: 미리보기 이후 v1에서 계속 체크한 기록 합치기 ---- */
{
  const m = (() => { const x = new Map(); return { getItem: k => x.get(k) ?? null, setItem: (k, v) => x.set(k, String(v)) }; })();
  const v1a = structuredClone(v1);
  m.setItem(KEY_V1, JSON.stringify(v1a));
  load(m, TODAY);                                           // 미리보기로 2.0을 한 번 열어 v2가 생김
  const s2 = load(m, TODAY).state; s2.log["2026-09-20"] = ["preview-only"]; save(s2, m);   // 2.0에서 체크한 기록
  v1a.log["2026-09-19"] = [...(v1a.log["2026-09-19"] ?? []), "later-v1"];                   // 그 뒤 v1에서 계속 체크
  v1a.log["2026-09-21"] = ["m0-0"];
  m.setItem(KEY_V1, JSON.stringify(v1a));
  const r = load(m, TODAY);
  check("v2가 있어도 v1에 새로 체크한 기록을 합침", () => { assert.ok(r.merged >= 2); assert.ok(r.state.log["2026-09-19"].includes("later-v1")); assert.deepEqual(r.state.log["2026-09-21"], ["m0-0"]); });
  check("합칠 때 2.0에서 체크한 기록은 그대로", () => assert.deepEqual(r.state.log["2026-09-20"], ["preview-only"]));
  check("v1이 그대로면 다시 합치지 않음", () => assert.equal(load(m, TODAY).merged, 0));
  const s3 = load(m, TODAY).state; s3.log["2026-09-21"] = []; delete s3.log["2026-09-21"]; save(s3, m);
  check("2.0에서 지운 체크는 v1이 바뀌지 않는 한 되살아나지 않음", () => assert.equal(load(m, TODAY).state.log["2026-09-21"], undefined));
}

/* ---- Phase 2: WORLD · 체크포인트 ---- */
{
  const w = worldProgress(state, TODAY);
  check("지역 12개 · 이름 있음", () => { assert.equal(w.list.length, WORLD.regions); assert.equal(REGIONS.length, 12); assert.ok(w.name.length > 1); });
  check("현재 1지역 (9/2~10/1)", () => { assert.equal(w.region, 1); assert.equal(w.from, "2026-09-02"); assert.equal(w.to, "2026-10-01"); });
  check("진행률은 인정일로만 (13/12 → 100%, ★3)", () => { assert.equal(w.recognized, 13); assert.equal(w.percent, 100); assert.equal(w.stars, 3); });
  check("같은 지역인데 하루 지나도 진행률 그대로", () => assert.equal(regionProgress(state, 0, "2026-09-25").percent, w.percent));
  check("지역은 한 달마다 열림", () => { assert.equal(regionIndex("2026-10-01"), 0); assert.equal(regionIndex("2026-10-02"), 1); assert.equal(regionIndex("2027-08-21"), 11); });
  check("다음 지역 안내", () => { assert.equal(w.next.region, 2); assert.equal(w.next.from, "2026-10-02"); assert.equal(w.next.state, "future"); });
  check("12지역이 마지막 (그 뒤 날짜도 12지역)", () => { assert.equal(regionIndex("2028-01-01"), 11); assert.equal(worldProgress(state, "2027-09-30").next, null); });
  const later = regionProgress(state, 1, TODAY);
  check("아직 안 열린 지역은 0%", () => { assert.equal(later.recognized, 0); assert.equal(later.stars, 0); });
  check("별: 40%(5일)·70%(9일)·100%(12일) 기준", () => {
    const only = (n) => {
      const st = normalize({ log: {} });
      let filled = 0;
      for (let d = 2; d <= 30 && filled < n; d++) {
        const date = `2026-09-${String(d).padStart(2, "0")}`;
        const wd = new Date(2026, 8, d).getDay();
        const items = ROUTINE[wd].items.map((i) => i.id);                 // 그 요일 메인 전부 = 인정일
        st.log[date] = wd === 2 || wd === 6 ? [RUNDAY_ID] : items;        // 화·토는 러닝(Runday)
        filled++;
      }
      return regionProgress(st, 0, "2026-09-30").stars;
    };
    assert.equal(only(4), 0); assert.equal(only(5), 1); assert.equal(only(9), 2); assert.equal(only(12), 3);
  });

  const cp = normalize({ log: {}, checkpoints: [{ date: "2026-12-02", muscleMass: 18.4, bodyFat: 31.2, weight: 52.1, bmd: -1.6, memo: "3개월" }] });
  check("체크포인트 4개 항목 저장", () => { const r = cp.checkpoints[0]; assert.equal(r.muscleMass, 18.4); assert.equal(r.bodyFat, 31.2); assert.equal(r.bmd, -1.6); });
  check("체크포인트가 compute에 붙음", () => { const r = compute(cp, TODAY).checkpoints.find((x) => x.date === "2026-12-02"); assert.equal(r.record.bmd, -1.6); assert.equal(r.label, "3개월"); });
  check("빈 값은 null로 (0과 구분)", () => { const r = normalize({ log: {}, checkpoints: [{ date: "2026-12-02", muscleMass: "", weight: 0 }] }).checkpoints[0]; assert.equal(r.muscleMass, null); assert.equal(r.weight, 0); });
  check("체크포인트도 백업에 실림", () => { const back = parseBackup(exportJSON(cp, TODAY)); assert.equal(back.state.checkpoints[0].bmd, -1.6); });
  check("입력 항목 4종", () => assert.deepEqual(METRICS.map((m) => m.id), ["muscleMass", "bodyFat", "weight", "bmd"]));
}

/* ---- Phase 2: WORLD 해금 조건 ---- */
{
  const mkWeeks = (weeks, perWeek) => {                    // 2026-09-14(월)부터 주마다 perWeek일씩 인정
    const st = normalize({ log: {} });
    st.flags.eventsFrom = "2026-09-18";
    for (let w = 0; w < weeks; w++) for (let i = 0; i < perWeek; i++) {
      const d = new Date(2026, 8, 14 + w * 7 + i);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      st.log[date] = d.getDay() === 2 || d.getDay() === 6 ? [RUNDAY_ID] : ROUTINE[d.getDay()].items.map((x) => x.id);
    }
    return st;
  };
  const last = (weeks) => { const d = new Date(2026, 8, 14 + (weeks - 1) * 7 + 6); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  check("2.0 쓴 지 2주면 아직 안 열림", () => assert.equal(worldUnlock(mkWeeks(2, 5), last(2)).unlocked, false));
  check("4주 됐어도 인정 3일 주가 2주면 안 열림", () => {
    const st = mkWeeks(4, 3); for (const d of Object.keys(st.log)) if (d >= "2026-09-28") delete st.log[d];
    const u = worldUnlock(st, last(4));
    assert.equal(u.weeksUsed, 4); assert.equal(u.campWeeks, 2); assert.equal(u.unlocked, false);
  });
  check("4주 + 인정 3일 주 3주면 열림", () => {
    const u = worldUnlock(mkWeeks(4, 3), last(4));
    assert.equal(u.campWeeks >= WORLD_UNLOCK.campWeeks, true); assert.equal(u.unlocked, true); assert.equal(u.justNow, true);
  });
  check("한 번 열리면 기록이 줄어도 닫히지 않음", () => {
    const st = mkWeeks(2, 1); st.flags.worldUnlockedOn = "2026-10-12";
    const u = worldUnlock(st, last(2));
    assert.equal(u.unlocked, true); assert.equal(u.justNow, false); assert.equal(u.since, "2026-10-12");
  });
  check("해금 여부가 compute에 붙음", () => assert.equal(typeof compute(state, TODAY).worldUnlock.unlocked, "boolean"));
  check("지금 기록(9/18)으로는 아직 잠김", () => assert.equal(compute(state, TODAY).worldUnlock.unlocked, false));
  check("해금 날짜는 백업에 실림", () => {
    const st = normalize({ log: {}, flags: { worldUnlockedOn: "2026-10-12" } });
    assert.equal(parseBackup(exportJSON(st, TODAY)).state.flags.worldUnlockedOn, "2026-10-12");
  });
}

/* ---- 결과 ---- */
const failed = results.filter(([s]) => s !== "ok");
for (const [s, name] of results) console.log(`${s === "ok" ? "  ✓" : "  ✗"} ${name}`);
console.log(`\n${results.length - failed.length} / ${results.length} 통과`);
if (failed.length) process.exit(1);

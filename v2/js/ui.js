/* Bone Quest 2.0 — 화면 (2단계: HOME / BOSS / LOG + 퀘스트 상세)
   규칙 계산은 rules.js, 저장은 storage.js. 이 파일은 그린다. */

import {
  ROUTINE, FUEL, TWO_MIN, STATS, TYPE_NAME, DMG, BOSS_HP, EXP,
  TWO_MIN_PER_WEEK, REST_PER_WEEK, RUNDAY_ID, START,
} from "./data.js";
import {
  compute, todayISO, dow, addDays, mondayOf, sessionType, isRecognized, isSide,
  mainsOf, mainCount, halfCount, logOf, expOfItem, eventOf, eventsActiveOn, isDayCleared, parseDate, toISO,
} from "./rules.js";
import { load, save, exportJSON, backupFileName, parseBackup } from "./storage.js";

const DAY = ["일", "월", "화", "수", "목", "금", "토"];
const ICON = (name) => `./assets/icons/${name}.png`;
const TYPE_ICON = { STR: "strength", RUN: "run", REC: "recovery" };
const CHECK = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 5"/></svg>';
const md = (iso) => `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let state = load().state;
let today = todayISO();
let tab = "home";
let calMonth = today.slice(0, 7);

const $ = (id) => document.getElementById(id);
const persist = () => { state.savedAt = today; save(state); };

/* ---------- HOME ---------- */
function renderHome(c) {
  const w = dow(today);
  const routine = ROUTINE[w];
  const type = sessionType(today);
  const done = mainsOf(state, today).length;
  const need = halfCount(state, today);
  const ok = isRecognized(state, today);
  const resting = !!state.rest[today];
  const firstSide = logOf(state, today).find(isSide);

  $("hello").textContent = resting ? "오늘은 회복의 날입니다." : "오늘도, 한 걸음 더.";

  const status = type === "RUN"
    ? (ok ? `<span class="ok">✓ 러닝 세션 인정</span>` : `<span class="sub">Runday 완료 시 러닝 세션 인정</span>`)
    : (ok ? `<span class="ok">✓ 세션 인정</span>` : `<span class="sub">세션 인정까지 <b class="num">${need - done}</b>개 남음</span>`);
  const rule = type === "RUN" ? "Runday 완료 시 러닝 세션 인정" : `메인 동작 50% 이상(${need}개) 완료 시 1회 인정`;

  const quest = `<section class="card quest">
    <div class="sec"><img src="${ICON("quest")}" alt="">TODAY'S QUEST<span class="r">${DAY[w]}요일 · ${TYPE_NAME[type]}</span></div>
    <div class="top">
      <div class="qicon"><img src="${ICON(TYPE_ICON[type])}" alt=""></div>
      <div><h3>${esc(routine.kind)}</h3><div class="sub">${esc(routine.why)}</div></div>
      <span class="cnt num">${done} / ${routine.items.length}</span>
    </div>
    <div class="foot">${status}<button class="btn" type="button" data-open="detail">시작하기 ›</button></div>
    <div class="rulenote">※ ${rule}</div>
  </section>`;

  const twoDone = !!state.two[today];
  const twoUsable = !resting && (twoDone || c.twoLeft > 0);
  const restUsable = !resting && c.restLeft > 0 && done === 0 && !twoDone;
  const pair = `<div class="pair">
    <div class="card mini">
      <div class="h"><img src="${ICON("two-min")}" alt="">2분 퀘스트</div>
      <div class="w">이번 주 <span class="num">${c.twoWeek} / ${TWO_MIN_PER_WEEK}</span></div>
      <div class="sub">목·어깨 스트레칭</div>
      <button class="btn" type="button" data-open="two" ${twoUsable ? "" : "disabled"}>${twoDone ? "완료 ✓" : "시작하기"}</button>
    </div>
    <div class="card mini">
      <div class="h"><img src="${ICON("rest")}" alt="">REST</div>
      <div class="w">이번 주 <span class="num">${c.restWeek} / ${REST_PER_WEEK}</span></div>
      <div class="sub">${restUsable ? "오늘은 쉴 수 있어요." : resting ? "오늘 사용 중" : "오늘은 사용할 수 없어요."}</div>
      <button class="btn" type="button" data-act="rest" ${restUsable ? "" : "disabled"}>사용하기</button>
    </div>
  </div>`;

  const fuel = `<section class="card">
    <div class="sec"><img src="${ICON("bone-fuel")}" alt="">BONE FUEL<span class="r">하루 1회 체크</span></div>
    <div style="margin-top:4px">${FUEL.map((f) => {
      const on = logOf(state, today).includes(f.id);
      const x = expOfItem(state, today, f.id, firstSide);
      return `<button class="row-item" type="button" data-toggle="${f.id}" aria-pressed="${on}">
        <span class="cb">${CHECK}</span><img src="${ICON(f.icon)}" alt=""><span class="nm">${esc(f.name)}</span>
        <span class="x ${x > EXP.side ? "up" : ""}">+${x}</span><span class="wk num">${c.fuelWeek[f.id]} / 7</span></button>`;
    }).join("")}</div>
  </section>`;

  const lvcamp = `<div class="lvcamp">
    <div class="card lv">
      <div class="r1"><img src="${ICON("camp")}" alt=""><b>LV. ${c.level}</b></div>
      <div class="bar"><i style="width:${(c.levelRest / c.levelNeed) * 100}%"></i></div>
      <span class="xp num">EXP ${c.levelRest} / ${c.levelNeed}</span>
    </div>
    <div class="card camp"><img src="./assets/campfire.png" alt="">
      <div><span class="k">CAMP</span><b>Lv. ${c.camp}</b></div></div>
  </div>`;

  const event = c.event ? `<div class="event">
    <img class="evbg" src="./assets/bg-event.png" alt="">
    <div class="in"><span class="tagx"><img src="${ICON("event")}" alt="">TODAY'S EVENT</span>
      <b>${c.event.name}</b><span class="e">${esc(c.event.desc)}</span></div>
  </div>` : "";

  const week = c.currentWeek;
  const bossCard = `<button class="bosscard" type="button" data-tab="boss">
    <div class="av"><img src="./assets/${week.hp ? "inertia" : "inertia-defeated"}.png" alt=""></div>
    <div class="m"><span class="k">WEEKLY BOSS</span>
      <div class="r1"><b>관성</b><span class="hp num">HP ${week.hp} / ${BOSS_HP}</span></div>
      <div class="bar ember"><i style="width:${(week.hp / BOSS_HP) * 100}%"></i></div>
      <span class="s">근력 세션 <b class="num">${week.str} / 3</b></span></div>
  </button>`;

  const restBlock = `<div class="restday">
    <div class="h"><img src="${ICON("rest")}" alt="">REST DAY</div>
    <div>오늘은 회복의 날입니다.<br>잠시 쉬어도 괜찮습니다.</div>
    <div class="chips"><span><img src="${ICON("camp")}" alt="">CAMP 유지</span><span>REST ${c.restWeek} / ${REST_PER_WEEK}</span></div>
    <button class="btn ghost" type="button" data-act="unrest">REST 취소하기</button>
    <div style="font-size:11.5px">운동을 체크하면 자동으로 취소되고 사용권이 돌아옵니다.</div>
  </div>`;

  $("homeBody").innerHTML = resting
    ? `${restBlock}${fuel}${lvcamp}<div class="quiet">관성 HP ${week.hp} / ${BOSS_HP} · 오늘 보스 공격 없음</div>`
    : `${quest}${pair}${fuel}${lvcamp}${event}${bossCard}`;
}

/* ---------- 퀘스트 상세 ---------- */
function renderDetail(c, kind) {
  if (kind === "two") {
    const twoDone = !!state.two[today];
    $("detail").innerHTML = `
      <div class="apphead"><button class="back" type="button" data-open="close" aria-label="뒤로">‹</button>
        <div><h2>2 MIN RESET</h2><p>하기 싫은 날의 최소 행동</p></div></div>
      <section class="card"><div class="sec"><img src="${ICON("two-min")}" alt="">${esc(TWO_MIN.desc)}</div>
        <div style="margin-top:10px;font-size:13px;line-height:1.9">
          이번 주 <b class="num">${c.twoWeek} / ${TWO_MIN_PER_WEEK}</b><br>
          +${EXP.twoMin} EXP · CAMP 유지<br>보스 DMG 0 · 인정일 아님</div></section>
      <section class="card bone" style="font-size:12.5px">운동을 대신하는 퀘스트가 아니라, 오늘을 완전히 놓치지 않게 하는 장치예요.</section>
      <button class="btn block" type="button" data-act="two" ${twoDone || c.twoLeft === 0 ? "disabled" : ""}>${twoDone ? "오늘 완료 ✓" : "2분 완료"}</button>`;
    return;
  }
  const w = dow(today);
  const routine = ROUTINE[w];
  const type = sessionType(today);
  const done = mainsOf(state, today).length;
  const need = halfCount(state, today);
  const ok = isRecognized(state, today);
  const firstSide = logOf(state, today).find(isSide);
  const rows = routine.items.map((it) => {
    const on = logOf(state, today).includes(it.id);
    const x = expOfItem(state, today, it.id, firstSide);
    return `<button class="q" type="button" data-toggle="${it.id}" aria-pressed="${on}">
      <span class="cb">${CHECK}</span>
      <span><span class="t">${esc(it.name)}${it.id === RUNDAY_ID ? '<span class="must">세션 인정</span>' : ""}</span>
      ${it.desc ? `<span class="d">${esc(it.desc)}</span>` : ""}</span>
      <span class="x ${x > EXP.main ? "up" : ""}">+${x}</span></button>`;
  }).join("");

  $("detail").innerHTML = `
    <div class="apphead"><button class="back" type="button" data-open="close" aria-label="뒤로">‹</button>
      <div><h2>${esc(routine.kind)}</h2><p>${TYPE_NAME[type]} 메인 퀘스트</p></div></div>
    <section class="card">
      <div class="state"><span class="sub">완료</span><b class="num">${done} / ${routine.items.length}</b></div>
      <div class="bar" style="margin:8px 0"><i style="width:${(done / routine.items.length) * 100}%"></i></div>
      ${type === "RUN"
        ? (ok ? `<span class="ok" style="color:var(--moss-2);font-weight:700">✓ 러닝 세션 인정</span>` : `<span class="sub">Runday를 완료하면 인정됩니다</span>`)
        : (ok ? `<span class="ok" style="color:var(--moss-2);font-weight:700">✓ 세션 인정</span>` : `<span class="sub">세션 인정까지 <b class="num">${need - done}</b>개 남음</span>`)}
      <div class="rulenote">※ ${type === "RUN" ? "Runday 완료 시 러닝 세션 인정 · 워밍업·쿨다운은 보조" : `메인 동작 50% 이상(${need}개) 완료 시 1회 인정`}</div>
      ${isDayCleared(state, today) ? `<div class="rulenote">오늘 루틴 완주 · +${EXP.dayClear} EXP</div>` : ""}
    </section>
    <section class="card">${rows}</section>
    <section class="card bone" style="font-size:12.5px">세션 인정 시 관성에게 <b class="num">−${DMG[type]}</b> DMG · 이벤트 배수는 EXP에만 적용</section>
    <button class="btn block" type="button" data-open="close">완료</button>`;
}

/* ---------- BOSS ---------- */
function renderBoss(c) {
  const week = c.currentWeek;
  const attacks = [
    ["strength", "근력 세션", "메인 50%+", DMG.STR],
    ["run", "러닝 세션", "Runday 완료", DMG.RUN],
    ["recovery", "리커버리 / 스트레칭", "메인 50%+", DMG.REC],
  ];
  const recent = [];
  for (const wk of [...c.weeks].reverse())
    for (const d of [...wk.days].reverse())
      if (d.damage) recent.push({ date: d.date, damage: d.damage, type: sessionType(d.date) });

  const past = c.weeks.filter((w) => w.finished).reverse()
    .map((w) => `<div class="wkrow"><span>${md(w.monday)}–${md(addDays(w.monday, 6))} · <b>${w.damage} DMG</b></span><b>${w.killed ? "처치" : "관성이 도망갔다"}</b></div>`).join("");

  $("boss").innerHTML = `
    <div class="bossstage"><img class="bg" src="./assets/bg-boss.png" alt=""><div class="fade"></div></div>
    <div class="apphead">
      <div class="badge"><img src="${ICON("tab-boss")}" alt=""></div>
      <div><div class="k">WEEKLY BOSS · ${md(week.monday)}–${md(addDays(week.monday, 6))}</div>
        <h2>관성</h2><p>“오늘만 쉬면 되잖아.”</p></div>
      <button class="iconbtn sp" type="button" id="bossHelp" aria-label="규칙">?</button>
    </div>
    <div class="hpbar"><i style="width:${(week.hp / BOSS_HP) * 100}%"></i><span>HP ${week.hp} / ${BOSS_HP}</span></div>
    <div class="arena">
      <img class="foe" src="./assets/${week.hp ? "inertia" : "inertia-defeated"}.png" alt="관성">
      ${week.hp ? "" : `<span class="ko">DEFEATED · +${EXP.bossKill} EXP</span>`}
    </div>
    <section class="card"><div class="sec"><img src="${ICON("quest")}" alt="">공격 패턴</div>
      ${attacks.map(([ic, nm, cond, dmg]) => `<div class="atk"><img src="${ICON(ic)}" alt="">
        <span>${nm} <span class="c">${cond}</span></span><span class="v">−${dmg} DMG</span></div>`).join("")}
    </section>
    <section class="card goal"><div class="sec"><img src="${ICON("flag")}" alt="">이번 주 목표</div>
      <div class="r1"><span style="font-weight:600">근력 세션</span><b class="num">${week.str} / 3</b></div>
      <div class="bar"><i style="width:${Math.min(100, (week.str / 3) * 100)}%"></i></div>
      <div class="week">${week.days.map((d) => `<div class="${d.damage ? "hit" : ""} ${d.date === today ? "now" : ""}">${DAY[dow(d.date)]}
        <small>${d.future ? "·" : d.rest ? "R" : d.damage ? "−" + d.damage : "0"}</small></div>`).join("")}</div>
    </section>
    <section class="card"><div class="sec"><img src="${ICON("quest")}" alt="">전투 기록</div>
      <div class="blog">${recent.slice(0, 5).map((r) => `<span class="d">${md(r.date)}</span>
        <span>${TYPE_NAME[r.type]} 세션으로 관성을 공격</span><span class="v">−${r.damage}</span>`).join("") || `<span></span><span class="sub">아직 기록이 없습니다</span><span></span>`}</div>
      ${past}
    </section>
    <section class="card prophecy"><div class="bk"><img src="./assets/bone-king.png" alt="골왕"></div>
      <div><div class="k">THE PROPHECY</div><b>골왕의 예언서</b>
        <p>1년 뒤, 봉인된 골왕이 깨어난다. · ${c.checkpoints.at(-1).date}</p>
        <button class="btn dark" type="button" id="prophecyBtn">이야기 보기</button></div>
    </section>`;
}

/* ---------- LOG ---------- */
function renderLog(c) {
  const [y, m] = calMonth.split("-").map(Number);
  const first = `${calMonth}-01`;
  const lead = (dow(first) + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(`<div class="d"></div>`);
  for (let k = 1; k <= daysInMonth; k++) {
    const date = `${calMonth}-${String(k).padStart(2, "0")}`;
    let cls = "";
    if (date < START) cls = "pre";
    else if (date > today) cls = "future";
    else if (state.rest[date]) cls = "rest";
    else if (isRecognized(state, date)) cls = sessionType(date) === "REC" ? "rec" : "work";
    else if (state.two[date]) cls = "rec";
    else if (date === today) cls = "today";
    else cls = "idle";
    if (date === today && cls !== "today") cls += " today";
    cells.push(`<div class="d ${cls}"><span>${k}</span></div>`);
  }

  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const sums = [
    ["strength", "근력", c.month.STR], ["run", "러닝", c.month.RUN],
    ["recovery", "리커버리", c.month.REC], ["protein", "단백질", [c.protein, c.monthDays]],
  ];
  const rate = c.strengthWeekRate.of ? c.strengthWeekRate.hit / c.strengthWeekRate.of : 0;
  const circ = 2 * Math.PI * 27;
  const camp = c.campHistory.filter((h) => h.kind !== "rest").slice(-3).reverse();

  $("log").innerHTML = `
    <div class="apphead"><img src="${ICON("tab-log")}" alt="">
      <div><h2>LOG</h2><p>내가 걸어온 여정</p></div>
      <button class="iconbtn sp" type="button" id="todayBtn" aria-label="이번 달로"><img src="${ICON("calendar")}" alt=""></button></div>

    <section class="card">
      <div class="monthnav"><button type="button" data-month="-1" aria-label="이전 달">‹</button>
        <span>${y}년 ${m}월</span>
        <button type="button" data-month="1" aria-label="다음 달" ${calMonth >= today.slice(0, 7) ? "disabled" : ""}>›</button></div>
      <div class="cal">${["월","화","수","목","금","토","일"].map((d) => `<div class="h">${d}</div>`).join("")}${cells.join("")}</div>
      <div class="legend">
        <span><i style="background:var(--moss)"></i>운동</span>
        <span><i style="background:var(--bone);box-shadow:inset 0 0 0 2px var(--moss)"></i>리커버리</span>
        <span><i style="background:var(--blue)"></i>REST</span>
        <span><i style="box-shadow:inset 0 0 0 2px var(--ember)"></i>무행동</span></div>
    </section>

    <section class="card"><div class="sec"><img src="${ICON("quest")}" alt="">${+today.slice(5, 7)}월 활동 요약<span class="r">인정 / 예정일</span></div>
      ${sums.map(([ic, nm, [a, b]]) => `<div class="sum"><img src="${ICON(ic)}" alt=""><span>${nm}</span>
        <div class="bar"><i style="width:${pct(a, b)}%"></i></div><span class="n">${a} / ${b}</span></div>`).join("")}
    </section>

    <div class="kpis">
      <div class="card kpi"><span class="t">주간 근력 3회 달성률</span>
        <svg class="ring" viewBox="0 0 70 70" aria-hidden="true">
          <circle cx="35" cy="35" r="27" fill="none" stroke="#D9D3C1" stroke-width="7"/>
          <circle cx="35" cy="35" r="27" fill="none" stroke="#667052" stroke-width="7"
            stroke-dasharray="${circ * rate} ${circ}" transform="rotate(-90 35 35)"/>
          <text x="35" y="40" text-anchor="middle" font-size="14" font-weight="800" fill="#272622">${Math.round(rate * 100)}%</text>
        </svg>
        <span class="s"><b class="num" style="font-size:13px">${c.strengthWeekRate.hit} / ${c.strengthWeekRate.of}주</b><br>이번 주 근력 세션 ${c.currentWeek.str}/3</span></div>
      <div class="card kpi"><span class="t">공백 후 복귀 일수</span>
        <img src="${ICON("calendar")}" alt="">
        <b>${c.lastGap ? c.lastGap.days + "일" : "—"}</b>
        <span class="s">${c.lastGap ? `최근 ${md(c.lastGap.returnedOn)} 복귀` : "공백 없음"}</span></div>
    </div>

    <section class="card"><div class="sec"><img src="${ICON("camp")}" alt="">CAMP 변화<span class="r">현재 Lv. ${c.camp}</span></div>
      <div class="camprow">${camp.map((h) => `<span class="d">${md(h.date)}</span><span>${esc(h.text)}</span>
        <img src="${ICON(h.kind === "down" ? "rest" : "camp")}" alt=""></span>`).join("") || `<span></span><span class="sub">아직 변화가 없습니다</span><span></span>`}</div>
    </section>

    <section class="card"><div class="sec"><img src="${ICON("flag")}" alt="">체크포인트</div>
      <div class="cps">${c.checkpoints.map((cp, i) => `<div class="${i === c.checkpoints.length - 1 ? "fin" : ""}">
        <span class="k">${cp.label}</span><span class="dt num">${cp.date.replaceAll("-", ".")}</span>
        <span class="s">${cp.dday > 0 ? `D-${cp.dday}` : cp.note}</span></div>`).join("")}</div>
    </section>

    <section class="card"><div class="sec">MY STATUS<span class="r">완료 항목 수</span></div>
      <div class="stats">${Object.entries(STATS).map(([k, s]) => `<div class="stat">
        <img src="${ICON(s.icon)}" alt=""><span class="p num">${c.stats[k]}p</span><span class="k">${s.label}</span></div>`).join("")}</div>
    </section>

    <section class="card backup"><img src="${ICON("backup")}" alt="">
      <div><b>백업하기</b><span class="sub">기록은 이 폰에만 저장됩니다</span></div>
      <button class="btn" type="button" id="exportBtn">내보내기</button>
    </section>
    <div class="msg sub" id="backupMsg" hidden></div>`;
}

/* ---------- 그리기 / 이동 ---------- */
let detailKind = null;
function render() {
  today = todayISO();
  const c = compute(state, today);
  window.__bq = { state, c };                       // 디버그용
  renderHome(c);
  renderBoss(c);
  renderLog(c);
  if (detailKind) renderDetail(c, detailKind);

  for (const id of ["home", "boss", "log", "detail"]) $(id).hidden = detailKind ? id !== "detail" : id !== tab;
  for (const b of document.querySelectorAll(".tabs button")) b.setAttribute("aria-current", String(b.dataset.tab === tab));
}

function go(next) { tab = next; detailKind = null; window.scrollTo({ top: 0 }); render(); }

/* ---------- 입력 ---------- */
document.addEventListener("click", (e) => {
  const toggle = e.target.closest("[data-toggle]");
  if (toggle) {
    const id = toggle.dataset.toggle;
    const list = state.log[today] ? [...state.log[today]] : [];
    const i = list.indexOf(id);
    if (i > -1) list.splice(i, 1);
    else {
      list.push(id);
      if (!isSide(id) && state.rest[today]) delete state.rest[today];   // REST 자동 취소 + 사용권 복구
    }
    if (list.length) state.log[today] = list; else delete state.log[today];
    persist(); render();
    return;
  }
  const open = e.target.closest("[data-open]")?.dataset.open;
  if (open) { detailKind = open === "close" ? null : open; window.scrollTo({ top: 0 }); render(); return; }

  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "rest") { state.rest[today] = true; persist(); render(); return; }
  if (act === "unrest") { delete state.rest[today]; persist(); render(); return; }
  if (act === "two") { state.two[today] = true; detailKind = null; persist(); render(); return; }

  const tabBtn = e.target.closest("[data-tab]")?.dataset.tab;
  if (tabBtn) { go(tabBtn); return; }

  const month = e.target.closest("[data-month]")?.dataset.month;
  if (month) {
    const d = parseDate(`${calMonth}-01`);
    d.setMonth(d.getMonth() + Number(month));
    const next = toISO(d).slice(0, 7);
    if (next <= today.slice(0, 7) && next >= START.slice(0, 7)) { calMonth = next; render(); }
    return;
  }
  if (e.target.closest("#todayBtn")) { calMonth = today.slice(0, 7); render(); return; }

  if (e.target.closest("#exportBtn")) { exportBackup(); return; }
});

/* ---------- 백업 내보내기 (3단계에서 불러오기·알림 추가) ---------- */
function exportBackup() {
  const msg = $("backupMsg");
  try {
    const blob = new Blob([exportJSON(state, today)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = backupFileName(today);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    msg.hidden = false;
    msg.textContent = `${backupFileName(today)} 파일을 내려받았습니다.`;
  } catch {
    msg.hidden = false;
    msg.textContent = "이 브라우저에서는 파일 저장이 막혀 있습니다.";
  }
}

/* 날짜가 넘어가면 다시 그린다 (자정에 앱을 켜 둔 경우) */
setInterval(() => { if (todayISO() !== today) { calMonth = todayISO().slice(0, 7); render(); } }, 60_000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && todayISO() !== today) render(); });

render();
export { state, render, parseBackup };

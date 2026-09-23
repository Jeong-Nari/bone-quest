/* Bone Quest 2.0 — 고정 데이터 (루틴 / 사이드 퀘스트 / 수치)
   규칙 원본: docs/bone-quest-core-rules.md */

export const START = "2026-09-02";          // 프로젝트 시작일
export const LAUNCH_WEEK = "2026-09-14";    // 2.0 규칙 적용 주(월요일). 보스 처치 EXP는 이 주부터
export const EXAM = "2027-08-21";           // 골밀도 재검사 = 최종 보스전

export const CHECKPOINTS = [
  { key: "start", label: "시작",   date: START,        note: "출발 기록 (검진 결과)" },
  { key: "m3",    label: "3개월",  date: "2026-12-02", note: "인바디 측정" },
  { key: "m6",    label: "6개월",  date: "2027-03-02", note: "인바디 측정" },
  { key: "m12",   label: "12개월", date: EXAM,         note: "골밀도 재검사" },
];

/* 요일별 세션 종류: 0=일 … 6=토 */
export const TYPE = { 1: "STR", 2: "RUN", 3: "STR", 4: "REC", 5: "STR", 6: "RUN", 0: "REC" };
export const TYPE_NAME = { STR: "근력", RUN: "러닝", REC: "리커버리" };
export const DMG = { STR: 25, RUN: 10, REC: 5 };
export const BOSS_HP = 100;

export const EXP = {
  main: 10,          // 메인 퀘스트 1개
  side: 5,           // 사이드 퀘스트(BONE FUEL) 1개
  dayClear: 20,      // 하루 전체 루틴 완주
  twoMin: 5,         // 2분 퀘스트
  bossKill: 100,     // 주간 보스 처치
  comeback: 20,      // 공백 3일 이상 뒤 첫 인정일
};
export const levelNeed = (lv) => 100 + (lv - 1) * 20;

export const CAMP = {
  weekDaysForRise: 3,   // 주간 인정일 3일 → +1 (주 최대 +1)
  inactiveForDrop: 3,   // 무행동 3일 연속 → −1
  minLevel: 1,
  comebackGap: 3,       // 공백 3일 이상 뒤 복귀 보너스
};
export const TWO_MIN_PER_WEEK = 3;
export const REST_PER_WEEK = 1;

/* 러닝 세션은 Runday 완료로만 인정 */
export const RUNDAY_ID = "runday";

/* 구버전(m{요일}-{n}) 기록의 메인 퀘스트 개수 — 수·목이 5개였던 시기 */
export const LEGACY_MAIN_COUNT = { 3: 5, 4: 5 };

export const ROUTINE = {
  0: { kind: "리커버리", why: "쉬는 것도 루틴", items: [
    { id: "foam-roll",    name: "폼롤러 마사지 3~5분",  stat: "flex", desc: "다리 → 등 순서. 왼쪽을 2배 오래" },
    { id: "rec-stretch",  name: "전신 스트레칭 10분",   stat: "flex", desc: "목·가슴·허벅지 뒤·종아리 순서로" },
    { id: "rec-walk",     name: "산책 20분",            stat: "sta",  desc: "밖에서 걸으면 햇빛도 같이" },
  ]},
  1: { kind: "하체 기둥", why: "대퇴골 공략", items: [
    { id: "cat-cow",           name: "캣카우 + 힙 서클 2분",     stat: "flex", desc: "굳은 골반부터 풀고 시작" },
    { id: "chair-squat",       name: "의자 스쿼트 12회 × 3",     stat: "str",  desc: "무릎이 안쪽으로 모이지 않게" },
    { id: "hip-bridge",        name: "힙 브릿지 15회 × 3",       stat: "str",  desc: "엉덩이로 밀어 올리기. 허리로 젖히지 않기" },
    { id: "split-squat",       name: "스플릿 스쿼트 8회씩 × 2",  stat: "str",  desc: "왼쪽 먼저 · 왼쪽만 1세트 더. 불편하면 반만" },
    { id: "calf-raise",        name: "카프 레이즈 20회 × 2",     stat: "bone", desc: "천천히 올리고 뒤꿈치는 툭 떨어뜨리기" },
    { id: "hipflexor-stretch", name: "힙 플렉서 스트레칭 30초씩", stat: "flex", desc: "골반 앞쪽 단축 풀기" },
  ]},
  2: { kind: "러닝 데이", why: "런데이 앱", items: [
    { id: "run-warmup",  name: "발목·고관절 워밍업 3분",     stat: "flex", desc: "발목 돌리기 · 다리 앞뒤 스윙" },
    { id: RUNDAY_ID,     name: "런데이 세션",                stat: "sta",  desc: "오늘 회차 그대로. 통증 오면 걷기로 전환" },
    { id: "run-stretch", name: "종아리·햄스트링 스트레칭 5분", stat: "flex", desc: "러닝 직후가 제일 잘 늘어남" },
  ]},
  3: { kind: "상체 & 어깨 정렬", why: "라운드 숄더 교정", items: [
    { id: "tspine-towel",     name: "수건 흉추 신전 2분",        stat: "flex", desc: "수건을 말아 날개뼈 높이에 대고 가슴 열기" },
    { id: "wall-slide",       name: "벽 슬라이드 10회 × 2",      stat: "flex", desc: "왼팔이 벽에서 뜨는 지점까지만" },
    { id: "towel-row",        name: "고무밴드 로우 12회 × 3",    stat: "str",  desc: "견갑골을 먼저 모은 뒤 팔꿈치를 뒤로" },
    { id: "towel-pullapart",  name: "고무밴드 풀 어파트 15회 × 2", stat: "str", desc: "굽은 어깨를 뒤로 여는 동작" },
    { id: "incline-pushup",   name: "인클라인 푸시업 10회 × 2",  stat: "str",  desc: "식탁이나 벽을 짚고. 팔꿈치는 45도" },
    { id: "superman",         name: "슈퍼맨 10회 × 2",           stat: "bone", desc: "허리를 굽히지 않고 펴는 동작" },
  ]},
  4: { kind: "모빌리티 & 정렬", why: "골반·무릎 + 코어", items: [
    { id: "hip-9090",       name: "90/90 힙 스트레칭 1분씩",        stat: "flex", desc: "왼쪽부터 · 왼쪽은 2배 오래" },
    { id: "openbook",       name: "오픈북 10회씩",                  stat: "flex", desc: "왼쪽부터 · 왼쪽은 2배 오래" },
    { id: "clamshell",      name: "클램쉘 + 고무밴드 15회씩 × 2",   stat: "str",  desc: "끝에서 2초 정지 · 왼쪽만 1세트 더" },
    { id: "side-abduction", name: "사이드라잉 힙 어브덕션 12회씩 × 2", stat: "str", desc: "골반이 뒤로 눕지 않게" },
    { id: "calf-ankle",     name: "종아리·발목 스트레칭 1분씩",     stat: "flex", desc: "왼쪽은 2배 오래" },
    { id: "deadbug",        name: "데드버그 10회씩 × 2",            stat: "str",  desc: "허리를 바닥에 붙인 채로" },
  ]},
  5: { kind: "임팩트 데이", why: "뼈에 직접 신호", items: [
    { id: "heel-drop",  name: "힐 드롭 10회 × 2",                  stat: "bone", desc: "발끝으로 섰다가 뒤꿈치 쿵" },
    { id: "step-touch", name: "스텝 터치 3분",                     stat: "sta",  desc: "음악 한 곡 틀고 좌우로" },
    { id: "mini-hop",   name: "제자리 통통 뛰기 10회 × 2",         stat: "bone", desc: "2~3cm만 낮게. 무릎 불편하면 힐 드롭으로 대체" },
    { id: "rdl-bag",    name: "루마니안 데드리프트 12회 × 3",      stat: "str",  desc: "엉덩이를 뒤로 빼며 등은 곧게" },
    { id: "wall-sit",   name: "월 시트 20~30초 × 2",               stat: "str",  desc: "무릎은 90도까지만" },
  ]},
};
ROUTINE[6] = { kind: "러닝 데이", why: "런데이 앱", items: ROUTINE[2].items };

/* BONE FUEL = 사이드 퀘스트 4개, 하루 1회 체크 */
export const FUEL = [
  { id: "s:protein",  name: "단백질 3번",     stat: "nut",  icon: "protein",  desc: "그릭요거트 · 두부김치 · 후무스 · 닭가슴살 · 생선" },
  { id: "s:calcium",  name: "칼슘 + 비타민D", stat: "bone", icon: "calcium",  desc: "우유나 요거트 1회 + 햇빛 15분(또는 보충제)" },
  { id: "s:water",    name: "물 6잔",         stat: "nut",  icon: "water",    desc: "텀블러 한 번 채울 때마다 2잔" },
  { id: "s:nosugar",  name: "가당 음료 0잔",  stat: "nut",  icon: "nosugar",  desc: "당화혈색소를 되돌리는 가장 빠른 한 칸" },
];

export const TWO_MIN = { id: "two-min", name: "2 MIN RESET", desc: "목·어깨 + 가벼운 전신 스트레칭 2분" };

export const STATS = {
  bone: { label: "골밀도", icon: "calcium" },
  str:  { label: "근력",   icon: "strength" },
  flex: { label: "유연성", icon: "recovery" },
  sta:  { label: "지구력", icon: "run" },
  nut:  { label: "영양",   icon: "protein" },
};

/* 이벤트: 하루 최대 1개, 날짜 seed로 고정, EXP에만 적용 */
export const EVENTS = {
  DOUBLE:  { name: "DOUBLE EXP",    desc: "오늘 완료한 메인·사이드 퀘스트 EXP ×2" },
  RUN:     { name: "RUN DAY",       desc: "Runday EXP ×1.5 (10 → 15)" },
  STRETCH: { name: "STRETCH BONUS", desc: "유연성 메인 퀘스트 +5 EXP (10 → 15)" },
  FUEL:    { name: "BONE FUEL DAY", desc: "오늘 처음 체크한 BONE FUEL 1개 EXP ×2" },
};

/* WORLD 해금 조건: 2.0을 쓰기 시작한 뒤 4주 이상 + 그중 인정일 3일 이상인 주가 3주 */
export const WORLD_UNLOCK = { weeksUsed: 4, campWeeks: 3, recognizedPerWeek: 3 };

/* WORLD (Phase 2) — 지역은 START(2026-09-02)부터 한 달에 하나씩 열린다 */
export const WORLD = { daysPerRegion: 1, recognizedPerRegion: 12, bossPerRegion: 4, regions: 12 };

export const REGIONS = [
  { name: "첫걸음의 들판",   desc: "2년을 쉰 몸이 처음 다시 움직이는 곳." },
  { name: "무른 뼈의 숲",     desc: "발뒤꿈치가 땅을 두드릴 때마다 뼈가 깨어난다." },
  { name: "바람 부는 언덕",   desc: "숨이 차오르는 오르막. 버티는 법을 배운다." },
  { name: "서리 내린 골짜기", desc: "첫 점검의 땅. 지나온 석 달이 몸에 남았는지 확인한다." },
  { name: "얼어붙은 호수",   desc: "가장 나가기 싫은 달. 2분이라도 움직인 날이 길을 만든다." },
  { name: "눈 그친 산길",     desc: "굳은 관절을 녹이며 한 걸음씩. 유연함이 무기가 된다." },
  { name: "해빙의 강가",     desc: "두 번째 점검의 땅. 근육이 붙기 시작한 자리." },
  { name: "새싹 덮인 폐허",   desc: "무너진 자세를 다시 세우는 곳. 어깨가 열린다." },
  { name: "비 내리는 돌다리", desc: "미끄러운 다리 위. 중심을 잡는 힘을 시험한다." },
  { name: "한낮의 채석장",   desc: "더 무거운 것을 드는 달. 돌을 깨듯 부하를 올린다." },
  { name: "뜨거운 사막 관문", desc: "마지막 관문. 여기를 넘으면 성이 보인다." },
  { name: "골왕의 성",       desc: "봉인이 풀린다. 1년간 벼려온 뼈와 근육으로 맞선다." },
];

/* 체크포인트에 기록하는 값 */
export const METRICS = [
  { id: "muscleMass", label: "근육량",   short: "근육",   unit: "kg", hint: "인바디 골격근량" },
  { id: "bodyFat",    label: "체지방률", short: "체지방", unit: "%",  hint: "" },
  { id: "weight",     label: "체중",     short: "체중",   unit: "kg", hint: "" },
  { id: "bmd",        label: "골밀도",   short: "골밀도", unit: "T",  hint: "T-score (예: -2.0)" },
];

export const ITEM_INDEX = (() => {
  const map = new Map();
  for (const w of Object.keys(ROUTINE)) for (const it of ROUTINE[w].items) map.set(it.id, it);
  for (const f of FUEL) map.set(f.id, f);
  return map;
})();

export const FLEX_IDS = new Set(
  Object.values(ROUTINE).flatMap((r) => r.items.filter((i) => i.stat === "flex").map((i) => i.id))
);

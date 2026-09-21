/* Bone Quest — 세계관 텍스트 (v1 본 어드벤처의 프롤로그·예언서를 그대로 이어받음) */
import { START } from "./data.js";

export const PROLOGUE = [
  "먼 옛날, 사람의 뼈를 갉아 속을 비우는 왕이 있었다.\n사람들은 그를 골왕(骨王)이라 불렀다.",
  "현자들은 목숨을 걸고 그를 땅속 깊이 봉인했다.\n그리고 오랜 세월이 흘렀다.",
  "어느 날 예언자가 말했다.\n\n— 봉인은 더 버티지 못한다.\n— 열두 달 뒤, 골왕이 다시 깨어나리라.",
  "선택받은 용사여.\n그대의 뼈는 아직 무르고, 근육은 아직 얕다.",
  "남은 시간은 1년.\n하루하루 몸을 벼려 그날에 맞서라.\n\n이것이 그대의 원정이다.",
];

/* 예언서 장: startWeek 이상 지나면 열린다 */
export const CHAPTERS = [
  { title: "굳은 몸 깨우기",   startWeek: 0,  text: "2년을 쉰 몸은 삐걱인다. 용사는 아직 검을 제대로 들지 못한다. 그래도 첫 걸음은 내딛는 것에서 시작된다. 무너진 자세부터 바로 세울 것." },
  { title: "기초 골격 세우기", startWeek: 12, text: "발뒤꿈치가 땅을 두드릴 때마다 뼈에 신호가 닿는다. 무르던 골격이 제 모양을 찾기 시작한다. 용사는 이제 자기 몸무게를 감당할 수 있다." },
  { title: "부하 올리기",     startWeek: 24, text: "땅이 미세하게 흔들린다. 봉인이 약해지고 있다. 용사는 더 무거운 것을 들기 시작한다. 남은 시간이 길지 않다." },
  { title: "재검진 보스전",   startWeek: 36, text: "봉인이 풀린다. 골왕이 눈을 뜬다. 1년간 벼려온 뼈와 근육으로, 용사는 마지막 검진대에 오른다." },
];

export function weeksSinceStart(today) {
  const [y1, m1, d1] = START.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const days = Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 864e5);
  return Math.max(0, Math.floor(days / 7));
}

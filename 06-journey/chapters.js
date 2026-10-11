/* Chapters, P timeline helpers and the copy that the 3D labels need (KR/EN).
   Every fact here comes from _briefs/00_COMMON.md or _briefs/06_journey.md. */

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (a, b, v) => clamp01((v - a) / (b - a));
export const smooth = (a, b, v) => { const t = range(a, b, v); return t * t * (3 - 2 * t); };
// reduced-motion twin of smooth(): the state flips at the middle of the window instead of tweening
export const snap = (a, b, v) => (v >= (a + b) / 2 ? 1 : 0);
export const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export const CHAPTERS = [
  { id: 'hero', a: 0, b: 0.10, name: 'HERO' },
  { id: 'pour', a: 0.10, b: 0.22, name: 'POUR' },
  { id: 'morph', a: 0.22, b: 0.46, name: 'ORIGIN' },
  { id: 'factory', a: 0.46, b: 0.62, name: 'FACTORY' },
  { id: 'cert', a: 0.62, b: 0.72, name: 'CERTIFIED' },
  { id: 'years', a: 0.72, b: 0.84, name: '30 YEARS' },
  { id: 'products', a: 0.84, b: 0.95, name: 'PRODUCTS' },
  { id: 'contact', a: 0.95, b: 1.0, name: 'CONTACT' },
];
export const chapterAt = (P) => {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) if (P >= CHAPTERS[i].a) return CHAPTERS[i];
  return CHAPTERS[0];
};

/* uMorph as a function of P: 1 (persimmon, hidden under the hero ring) → 2 → 3 with 0.05 holds,
   back to 0 (CI) while the particles lie on the floor in PRODUCTS, so CONTACT rises straight into the CI. */
export function morphAt(P, motion = true) {
  if (!motion) {
    if (P < 0.295) return 1;
    if (P < 0.395) return 2;
    if (P < 0.935) return 3;
    return 0;
  }
  if (P < 0.27) return 1;
  if (P < 0.32) return 1 + range(0.27, 0.32, P);
  if (P < 0.37) return 2;
  if (P < 0.42) return 2 + range(0.37, 0.42, P);
  if (P < 0.92) return 3;
  if (P < 0.95) return 3 * (1 - range(0.92, 0.95, P));
  return 0;
}

/* background darkness: ivory hero → dark from the pour on → ivory again for products/contact */
export const darkAt = (P, S = smooth) => S(0.11, 0.18, P) * (1 - S(0.83, 0.87, P));

/* 12 certifications exactly as 00_COMMON lists them (FDA registration is shown as a separate note) */
export const CERTS = [
  { t: 'GMP', ko: '건강기능식품 GMP', en: 'Health functional food GMP' },
  { t: 'ISO 9001', ko: '2015 품질경영', en: '2015 quality mgmt.' },
  { t: 'HACCP', ko: '발효식초', en: 'Fermented vinegar' },
  { t: 'HACCP', ko: '인삼·홍삼음료', en: 'Ginseng drinks' },
  { t: 'HACCP', ko: '음료베이스', en: 'Beverage base' },
  { t: 'HACCP', ko: '혼합음료', en: 'Mixed beverages' },
  { t: 'HACCP', ko: '과채주스', en: 'Fruit & veg. juice' },
  { t: 'HACCP', ko: '과채음료', en: 'Fruit & veg. drinks' },
  { t: { ko: '통신판매업', en: 'Mail-order' }, ko: '신고 제04-24호', en: 'Report No. 04-24' },
  { t: { ko: '영업신고', en: 'Business' }, ko: '', en: 'report' },
  { t: { ko: '영업등록', en: 'Business' }, ko: '', en: 'registration' },
  { t: { ko: '건강기능식품', en: 'Health food' }, ko: '영업신고', en: 'business report' },
];

/* 8 ring nodes (06_journey copy) with the detailed 00_COMMON history lines */
export const NODES = [
  { y: 1996, ko: '사업자등록·제조허가', en: 'Registered · licensed to manufacture', dko: '1996.12 사업자등록 및 식품 제조·가공업 영업허가', den: 'Dec 1996 · Business registration and food manufacturing license' },
  { y: 2001, ko: '화랑삼 수출', en: 'Hwarangsam exports', dko: '2001.03 화랑삼 수출 (일본·캐나다·홍콩)', den: 'Mar 2001 · Hwarangsam exported to Japan, Canada, Hong Kong' },
  { y: 2005, ko: 'GMP 1호', en: 'GMP No.1', dko: '2005.10 KFDA GMP 지정 — 국내 액상 제품 1호 공장', den: 'Oct 2005 · KFDA GMP — Korea’s 1st liquid-product plant' },
  { y: 2009, ko: 'CJ HACCP', en: 'CJ HACCP', dko: '2009.10 CJ HACCP 인증', den: 'Oct 2009 · CJ HACCP certification' },
  { y: 2013, ko: 'FDA 등록', en: 'FDA registered', dko: '2013.11 FDA 등록', den: 'Nov 2013 · US FDA registration' },
  { y: 2018, ko: 'ISO 9001', en: 'ISO 9001', dko: '2018.04 ISO 9001:2015 인증', den: 'Apr 2018 · ISO 9001:2015 certification' },
  { y: 2023, ko: '광동제약 OEM', en: 'Kwangdong OEM', dko: '2023.04 광동제약 비타500·헛개파워 OEM 런칭', den: 'Apr 2023 · OEM launch of Kwangdong’s Vita500 and Hutgae Power' },
  { y: 2026, ko: '학교기업 매출 1위·수출 300만불', en: 'No.1 school enterprise · $3M exports', dko: '2026 전국 학교기업 매출 1위 · 해외수출 300만불', den: '2026 · No.1 school enterprise in sales · $3M in exports' },
];

/* 4 products (00_COMMON table) */
export const PRODUCTS = [
  {
    tex: '../assets/img/pr1_fiber_bottle_cut.webp',
    cat: { ko: '화이바 음료', en: 'FIBER BEVERAGE' },
    name: { ko: '감식초 화이바', en: 'Persimmon Vinegar Fiber' },
    sub: 'Fiber Beverage',
    line: { ko: '국내 유일 감식초 음료, 식이섬유 2,500mg. 식후 가볍게 즐기는 건강한 습관.', en: 'Korea’s only persimmon vinegar drink, with 2,500mg of dietary fiber. A light, healthy after-meal habit.' },
    spec: { ko: '100ml × 50입', en: '100ml × 50' },
  },
  {
    tex: '../assets/img/pr2_vermont_pouch_cut.webp',
    cat: { ko: '드링킹 음료', en: 'DRINKING BEVERAGE' },
    name: { ko: '감발효 버몬트', en: 'Persimmon Ferment Vermont' },
    sub: 'Pouch',
    line: { ko: '감발효초의 깊은 풍미에 타우린 1,000mg. 휴대가 간편한 파우치.', en: 'The deep flavor of fermented persimmon vinegar with 1,000mg of taurine. An easy-to-carry pouch.' },
    spec: { ko: '100ml × 50입', en: '100ml × 50' },
  },
  {
    tex: '../assets/img/pr3_jinhongsam_pouch_cut.webp',
    cat: { ko: '홍삼 음료', en: 'RED GINSENG' },
    name: { ko: '6년근 진홍삼 프리미엄', en: '6-Year Red Ginseng Premium' },
    sub: 'Premium',
    line: { ko: '국내산 6년근 홍삼 농축액 350mg, 남녀노소 즐기는 프리미엄 홍삼음료.', en: '350mg of Korean 6-year-old red ginseng concentrate. A premium red ginseng drink for all ages.' },
    spec: { ko: '70ml × 30입', en: '70ml × 30' },
  },
  {
    tex: '../assets/img/pr4_hongsam_pouch_cut.webp',
    cat: { ko: '홍삼 음료 · 건강기능식품', en: 'RED GINSENG · HEALTH FUNCTIONAL FOOD' },
    name: { ko: '6년근 홍삼진액', en: '6-Year Red Ginseng Extract' },
    sub: 'Health Functional Food',
    line: { ko: '한 포(50ml)당 진세노사이드 10mg. 면역력 증진·피로 개선에 도움.', en: '10mg of ginsenosides per 50ml pouch. Helps support immunity and relieve fatigue.' },
    spec: { ko: '50ml × 30입', en: '50ml × 30' },
  },
];

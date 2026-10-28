// আলপনা motif kit: lotus petals, dot rings, কলকা and the ঝালর band as SVG markup strings.
// Every string here is static decoration built from numbers, never from visitor or catalog data,
// so it is safe to hand to dangerouslySetInnerHTML.
export const AT = "#A63D24";
export const AW = "#FFFDF6";

const rot = (n: number, f: (angle: number, k: number) => string) => Array.from({ length: n }, (_, k) => f((k * 360) / n, k)).join("");
export const petals = (n: number, r1: number, r2: number, w: number, fill: string, stroke = "none", sw = 0) =>
  rot(n, (a) => `<path d="M0 ${-r1} Q${w} ${-(r1 + r2) / 2} 0 ${-r2} Q${-w} ${-(r1 + r2) / 2} 0 ${-r1}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" transform="rotate(${a})"/>`);
export const dots = (n: number, r: number, s: number, fill: string) => rot(n, (a) => `<circle cx="0" cy="${-r}" r="${s}" fill="${fill}" transform="rotate(${a})"/>`);
export const ring = (r: number, col: string, w: number, dash = "") => `<circle r="${r}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
const kalka = (col: string, s = 1) => `<path transform="scale(${s})" d="M0 0 C16 -2 26 -18 16 -32 C9 -42 -8 -40 -11 -26 C-13 -14 -2 -9 4 -14 C8 -18 4 -24 -1 -22" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/><circle transform="scale(${s})" cx="2" cy="-20" r="2.6" fill="${col}"/>`;
const disc = (bg: string) => (bg !== "none" ? `<circle r="98" fill="${bg}"/>` : "");

export const AL = {
  lotus: (c = AW, bg = "none") => `${disc(bg)}<circle r="14" fill="${c}"/>${dots(10, 21, 2.6, c)}${petals(8, 26, 54, 15, "none", c, 3)}${petals(8, 32, 48, 6, c)}${ring(60, c, 2.4)}${dots(24, 67, 2.4, c)}${petals(16, 72, 94, 9, "none", c, 2.6)}${dots(16, 97, 2.2, c)}`,
  wheel: (c = AW, bg = "none") => `${disc(bg)}${ring(12, c, 3)}${rot(12, (a) => `<path d="M0 -16 V-50" stroke="${c}" stroke-width="2.6" transform="rotate(${a})"/>`)}${ring(54, c, 3)}${petals(12, 58, 84, 11, c)}${dots(12, 72, 3, bg === "none" ? AT : bg)}${ring(90, c, 2, "2 5")}`,
  paisley: (c = AW, bg = "none") => `${disc(bg)}<circle r="10" fill="${c}"/>${ring(18, c, 2.4)}${rot(6, (a) => `<g transform="rotate(${a}) translate(0 -40)">${kalka(c, 1.15)}</g>`)}${ring(78, c, 2.4)}${dots(30, 86, 2.4, c)}`,
};

/** The three timeline mandalas: lotus, wheel, paisley — white rice paste on terracotta. */
export const BURSTS = [AL.lotus(AW, AT), AL.wheel(AW, AT), AL.paisley(AW, AT)];

/** The full lotus that rides the tip of the timeline line. */
export const LINE_TIP = `<g transform="scale(1.5) translate(16 0)">${rot(8, (a) => `<path d="M0 0 Q-7 -10 0 -20 Q7 -10 0 0Z" transform="rotate(${a + 22.5})"/>`)}${rot(8, (a) => `<path d="M0 0 Q-4 -6 0 -12 Q4 -6 0 0Z" fill="#F7F0E3" transform="rotate(${a})"/>`)}<circle r="4.5"/><circle r="1.8" fill="#F6B73F"/></g>`;

/** Size buttons' lotus (পদ্ম-চাকতি). */
export const PILL_LOTUS = `<svg viewBox="-12 -12 24 24">${rot(5, (a) => `<path d="M0 0 Q-3.5 -5 0 -11 Q3.5 -5 0 0Z" fill="currentColor" transform="rotate(${a})"/>`)}<circle r="2" fill="#FFF6E6"/></svg>`;

/** Flat strip the timeline lands on: small lotuses and dots, two copies wide so it can drift. */
export const END_STRIP = (() => {
  const tile = (k: number) => `<g transform="translate(${k * 64 + 32} 26)">${petals(8, 5, 15, 4.2, "none", AW, 1.3)}${petals(8, 6, 12, 1.6, AW)}${dots(8, 18, 1.4, AW)}<circle r="3" fill="${AW}"/><circle cx="32" r="2.2" fill="${AW}"/><path d="M18 0 h8 M38 0 h8" stroke="${AW}" stroke-width="1.4" stroke-linecap="round"/></g>`;
  return `<svg viewBox="0 0 ${64 * 40} 52" width="${64 * 40}" aria-hidden="true"><path d="M0 5.5 H${64 * 40} M0 46.5 H${64 * 40}" stroke="${AW}" stroke-width="1.4" stroke-dasharray="2 5" stroke-linecap="round"/>${Array.from({ length: 40 }, (_, k) => tile(k)).join("")}</svg>`;
})();

/** ঝালর পাড়: a terracotta band of white rice-paste flowers with a scalloped fringe, two copies wide so it can drift. */
export const JHALOR = (() => {
  const n = 90, w = 48 * n;
  const tile = (k: number) => `<g transform="translate(${k * 48} 0)"><g transform="translate(24 17)">${petals(8, 0, 10, 3.2, AW)}<circle r="2.4" fill="${AT}"/></g><circle cy="17" r="2" fill="${AW}"/><path d="M0 32 A12 12 0 0 0 24 32 A12 12 0 0 0 48 32" fill="${AT}"/><circle cx="12" cy="49" r="2.6" fill="${AT}"/><circle cx="36" cy="49" r="2.6" fill="${AT}"/></g>`;
  return `<svg viewBox="0 0 ${w} 56" width="${w}" aria-hidden="true"><rect width="${w}" height="32" fill="${AT}"/><path d="M0 4 H${w} M0 29 H${w}" stroke="${AW}" stroke-width="1" stroke-dasharray="2 4" stroke-linecap="round"/>${Array.from({ length: n }, (_, k) => tile(k)).join("")}</svg>`;
})();

/** Quote কার্তুশ: the stepped pink frame with a yellow double outline and a cream panel for the lettering (viewBox 0 0 300 380; strokes stay even when phones squash it). */
const CART = "M10 72 H38 V44 H88 Q150 -6 212 44 H262 V72 H290 V308 H262 V336 H212 Q150 386 88 336 H38 V308 H10 Z";
export const QUOTE_CARTOUCHE = `<path d="${CART}" fill="#E3127A" stroke="#F8D748" stroke-width="5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="${CART}" fill="#FFF6E6" stroke="#F8D748" stroke-width="1.6" vector-effect="non-scaling-stroke" transform="translate(150 190) scale(.93) translate(-150 -190)"/>`;

/** Quote কার্তুশ: a fanned pink lotus for the frame's corners (viewBox -50 -50 100 70). */
export const QUOTE_CORNER_LOTUS = [-62, -31, 0, 31, 62].map((a, i) => `<path d="M0 10 Q${a ? -12 : -14} -14 0 ${a ? -38 : -46} Q${a ? 12 : 14} -14 0 10Z" fill="${i % 2 ? "#F7CFC6" : "#F3A6A0"}" stroke="#E0807C" stroke-width="1" transform="rotate(${a})"/>`).join("") + `<path d="M-20 10 Q0 18 20 10" fill="none" stroke="#E0807C" stroke-width="2"/>`;

/** Quote কার্তুশ: pink band of tiny yellow lotuses and dashes, two copies wide so it can drift. */
export const QUOTE_STRIP = (() => {
  const n = 60, w = 40 * n;
  const tile = (k: number) => `<g transform="translate(${k * 40 + 20} 12)">${[-50, -25, 0, 25, 50].map((a) => `<path d="M0 0 Q-3 -4 0 -9 Q3 -4 0 0Z" fill="#F8D748" transform="rotate(${a})"/>`).join("")}</g><circle cx="${k * 40}" cy="8" r="1.6" fill="#F8D748"/><path d="M${k * 40 + 5} 8 h6 M${k * 40 + 29} 8 h6" stroke="#F8D748" stroke-width="1.2" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 ${w} 16" width="${w}" aria-hidden="true">${Array.from({ length: n }, (_, k) => tile(k)).join("")}</svg>`;
})();

/** Terracotta আলপনা tiles behind the recipe ticket. */
export const RECIPE_FLOOR = `<defs><pattern id="kgAlFloor" width="128" height="128" patternUnits="userSpaceOnUse"><g transform="translate(64 64) scale(.5)">${AL.lotus(AW)}</g>${[[0, 0], [128, 0], [0, 128], [128, 128]].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(.2)">${AL.wheel(AW)}</g>`).join("")}</pattern></defs><rect x="-10%" y="-10%" width="120%" height="120%" fill="url(#kgAlFloor)" opacity=".9"/>`;

/** Why-গুড়: a ঝালর ring (scalloped disc with rice-paste dots) that spins open around each photo. */
export const WHY_BLOOM = (() => {
  const c = "#B5442A", n = 18, r = 72, s = (Math.PI * r) / n;
  const p = (k: number) => { const a = (k / n) * Math.PI * 2; return `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`; };
  const scallops = `M${p(0)} ${Array.from({ length: n }, (_, k) => `A${s.toFixed(2)} ${s.toFixed(2)} 0 0 1 ${p(k + 1)}`).join(" ")}Z`;
  return `<g style="--d:0ms"><circle r="${r}" fill="${c}"/><path d="${scallops}" fill="${c}"/><g transform="rotate(10)">${dots(n, 66, 1.6, "#FBF6EC")}</g></g>` +
    `<g style="--d:160ms"><g transform="rotate(10)">${dots(n, 92, 2.6, c)}</g>${dots(n, 99, 1.4, c)}</g>`;
})();

/** Why-গুড়: Fe and K element tiles that take turns swaying, drawn in place of a photo for "খনিজ থাকে". */
export const WHY_MINERALS = (() => {
  const tile = (x: number, y: number, sym: string, num: string, name: string, fill: string, r: number, cls: string) =>
    `<g transform="translate(${x} ${y})"><g class="mn-tile${cls}" style="--r:${r}deg"><rect x="-17" y="-20" width="34" height="40" rx="5" fill="${fill}" stroke="#3A160B" stroke-width="2.4"/><text x="-12" y="-10" class="mn-n">${num}</text><text x="0" y="6" text-anchor="middle" class="mn-s">${sym}</text><text x="0" y="15.5" text-anchor="middle" class="mn-n">${name}</text></g></g>`;
  return `<g transform="translate(50 52)">${tile(-18, 0, "Fe", "২৬", "আয়রন", "#F2B33D", -6, "")}${tile(18, 4, "K", "১৯", "পটাশিয়াম", "#FFF8EC", 6, " b")}</g>`;
})();

/** Why-গুড়: a cup of tea with a গুড় swirl turning on top and steam rising, drawn in place of a photo for "অল্পেই মিষ্টি". */
export const WHY_SWEET = (() => {
  const k = `fill="none" stroke="#3A160B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  return `<path class="tc-stm" pathLength="1" d="M42 30 c-5 -6 5 -9 0 -16" ${k}/><path class="tc-stm b" pathLength="1" d="M56 30 c-5 -6 5 -9 0 -16" ${k}/>` +
    `<path d="M20 40 H76 L71 66 Q69 76 58 76 H38 Q27 76 25 66Z" fill="#FFF8EC" stroke="#3A160B" stroke-width="2.4" stroke-linejoin="round"/><path d="M75 46 c9 -2 12 4 10 9 c-2 5 -7 6 -12 4" ${k}/>` +
    `<ellipse cx="48" cy="41" rx="26" ry="5" fill="#C8783A" stroke="#3A160B" stroke-width="2"/>` +
    `<g transform="translate(48 41) scale(1 .2) translate(-50 -50)"><g class="tc-sw"><path d="M50 50 c6 -2 10 4 6 10 c-6 8 -20 4 -20 -8 c0 -14 18 -22 30 -12" fill="none" stroke="#FFF8EC" stroke-width="6" stroke-linecap="round"/></g></g>` +
    `<path d="M30 56 H66" stroke="#B5442A" stroke-width="1.4" stroke-dasharray="1 4" stroke-linecap="round"/>`;
})();

/** Why-গুড়: the five-petal lotus on the tip of the straight stem. */
export const WHY_TIP = `<g transform="translate(0 12)">${[0, 72, 144, 216, 288].map((a) => `<path class="bud" d="M0 0 Q-7 -10 0 -22 Q7 -10 0 0Z" transform="rotate(${a + 180})"/>`).join("")}<circle r="4" fill="#F7F0E3"/><circle class="bud" r="2"/></g>`;

/** Why-গুড়: slim নকশি triangle strip under the section. */
export const NAKSHI_STRIP = (() => {
  const tri = (k: number) => `<g transform="translate(${k * 32} 0)"><path d="M0 26 L16 6 L32 26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 26 L16 16 L24 26Z" fill="currentColor"/><circle cx="16" cy="2.5" r="1.6" fill="currentColor"/><circle cx="0" cy="12" r="1.3" fill="currentColor"/><path d="M0 28.5 H32" stroke="currentColor" stroke-width="1.4"/></g>`;
  return `<svg viewBox="0 0 ${32 * 120} 30" width="${32 * 120}" aria-hidden="true">${Array.from({ length: 120 }, (_, k) => tri(k)).join("")}</svg>`;
})();

/** Footer motifs, drawn in currentColor. */
export const FOOTER_LOTUS = AL.lotus("currentColor");
export const FOOTER_CELL_BLOOM = `${petals(8, 20, 80, 22, "none", "currentColor", 8)}<circle r="14" fill="currentColor"/>${dots(8, 92, 7, "currentColor")}`;
export const FOOTER_ROW = `<path d="M0 11 H118 M182 11 H300" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 5" stroke-linecap="round" opacity=".7"/><g transform="translate(150 11)">${petals(8, 3, 10, 3, "currentColor")}</g><circle cx="128" cy="11" r="2.6" fill="currentColor"/><circle cx="172" cy="11" r="2.6" fill="currentColor"/>`;

/** Animated recipe stickers (line art; the CSS gives each one its own small loop). */
export const RECIPE_STICKERS: Record<string, string> = {
  tea: `<svg class="a-tea" viewBox="0 0 80 80" aria-hidden="true"><path class="k stm" d="M30 26 c-5 -6 5 -9 0 -16"/><path class="k stm" d="M40 24 c-5 -6 5 -9 0 -16"/><path class="k stm" d="M50 26 c-5 -6 5 -9 0 -16"/><g class="cup"><path class="k" d="M16 34 h46 l-4 26 c-1 6 -5 10 -12 10 h-14 c-7 0 -11 -4 -12 -10z"/><path class="k" d="M61 40 c9 -2 12 4 10 9 c-2 5 -7 6 -12 4"/><ellipse class="f" cx="39" cy="35" rx="21" ry="3.5"/></g></svg>`,
  pitha: `<svg class="a-pit" viewBox="0 0 80 80" aria-hidden="true"><ellipse class="k" cx="40" cy="62" rx="32" ry="9"/><path class="k" d="M18 58 c0 -14 10 -22 22 -22 s22 8 22 22 c-6 3 -38 3 -44 0z"/><ellipse class="f pud" cx="40" cy="38" rx="10" ry="3"/><path class="f drp" d="M40 6 c0 0 -6 8 -6 12 a6 6 0 0 0 12 0 c0 -4 -6 -12 -6 -12z"/></svg>`,
  payesh: `<svg class="a-pay" viewBox="0 0 80 80" aria-hidden="true"><path class="k" d="M8 36 h64 c0 20 -14 34 -32 34 s-32 -14 -32 -34z"/><ellipse class="k" cx="40" cy="36" rx="32" ry="8"/><g transform="translate(40 36) scale(1 .25)"><path class="k sw" d="M0 0 c6 -2 10 4 6 10 c-6 8 -20 4 -20 -8 c0 -14 18 -22 30 -12" style="stroke-width:5"/></g><path class="k spn" d="M52 32 l14 -22"/></svg>`,
  muri: `<svg class="a-mur" viewBox="0 0 80 80" aria-hidden="true"><g class="f"><circle class="g" cx="26" cy="34" r="5" style="--d:0s"/><circle class="g" cx="38" cy="28" r="5" style="--d:.25s"/><circle class="g" cx="50" cy="32" r="5" style="--d:.5s"/><circle class="g" cx="60" cy="36" r="4" style="--d:.75s"/><circle class="g" cx="44" cy="22" r="4" style="--d:1s"/></g><path class="k" d="M8 40 h64 c0 18 -14 30 -32 30 s-32 -12 -32 -30z"/></svg>`,
  ruti: `<svg class="a-rut" viewBox="0 0 80 80" aria-hidden="true"><ellipse class="k" cx="40" cy="48" rx="34" ry="16"/><ellipse class="k" cx="40" cy="48" rx="24" ry="10" style="opacity:.35"/><path class="k dz" d="M14 46 l8 -6 l6 8 l8 -8 l6 8 l8 -8 l6 8 l8 -6" style="stroke-width:4"/></svg>`,
  patali: `<svg class="a-pat" viewBox="0 0 80 80" aria-hidden="true"><path class="k" d="M8 34 l30 -14 l34 12 l-30 16z"/><path class="k" d="M8 34 v20 l34 14 v-20z"/><path class="k" d="M42 48 l30 -16 v20 l-30 16z"/><path class="k cr" d="M30 26 l6 6 l-4 5 l7 7" style="stroke-width:3"/><path class="f ch" d="M38 40 l5 -2 l3 4 l-5 2z" style="--x:-14px;--y:-16px;--d:0s"/><path class="f ch" d="M46 36 l4 -1 l2 3 l-4 1z" style="--x:12px;--y:-18px;--d:.1s"/></svg>`,
};

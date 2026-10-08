import type { IconName } from "../components/Icon";

export type Tone = "teal" | "blue" | "violet" | "amber" | "orange" | "rose" | "emerald" | "indigo" | "slate";

export const toneClasses: Record<Tone, { tile: string; soft: string; text: string; bar: string }> = {
  teal: { tile: "bg-teal-50 text-teal-600", soft: "bg-teal-50", text: "text-teal-600", bar: "bg-teal-500" },
  blue: { tile: "bg-sky-50 text-sky-600", soft: "bg-sky-50", text: "text-sky-600", bar: "bg-sky-500" },
  violet: { tile: "bg-violet-50 text-violet-600", soft: "bg-violet-50", text: "text-violet-600", bar: "bg-violet-500" },
  amber: { tile: "bg-amber-50 text-amber-600", soft: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-500" },
  orange: { tile: "bg-orange-50 text-orange-600", soft: "bg-orange-50", text: "text-orange-600", bar: "bg-orange-500" },
  rose: { tile: "bg-rose-50 text-rose-600", soft: "bg-rose-50", text: "text-rose-600", bar: "bg-rose-500" },
  emerald: { tile: "bg-emerald-50 text-emerald-600", soft: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-500" },
  indigo: { tile: "bg-indigo-50 text-indigo-600", soft: "bg-indigo-50", text: "text-indigo-600", bar: "bg-indigo-500" },
  slate: { tile: "bg-slate-100 text-slate-600", soft: "bg-slate-100", text: "text-slate-600", bar: "bg-slate-500" },
};

const tones: Tone[] = ["teal", "blue", "violet", "amber", "orange", "rose", "emerald", "indigo"];

export function toneFor(seed: string): Tone {
  let n = 0;
  for (const c of seed) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return tones[n % tones.length];
}

const rules: { match: RegExp; icon: IconName; tone: Tone }[] = [
  { match: /cement|concrete|mortar|plaster|aggregate|sand|gravel/i, icon: "layers", tone: "amber" },
  { match: /steel|rebar|metal|iron|beam|structural/i, icon: "building", tone: "indigo" },
  { match: /brick|block|masonry|stone/i, icon: "brick", tone: "orange" },
  { match: /electric|wire|cable|light|switch|power/i, icon: "bolt", tone: "amber" },
  { match: /plumb|pipe|water|sanit|drain|valve/i, icon: "droplet", tone: "blue" },
  { match: /paint|coating|finish|primer/i, icon: "paint", tone: "violet" },
  { match: /wood|timber|plywood|door|carpent/i, icon: "tree", tone: "emerald" },
  { match: /tile|floor|ceramic|marble|granite/i, icon: "dashboard", tone: "rose" },
  { match: /roof|sheet|insulat/i, icon: "home", tone: "teal" },
  { match: /tool|hardware|fix|bolt|nail|screw/i, icon: "wrench", tone: "slate" },
  { match: /glass|window|alumin/i, icon: "eye", tone: "blue" },
  { match: /transport|logistic|deliver|equipment|machine/i, icon: "truck", tone: "orange" },
];

const notificationKinds: Record<string, { icon: IconName; tone: Tone }> = {
  rfq: { icon: "inbox", tone: "blue" },
  quotation: { icon: "file", tone: "teal" },
  vendor: { icon: "store", tone: "violet" },
};

export function notificationVisual(kind: string): { icon: IconName; tone: Tone } {
  return notificationKinds[kind] ?? { icon: "bell", tone: "amber" };
}

/** Icon + colour for a material/vendor category (deterministic fallback by name). */
export function categoryVisual(category: string | null | undefined): { icon: IconName; tone: Tone } {
  const text = category ?? "";
  const rule = rules.find((r) => r.match.test(text));
  return rule ? { icon: rule.icon, tone: rule.tone } : { icon: "box", tone: toneFor(text || "item") };
}

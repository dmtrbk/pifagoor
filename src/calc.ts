export type SagPoint = {
  id: string;
  m: string;
  cm: string;
};

export type NumPoint = {
  m: number;
  cm: number;
};

export type SagMode = "length" | "eye" | "ideal";
export type EyeView = "full" | "top" | "bottom" | "hidden";
export type GoneDir = "down" | "up";

export const DEFAULT_ARC: SagPoint[] = [
  { id: "p8", m: "8", cm: "0" },
  { id: "p12", m: "12", cm: "6" },
  { id: "p14", m: "14", cm: "10" },
  { id: "p16", m: "16", cm: "15" },
];

export function parseNum(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "" || t === "-" || t === "." || t === "-.") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function numericPoints(points: SagPoint[]): NumPoint[] {
  return points
    .map((p) => ({ m: parseNum(p.m), cm: parseNum(p.cm) }))
    .filter((p): p is NumPoint => p.m !== null && p.cm !== null && p.m >= 0)
    .sort((a, b) => a.m - b.m);
}

export function sagAt(
  lengthM: number,
  pts: NumPoint[],
): { s: number; note: string; beyond: boolean } {
  if (pts.length === 0) {
    return { s: 0, note: "дуга без точек", beyond: false };
  }
  if (lengthM < pts[0].m) {
    return {
      s: 0,
      note: `по длине: до ${pts[0].m} м провис 0`,
      beyond: false,
    };
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (b.m === a.m) continue;
    if (lengthM <= b.m) {
      const t = (lengthM - a.m) / (b.m - a.m);
      const s = a.cm + t * (b.cm - a.cm);
      return {
        s,
        note: `по длине: между ${a.m} и ${b.m} м`,
        beyond: false,
      };
    }
  }
  const last = pts[pts.length - 1];
  return {
    s: last.cm,
    note: `по длине: дальше ${last.m} м — последняя точка ${last.cm} см`,
    beyond: true,
  };
}

export function sagForMode(args: {
  mode: SagMode;
  lengthA: number | null;
  pts: NumPoint[];
  eye: EyeView;
  eyeCm: number | null;
  gone: GoneDir;
}): { s: number; note: string; beyond: boolean; ready: boolean } {
  const { mode, lengthA, pts, eye, eyeCm, gone } = args;
  if (mode === "ideal") {
    return {
      s: 0,
      note: "идеальный: без провиса и поправок",
      beyond: false,
      ready: true,
    };
  }
  if (mode === "length") {
    if (lengthA === null || pts.length < 2) {
      return { s: 0, note: "нужна длина a и дуга", beyond: false, ready: false };
    }
    const hit = sagAt(lengthA, pts);
    return { ...hit, ready: true };
  }
  if (eye === "full") {
    return {
      s: 0,
      note: "глазом: вижу забойку, отклонения нет",
      beyond: false,
      ready: true,
    };
  }
  if (eye === "top") {
    return {
      s: 5,
      note: "глазом: верх забойки — a ушёл вниз 5 см",
      beyond: false,
      ready: true,
    };
  }
  if (eye === "bottom") {
    return {
      s: -5,
      note: "глазом: низ забойки — a ушёл вверх 5 см",
      beyond: false,
      ready: true,
    };
  }
  if (eyeCm === null) {
    return {
      s: 0,
      note: "глазом: забойку не вижу, введите см и куда ушёл",
      beyond: false,
      ready: false,
    };
  }
  const s = gone === "up" ? -eyeCm : eyeCm;
  const dir = gone === "up" ? "вверх" : "вниз";
  return {
    s,
    note: `глазом: забойку не вижу, a ушёл ${dir} на ${eyeCm} см`,
    beyond: false,
    ready: true,
  };
}

export type DrillInput = {
  aM: number | null;
  haCm: number | null;
  bM: number | null;
  hbCm: number | null;
  mode: SagMode;
  eye: EyeView;
  eyeCm: number | null;
  gone: GoneDir;
  pts: NumPoint[];
};

export type DrillResult = {
  ok: boolean;
  s: number;
  sb: number;
  h: number | null;
  alphaDeg: number | null;
  cmPerM: number | null;
  dir: "вверх" | "вниз" | "горизонт" | null;
  note: string;
  beyond: boolean;
  beyondB: boolean;
};

function sagOfB(
  mode: SagMode,
  lengthB: number | null,
  pts: NumPoint[],
): { s: number; beyond: boolean } {
  if (mode === "ideal" || lengthB === null || pts.length < 2) {
    return { s: 0, beyond: false };
  }
  const hit = sagAt(lengthB, pts);
  return { s: hit.s, beyond: hit.beyond };
}

export function computeDrill(input: DrillInput): DrillResult {
  const sag = sagForMode({
    mode: input.mode,
    lengthA: input.aM,
    pts: input.pts,
    eye: input.eye,
    eyeCm: input.eyeCm,
    gone: input.gone,
  });
  const sagB = sagOfB(input.mode, input.bM, input.pts);

  const ready =
    sag.ready &&
    input.aM !== null &&
    input.haCm !== null &&
    input.bM !== null &&
    input.hbCm !== null &&
    input.aM >= 0 &&
    input.bM > 0;

  if (!ready) {
    return {
      ok: false,
      s: sag.s,
      sb: sagB.s,
      h: null,
      alphaDeg: null,
      cmPerM: null,
      dir: null,
      note: sag.note,
      beyond: sag.beyond,
      beyondB: sagB.beyond,
    };
  }

  const h = input.haCm! - input.hbCm! - sag.s + sagB.s;
  const alphaDeg = (Math.atan(h / 100 / input.bM!) * 180) / Math.PI;
  const cmPerM = h / input.bM!;
  const dir: DrillResult["dir"] =
    alphaDeg > 0.05 ? "вверх" : alphaDeg < -0.05 ? "вниз" : "горизонт";
  const bNote =
    sagB.s > 0.05
      ? ` Провис b ${sagB.s.toFixed(1)} см вниз — целимся выше.`
      : "";

  return {
    ok: true,
    s: sag.s,
    sb: sagB.s,
    h,
    alphaDeg,
    cmPerM,
    dir,
    note: sag.note + bNote,
    beyond: sag.beyond,
    beyondB: sagB.beyond,
  };
}

export function newPointId(): string {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

export function formatSagCm(s: number): string {
  if (Math.abs(s) < 0.05) return "0 см";
  const dir = s > 0 ? "вниз" : "вверх";
  return `${Math.abs(s).toFixed(1)} см ${dir}`;
}

export function formatSigned(n: number, digits: number): string {
  const t = n.toFixed(digits);
  if (n > 0) return `+${t}`;
  return t;
}

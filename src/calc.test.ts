import { describe, expect, it } from "vitest";
import {
  computeDrill,
  numericPoints,
  parseNum,
  sagAt,
  sagForMode,
  type SagPoint,
} from "./calc";

const defaultPts = numericPoints([
  { id: "p8", m: "8", cm: "0" },
  { id: "p12", m: "12", cm: "3" },
  { id: "p14", m: "14", cm: "5" },
  { id: "p16", m: "16", cm: "9" },
]);

describe("parseNum", () => {
  it("принимает запятую", () => {
    expect(parseNum("12,5")).toBe(12.5);
  });
  it("пусто — null", () => {
    expect(parseNum("")).toBeNull();
    expect(parseNum("-")).toBeNull();
  });
});

describe("sagAt", () => {
  it("до 8 м — ноль", () => {
    expect(sagAt(7, defaultPts).s).toBe(0);
    expect(sagAt(8, defaultPts).s).toBe(0);
  });
  it("12 м — 3 см", () => {
    expect(sagAt(12, defaultPts).s).toBe(3);
  });
  it("14 м — 5 см", () => {
    expect(sagAt(14, defaultPts).s).toBe(5);
  });
  it("16 м — 9 см", () => {
    expect(sagAt(16, defaultPts).s).toBe(9);
  });
  it("10 м — середина 8…12", () => {
    expect(sagAt(10, defaultPts).s).toBeCloseTo(1.5);
  });
  it("дальше последней точки не экстраполирует", () => {
    const hit = sagAt(20, defaultPts);
    expect(hit.s).toBe(9);
    expect(hit.beyond).toBe(true);
  });
});

describe("computeDrill", () => {
  const pts = defaultPts;
  const base = {
    aM: 12,
    haCm: 20,
    bM: 8,
    hbCm: 5,
    pts,
    eye: "full" as const,
    eyeCm: null as number | null,
    gone: "down" as const,
  };

  it("по длине: h = ha − hb − sa + sb, b=8 м без провиса", () => {
    const r = computeDrill({ ...base, mode: "length" });
    expect(r.ok).toBe(true);
    expect(r.s).toBe(3);
    expect(r.sb).toBe(0);
    expect(r.h).toBe(12);
    expect(r.alphaDeg).toBeCloseTo((Math.atan(0.12 / 8) * 180) / Math.PI);
    expect(r.cmPerM).toBeCloseTo(1.5);
    expect(r.dir).toBe("вверх");
  });

  it("провис b компенсирует провис a при равной длине", () => {
    const r = computeDrill({ ...base, mode: "length", bM: 12 });
    expect(r.s).toBe(3);
    expect(r.sb).toBe(3);
    expect(r.h).toBe(15);
  });

  it("идеальный без провиса", () => {
    const r = computeDrill({ ...base, mode: "ideal" });
    expect(r.s).toBe(0);
    expect(r.sb).toBe(0);
    expect(r.h).toBe(15);
  });

  it("верх забойки — a вниз 5 см", () => {
    const r = computeDrill({ ...base, mode: "eye", eye: "top" });
    expect(r.s).toBe(5);
    expect(r.h).toBe(10);
  });

  it("низ забойки — a вверх 5 см", () => {
    const r = computeDrill({ ...base, mode: "eye", eye: "bottom" });
    expect(r.s).toBe(-5);
    expect(r.h).toBe(20);
  });

  it("вижу забойку — 0", () => {
    const r = computeDrill({ ...base, mode: "eye", eye: "full" });
    expect(r.s).toBe(0);
    expect(r.h).toBe(15);
  });
});

describe("numericPoints", () => {
  it("отбрасывает пустые и сортирует", () => {
    const raw: SagPoint[] = [
      { id: "b", m: "14", cm: "10" },
      { id: "a", m: "", cm: "1" },
      { id: "c", m: "8", cm: "0" },
    ];
    expect(numericPoints(raw)).toEqual([
      { m: 8, cm: 0 },
      { m: 14, cm: 10 },
    ]);
  });
});

describe("sagForMode", () => {
  it("скрытая забойка без числа — не готов", () => {
    const r = sagForMode({
      mode: "eye",
      lengthA: 12,
      pts: defaultPts,
      eye: "hidden",
      eyeCm: null,
      gone: "down",
    });
    expect(r.ready).toBe(false);
  });

  it("не вижу, ушёл вверх", () => {
    const r = sagForMode({
      mode: "eye",
      lengthA: 12,
      pts: defaultPts,
      eye: "hidden",
      eyeCm: 12,
      gone: "up",
    });
    expect(r.ready).toBe(true);
    expect(r.s).toBe(-12);
  });
});

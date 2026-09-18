import { useEffect, useMemo, useState } from "react";
import {
  computeDrill,
  DEFAULT_ARC,
  formatDirected,
  formatSagCm,
  newPointId,
  numericPoints,
  parseNum,
  sagAt,
  type EyeView,
  type GoneDir,
  type SagMode,
  type SagPoint,
} from "./calc";

const ARC_KEY = "pifagoor-arc-v3";

function loadArc(): SagPoint[] {
  try {
    const raw = localStorage.getItem(ARC_KEY);
    if (!raw) return DEFAULT_ARC;
    const parsed = JSON.parse(raw) as SagPoint[];
    if (!Array.isArray(parsed) || parsed.length < 2) return DEFAULT_ARC;
    return parsed;
  } catch {
    return DEFAULT_ARC;
  }
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {hint ? <span className="hint">{hint}</span> : null}
      <input
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ArcChart({ pts }: { pts: { m: number; cm: number }[] }) {
  if (pts.length < 2) return null;
  const from = Math.floor(pts[0].m);
  const to = Math.ceil(pts[pts.length - 1].m);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let x = from; x <= to; x += 1) {
    xs.push(x);
    ys.push(sagAt(x, pts).s);
  }
  const w = 320;
  const padL = 18;
  const padR = 50;
  const padT = 16;
  const padB = 32;
  const plotH = 119;
  const h = padT + plotH + padB;
  const maxY = Math.max(15, Math.ceil(Math.max(...ys)));
  const xTicks: number[] = [];
  for (let x = from + (from % 2 === 0 ? 0 : 1); x <= to; x += 2) xTicks.push(x);
  const yTicks: number[] = [];
  for (let y = 0; y <= maxY; y += 5) yTicks.push(y);
  const x0 = xs[0];
  const x1 = xs[xs.length - 1] || x0 + 1;
  const sx = (x: number) => padL + ((x - x0) / (x1 - x0 || 1)) * (w - padL - padR);
  const sy = (y: number) => padT + (y / maxY) * plotH;
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${sx(x)} ${sy(ys[i])}`).join(" ");

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Дуга провиса вниз">
        {xTicks.map((x) => (
          <line key={`gx-${x}`} x1={sx(x)} y1={padT} x2={sx(x)} y2={h - padB} stroke="#ddd6c4" />
        ))}
        {yTicks.map((y) => (
          <line key={`gy-${y}`} x1={padL} y1={sy(y)} x2={w - padR} y2={sy(y)} stroke="#ddd6c4" />
        ))}
        <line x1={padL} y1={padT} x2={w - padR} y2={padT} stroke="#c9c2ae" />
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#c9c2ae" />
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#c9c2ae" />
        <path d={d} fill="none" stroke="#5c594e" strokeWidth="2" />
        {pts.map((p) => (
          <circle key={`${p.m}-${p.cm}`} cx={sx(p.m)} cy={sy(p.cm)} r="3.5" fill="#2f5d28" />
        ))}
        {xTicks.map((x) => (
          <text key={`tx-${x}`} x={sx(x)} y={h - 12} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1c1a14">
            {x}м
          </text>
        ))}
        {yTicks.map((y) => (
          <text key={`ty-${y}`} x={w - padR + 5} y={sy(y) + 4} fontSize="14" fontWeight="700" fill="#1c1a14">
            {y}см
          </text>
        ))}
      </svg>
      <p className="chart-caption">Вправо — метры. Вниз — см.</p>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<"calc" | "arc">("calc");
  const [aStr, setA] = useState("12");
  const [haStr, setHa] = useState("20");
  const [bStr, setB] = useState("8");
  const [hbStr, setHb] = useState("5");
  const [mode, setMode] = useState<SagMode>("length");
  const [eye, setEye] = useState<EyeView>("full");
  const [gone, setGone] = useState<GoneDir>("down");
  const [eyeCmStr, setEyeCm] = useState("12");
  const [arc, setArc] = useState<SagPoint[]>(loadArc);

  useEffect(() => {
    localStorage.setItem(ARC_KEY, JSON.stringify(arc));
  }, [arc]);

  const pts = useMemo(() => numericPoints(arc), [arc]);
  const result = computeDrill({
    aM: parseNum(aStr),
    haCm: parseNum(haStr),
    bM: parseNum(bStr),
    hbCm: parseNum(hbStr),
    mode,
    eye,
    eyeCm: parseNum(eyeCmStr),
    gone,
    pts,
  });

  const lastM = pts.length ? pts[pts.length - 1].m : null;

  return (
    <div className="app">
      <header className="top">
        <h1>Driller Machine Master</h1>
        <div className="pills" role="tablist">
          <button
            type="button"
            className="pill"
            role="tab"
            aria-pressed={tab === "calc"}
            onClick={() => setTab("calc")}
          >
            Расчёт
          </button>
          <button
            type="button"
            className="pill"
            role="tab"
            aria-pressed={tab === "arc"}
            onClick={() => setTab("arc")}
          >
            Дуга
          </button>
        </div>
      </header>

      {tab === "calc" ? (
        <div className="stack">
          <p className="lead">
            Цель — шпур a. Бурим шпур b, чтобы попасть в a. Дугу правят на вкладке «Дуга».
          </p>

          <div className="grid two">
            <section className="card">
              <div className="card-head">
                <h2>Шпур a</h2>
                <span className="hint">цель, обычно 0°</span>
              </div>
              <Field label="Длина a, м" value={aStr} onChange={setA} />
              <Field
                label="Высота ha, см"
                hint="устье от лазера; ниже горизонта — минус"
                value={haStr}
                onChange={setHa}
              />
            </section>

            <section className="card">
              <div className="card-head">
                <h2>Шпур b</h2>
                <span className="hint">этот бурим, в a</span>
              </div>
              <Field label="Длина b, м" value={bStr} onChange={setB} />
              <Field
                label="Высота hb, см"
                hint="устье от того же горизонта"
                value={hbStr}
                onChange={setHb}
              />
            </section>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Как считать</h2>
            </div>
            <div className="pills">
              <button
                type="button"
                className="pill"
                aria-pressed={mode === "length"}
                onClick={() => setMode("length")}
              >
                По длине a
              </button>
              <button
                type="button"
                className="pill"
                aria-pressed={mode === "eye"}
                onClick={() => setMode("eye")}
              >
                По забойке
              </button>
              <button
                type="button"
                className="pill"
                aria-pressed={mode === "ideal"}
                onClick={() => setMode("ideal")}
              >
                Идеальный
              </button>
            </div>
            {mode === "length" ? (
              <p className="note">
                Провис a и b с одной дуги. Провис b входит в формулу как +sb.
              </p>
            ) : null}
            {mode === "ideal" ? (
              <p className="note">Без провиса a и b. Только h = ha − hb.</p>
            ) : null}
            {mode === "eye" ? (
              <div className="stack" style={{ marginTop: "0.75rem" }}>
                <p className="lead">Смотрю в шпур a.</p>
                <div className="pills">
                  <button
                    type="button"
                    className="pill"
                    aria-pressed={eye === "full"}
                    onClick={() => setEye("full")}
                  >
                    Вижу забойку → 0 см
                  </button>
                  <button
                    type="button"
                    className="pill"
                    aria-pressed={eye === "top"}
                    onClick={() => setEye("top")}
                  >
                    Верх забойки → a вниз 5 см
                  </button>
                  <button
                    type="button"
                    className="pill"
                    aria-pressed={eye === "bottom"}
                    onClick={() => setEye("bottom")}
                  >
                    Низ забойки → a вверх 5 см
                  </button>
                  <button
                    type="button"
                    className="pill"
                    aria-pressed={eye === "hidden"}
                    onClick={() => setEye("hidden")}
                  >
                    Не вижу забойку → больше 10 см
                  </button>
                </div>
                {eye === "hidden" ? (
                  <>
                    <p className="lead">Куда ушёл шпур a?</p>
                    <div className="pills">
                      <button
                        type="button"
                        className="pill"
                        aria-pressed={gone === "down"}
                        onClick={() => setGone("down")}
                      >
                        Вниз
                      </button>
                      <button
                        type="button"
                        className="pill"
                        aria-pressed={gone === "up"}
                        onClick={() => setGone("up")}
                      >
                        Вверх
                      </button>
                    </div>
                    <Field
                      label="Отклонение, см"
                      hint="от 10 и больше"
                      value={eyeCmStr}
                      onChange={setEyeCm}
                    />
                  </>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="card result">
            <div className="side-chart">
              <div>
                <div className="card-head">
                  <h2>На буровой</h2>
                </div>
                <p className="result-angle">
                  {result.ok && result.alphaDeg !== null && result.dir
                    ? formatDirected(result.alphaDeg, 1, result.dir, "°")
                    : "—"}
                </p>
                <dl className="stats">
                  <div className="stat">
                    <dt>на 1 м шпура b</dt>
                    <dd>
                      {result.ok && result.cmPerM !== null && result.dir
                        ? formatDirected(result.cmPerM, 1, result.dir, " см")
                        : "—"}
                    </dd>
                  </div>
                  <div className="stat">
                    <dt>{mode === "ideal" ? "h = ha − hb" : "h = ha − hb − sa + sb"}</dt>
                    <dd>{result.ok && result.h !== null ? `${result.h.toFixed(1)} см` : "—"}</dd>
                  </div>
                  <div className="stat">
                    <dt>{mode === "eye" ? "уход a" : "провис a"}</dt>
                    <dd>{formatSagCm(result.s)}</dd>
                  </div>
                  <div className="stat">
                    <dt>провис b</dt>
                    <dd>{formatSagCm(result.sb)}</dd>
                  </div>
                </dl>
                <p className="note">
                  {result.ok
                    ? `${result.note} h = ${parseNum(haStr)} − ${parseNum(hbStr)} − ${result.s.toFixed(1)} + ${result.sb.toFixed(1)} = ${result.h?.toFixed(1)} см. α = arctg(h / b).`
                    : "Нужны a, ha, b, hb и один из трёх расчётов."}
                </p>
                {mode !== "ideal" && (result.beyond || result.beyondB) && lastM !== null ? (
                  <div className="callout">
                    Длина дальше последней точки дуги {lastM} м. Добавьте замер на вкладке «Дуга».
                  </div>
                ) : null}
                {mode === "eye" &&
                eye === "hidden" &&
                parseNum(eyeCmStr) !== null &&
                parseNum(eyeCmStr)! < 10 ? (
                  <div className="callout">
                    Если забойки не видно, по правилу отклонение больше 10 см.
                  </div>
                ) : null}
              </div>
              <div>
                <div className="card-head">
                  <h2>Провис</h2>
                </div>
                <ArcChart pts={pts} />
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="stack">
          <p className="lead">
            Точки провиса. Одна дуга на шпуры a и b — по длине каждого. До первой точки — 0.
          </p>
          <section className="card">
            <div className="card-head">
              <h2>Замеры</h2>
              <div className="row-btns">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setArc((prev) => [...prev, { id: newPointId(), m: "", cm: "" }])
                  }
                >
                  Точка
                </button>
                <button type="button" className="btn ghost" onClick={() => setArc(DEFAULT_ARC)}>
                  Сбросить
                </button>
              </div>
            </div>
            <div className="side-chart">
              <div>
                {arc.map((p, i) => (
                  <div className="arc-row" key={p.id}>
                    <Field
                      label={i === 0 ? "Длина a, м" : ""}
                      value={p.m}
                      onChange={(v) =>
                        setArc((prev) => prev.map((x) => (x.id === p.id ? { ...x, m: v } : x)))
                      }
                    />
                    <Field
                      label={i === 0 ? "Провис s, см" : ""}
                      value={p.cm}
                      onChange={(v) =>
                        setArc((prev) => prev.map((x) => (x.id === p.id ? { ...x, cm: v } : x)))
                      }
                    />
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={arc.length <= 2}
                      onClick={() => setArc((prev) => prev.filter((x) => x.id !== p.id))}
                    >
                      Убрать
                    </button>
                  </div>
                ))}
              </div>
              <ArcChart pts={pts} />
            </div>
          </section>
        </div>
      )}
      <p className="copy">© DMM</p>
    </div>
  );
}

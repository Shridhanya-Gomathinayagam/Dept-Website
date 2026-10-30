// All shapes live in a 1440×120 viewBox. Each wave repeats every 1440 units and is drawn twice as
// wide (2880), so sliding it by exactly one period (-1440) loops seamlessly.
const PERIOD = 1440;
const STEP = PERIOD / 4;

/** Smooth periodic wave through 4 extremes per period (horizontal tangents at each), drawn for two periods. */
function wave(base: number, offsets: [number, number, number, number]): string {
  const ys = [...offsets, ...offsets, offsets[0]].map((o) => base + o);
  let d = `M0,${ys[0]}`;
  for (let i = 1; i < ys.length; i++) {
    const x0 = (i - 1) * STEP;
    const x1 = i * STEP;
    d += ` C${x0 + STEP / 3},${ys[i - 1]} ${x1 - STEP / 3},${ys[i]} ${x1},${ys[i]}`;
  }
  return d;
}

const CREST = wave(76, [-20, 18, -12, 24]); // front edge: hero above, next section below
const BACK = wave(40, [-18, 20, -6, 12]);
const MID = wave(62, [14, -16, 18, -10]);

const toBottom = (d: string) => `${d} L${PERIOD * 2},120 L0,120 Z`;
const toTop = (d: string) => `${d} L${PERIOD * 2},0 L0,0 Z`;

/**
 * Animated wave blend between a dark section and its neighbour.
 *
 * Default (after a dark section): overlaps the *next* section's top and paints the dark navy above
 * the moving crest; below the crest it is transparent, so the next section's backgrounds show
 * through. The next section needs enough top padding.
 *
 * flip (before a dark section): mirror image. Overlaps the *previous* section's bottom and paints
 * the dark navy below the crest, rising into it; the previous section needs enough bottom padding.
 *
 * Two translucent cyan waves drift at different speeds; motion stops for reduced-motion users.
 * `id` must be unique on the page (clip path reference). `fill` is the dark (or solid) section's colour.
 */
export function WaveDivider({ id, flip = false, fill = "#020817" }: { id: string; flip?: boolean; fill?: string }) {
  const drift = "motion-reduce:animate-none";
  const clip = `wave-clip-${id}`;
  return (
    <div aria-hidden className={`pointer-events-none relative z-10 ${flip ? "-mt-20 sm:-mt-30" : "-mb-20 sm:-mb-30"}`}>
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className={`block h-20 w-full sm:h-30 ${flip ? "-scale-y-100" : ""}`}>
        <defs>
          <clipPath id={clip}>
            <path d={toTop(CREST)} className={`animate-[wave-left_26s_linear_infinite] ${drift}`} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <rect x="0" y="0" width="1440" height="120" fill={fill} />
          <path d={toBottom(BACK)} fill="#38bdf8" fillOpacity="0.14" className={`animate-[wave-left_16s_linear_infinite] ${drift}`} />
          <path d={toBottom(MID)} fill="#7dd3fc" fillOpacity="0.22" className={`animate-[wave-right_11s_linear_infinite] ${drift}`} />
        </g>
        {/* Faint cyan line riding the crest */}
        <path
          d={CREST}
          fill="none"
          stroke="#7dd3fc"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          className={`animate-[wave-left_26s_linear_infinite] ${drift}`}
        />
      </svg>
    </div>
  );
}

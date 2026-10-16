import { formatCm } from "../lib/format";
import type { Measurements } from "../types/api";

function span(value: number, ceiling: number, smallest: number, largest: number): number {
  const safe = Number.isFinite(value) ? value : 0.1;
  const clamped = Math.min(Math.max(safe, 0.1), ceiling);
  return smallest + ((clamped - 0.1) / (ceiling - 0.1)) * (largest - smallest);
}

function displayCm(value: number): string {
  return Number.isFinite(value) ? formatCm(value) : "—";
}

export function MeasurementSchematic({ values }: { values: Measurements }) {
  const sepalLength = span(values.sepal_length_cm, 8, 36, 92);
  const sepalWidth = span(values.sepal_width_cm, 5, 10, 28);
  const petalLength = span(values.petal_length_cm, 8, 16, 78);
  const petalWidth = span(values.petal_width_cm, 3, 4, 22);
  const sepalAngles = [40, 130, 220, 310];
  const petalAngles = [90, 210, 330];

  return (
    <figure>
      <svg viewBox="0 0 280 280" role="img" className="mx-auto h-72 w-full max-w-sm">
        <title>Schematic of the four entered measurements</title>
        <rect x="8" y="8" width="264" height="264" rx="18" fill="var(--sage)" />
        <g transform="translate(140 146)">
          {sepalAngles.map((angle) => (
            <ellipse
              key={`sepal-${angle}`}
              cx="0"
              cy={-sepalLength / 2}
              rx={sepalWidth}
              ry={sepalLength / 2}
              transform={`rotate(${angle})`}
              fill="var(--botanical)"
              opacity="0.35"
            />
          ))}
          {petalAngles.map((angle) => (
            <ellipse
              key={`petal-${angle}`}
              cx="0"
              cy={-petalLength / 2}
              rx={petalWidth}
              ry={petalLength / 2}
              transform={`rotate(${angle})`}
              fill="var(--terracotta)"
              opacity="0.82"
            />
          ))}
          <circle r="7" fill="var(--forest)" />
        </g>
      </svg>
      <figcaption className="mt-3 text-sm leading-relaxed text-mute">
        Schematic encoding of the current measurements. Longer values stretch a blade, and wider values thicken it.
        This is not a botanical drawing.
      </figcaption>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md border border-line bg-paper px-3 py-2">
          <dt className="text-mute">Sepal length</dt>
          <dd className="font-medium">{displayCm(values.sepal_length_cm)}</dd>
        </div>
        <div className="rounded-md border border-line bg-paper px-3 py-2">
          <dt className="text-mute">Sepal width</dt>
          <dd className="font-medium">{displayCm(values.sepal_width_cm)}</dd>
        </div>
        <div className="rounded-md border border-line bg-paper px-3 py-2">
          <dt className="text-mute">Petal length</dt>
          <dd className="font-medium">{displayCm(values.petal_length_cm)}</dd>
        </div>
        <div className="rounded-md border border-line bg-paper px-3 py-2">
          <dt className="text-mute">Petal width</dt>
          <dd className="font-medium">{displayCm(values.petal_width_cm)}</dd>
        </div>
      </dl>
    </figure>
  );
}

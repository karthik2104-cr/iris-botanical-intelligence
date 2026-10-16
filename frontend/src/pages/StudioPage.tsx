import { useId, useRef, useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MeasurementSchematic } from "../components/MeasurementSchematic";
import { PageHeader, StatusPanel } from "../components/ui";
import { useAnalytics } from "../hooks/AnalyticsProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { useChartTheme } from "../hooks/useTheme";
import { formatCm, formatPercent } from "../lib/format";
import { rememberPrediction } from "../lib/history";
import { shortSpecies, speciesColor } from "../lib/species";
import { sliderRange } from "../lib/speciesStats";
import { MEASUREMENT_FIELDS, PRESETS, validateMeasurements } from "../lib/validation";
import { ApiError, predictFlower } from "../services/api";
import type { MeasurementKey, Measurements, Prediction } from "../types/api";

export function StudioPage() {
  usePageTitle("Classification Studio");
  const formId = useId();
  const chart = useChartTheme();
  const { data } = useAnalytics();
  const requestId = useRef(0);
  const [values, setValues] = useState<Measurements>(PRESETS[0].values);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: MeasurementKey, raw: string) {
    const next = raw === "" ? Number.NaN : Number(raw);
    setValues((current) => ({ ...current, [key]: next }));
  }

  async function onSubmit() {
    const message = validateMeasurements(values);
    const current = ++requestId.current;
    if (message) {
      setLoading(false);
      setError(message);
      setPrediction(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await predictFlower(values);
      if (current !== requestId.current) return;
      setPrediction(result);
      rememberPrediction(result);
    } catch (caught) {
      if (current !== requestId.current) return;
      setPrediction(null);
      setError(caught instanceof ApiError ? caught.message : "The prediction could not be completed.");
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }

  function reset() {
    requestId.current += 1;
    setValues(PRESETS[0].values);
    setPrediction(null);
    setError(null);
    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Classification Studio"
        title="Measure, then classify"
        description="The left controls set the four measurements. The center drawing only encodes those numbers. The result on the right comes from the saved model."
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(16rem,0.8fr)_minmax(0,1fr)]">
        <form
          className="panel p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <div className="space-y-5">
            {MEASUREMENT_FIELDS.map((field) => {
              const range = sliderRange(field.key, data?.dataset.feature_profiles);
              const value = values[field.key];
              const sliderValue = Number.isFinite(value) ? Math.min(range.max, Math.max(range.min, value)) : range.min;
              return (
                <div key={field.key}>
                  <div className="flex items-end justify-between gap-3">
                    <label htmlFor={`${formId}-${field.key}`} className="text-sm font-medium">
                      {field.label}
                      <span className="mt-0.5 block text-xs font-normal text-mute">{field.hint} · cm</span>
                    </label>
                    <input
                      id={`${formId}-${field.key}`}
                      className="field w-24 text-right"
                      type="number"
                      inputMode="decimal"
                      min={0.1}
                      max={30}
                      step={0.1}
                      value={Number.isFinite(value) ? value : ""}
                      aria-describedby={`${formId}-${field.key}-value`}
                      onChange={(event) => update(field.key, event.target.value)}
                    />
                  </div>
                  <input
                    className="mt-3 w-full"
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={0.1}
                    value={sliderValue}
                    aria-label={`${field.label} slider`}
                    aria-valuemin={range.min}
                    aria-valuemax={range.max}
                    aria-valuenow={Number.isFinite(value) ? value : undefined}
                    aria-valuetext={Number.isFinite(value) ? `${value.toFixed(1)} centimeters` : "empty"}
                    onChange={(event) => update(field.key, event.target.value)}
                  />
                  <p id={`${formId}-${field.key}-value`} className="mt-1 text-xs text-mute">
                    {Number.isFinite(value) ? formatCm(value) : "Enter a measurement."}
                    {Number.isFinite(value) && (value < range.min || value > range.max)
                      ? " The number is outside the slider span. The number field still controls the request."
                      : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className="primary-button" disabled={loading} aria-busy={loading}>
              {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : null}
              {loading ? "Classifying" : "Classify a Flower"}
            </button>
            <button type="button" className="quiet-button" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="mt-6">
            <h2 className="text-sm font-semibold">Example presets</h2>
            <p className="mt-1 text-sm text-mute">
              Illustrative measurements from the published table. They are not guaranteed classifications.
            </p>
            <div className="mt-3 grid gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="rounded-md border border-line bg-paper px-4 py-3 text-left transition hover:border-botanical"
                  onClick={() => {
                    setValues(preset.values);
                    setPrediction(null);
                    setError(null);
                  }}
                >
                  <span className="block text-sm font-semibold">{preset.title}</span>
                  <span className="mt-1 block text-xs text-mute">{preset.caption}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        <section className="panel p-5" aria-live="polite">
          <h2 className="font-serif text-2xl">Measurement sketch</h2>
          <div className="mt-4">
            <MeasurementSchematic values={values} />
          </div>
        </section>

        <section className="panel p-5" aria-live="polite">
          {loading ? <StatusPanel plain title="Classifying" message="The saved model is scoring these four measurements." /> : null}
          {!loading && !prediction && !error ? (
            <StatusPanel
              plain
              title="No classification yet"
              message="Set the measurements and choose Classify a Flower. Probabilities are model estimates, not certainty."
            />
          ) : null}
          {!loading && error ? <StatusPanel plain title="Prediction unavailable" message={error} /> : null}
          {!loading && prediction ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanical">Predicted species</p>
              <h2 className="mt-2 font-serif text-4xl tracking-tight">{prediction.predicted_species}</h2>
              <p className="mt-2 text-sm text-mute">
                Highest estimate {formatPercent(prediction.highest_probability)}. These probabilities rank the three
                species. They are not guaranteed certainty.
              </p>
              <p className="mt-4 text-sm leading-relaxed">{prediction.summary}</p>
              <div className="mt-5 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prediction.probabilities} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid stroke={chart.grid} horizontal={false} />
                    <XAxis type="number" domain={[0, 1]} tick={{ fill: chart.axis, fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="species"
                      width={96}
                      tickFormatter={shortSpecies}
                      tick={{ fill: chart.axis, fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [formatPercent(Number(value)), "Estimated probability"]}
                      contentStyle={{
                        background: chart.tooltipBg,
                        border: `1px solid ${chart.tooltipBorder}`,
                        borderRadius: 8,
                        color: chart.ink,
                      }}
                    />
                    <Bar dataKey="probability" radius={[0, 6, 6, 0]}>
                      {prediction.probabilities.map((item) => (
                        <Cell key={item.species} fill={speciesColor(item.species)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <h3 className="mt-4 text-sm font-semibold">Measurements sent</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {MEASUREMENT_FIELDS.map((field) => (
                  <div key={field.key} className="rounded-md border border-line px-3 py-2">
                    <dt className="text-mute">{field.label}</dt>
                    <dd className="font-medium">{formatCm(prediction.measurements[field.key])}</dd>
                  </div>
                ))}
              </dl>
              {prediction.centroid_comparison ? (
                <div className="sage-panel mt-4 p-4 text-sm leading-relaxed">
                  <p className="font-semibold">Nearest training-set average: {prediction.centroid_comparison.nearest_species}</p>
                  <ul className="mt-2 space-y-1 text-mute">
                    {prediction.centroid_comparison.distances.map((item) => (
                      <li key={item.species}>
                        {item.species}: {formatCm(item.distance)} away
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">{prediction.centroid_comparison.note}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

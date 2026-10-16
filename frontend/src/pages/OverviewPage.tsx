import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { SpeciesLegend } from "../components/SpeciesLegend";
import { MetricCard, RetryButton, StatusPanel } from "../components/ui";
import { useAnalytics } from "../hooks/AnalyticsProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { useChartTheme } from "../hooks/useTheme";
import { chartModelName, formatCm, formatPercent, formatScore } from "../lib/format";
import { readPredictionHistory, subscribePredictionHistory, type StoredPrediction } from "../lib/history";
import { shortSpecies, speciesColor } from "../lib/species";
import { observeSpecies, type SpeciesObservation } from "../lib/speciesStats";

function petalPlace(species: SpeciesObservation, all: SpeciesObservation[]): string {
  const ordered = [...all].sort(
    (left, right) => left.features.petal_length_cm.mean - right.features.petal_length_cm.mean,
  );
  const rank = ordered.findIndex((item) => item.species === species.species);
  if (rank === 0) return "the shortest mean petal length in this table";
  if (rank === ordered.length - 1) return "the longest mean petal length in this table";
  return "an intermediate mean petal length in this table";
}

function SpeciesMark({ species, petalMean }: { species: string; petalMean: number }) {
  const height = 14 + Math.min(petalMean, 7) * 4;
  const color = speciesColor(species);
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 shrink-0" aria-hidden="true">
      <ellipse cx="36" cy="40" rx="7" ry={height} fill={color} opacity="0.9" />
      <ellipse cx="36" cy="40" rx="7" ry={height} transform="rotate(55 36 40)" fill={color} opacity="0.45" />
      <ellipse cx="36" cy="40" rx="7" ry={height} transform="rotate(-55 36 40)" fill={color} opacity="0.45" />
      <circle cx="36" cy="40" r="3.5" fill="var(--forest)" />
    </svg>
  );
}

export function OverviewPage() {
  usePageTitle("Overview");
  const { data, loading, error, reload } = useAnalytics();
  const chart = useChartTheme();
  const [history, setHistory] = useState<StoredPrediction[]>(() => readPredictionHistory());

  useEffect(() => subscribePredictionHistory(() => setHistory(readPredictionHistory())), []);

  if (loading && !data) {
    return <StatusPanel title="Loading the study" message="Fetching the Iris table and the saved evaluation." />;
  }
  if (error || !data) {
    return (
      <StatusPanel
        title="API unavailable"
        message={error ?? "The study results could not be loaded."}
        action={<RetryButton onClick={() => void reload()} />}
      />
    );
  }

  const evaluation = data.evaluation;
  const observations = observeSpecies(data.dataset.records, data.class_names);
  const selected = evaluation.comparison.find((row) => row.selected);
  const scatter = data.class_names.map((species) => ({
    species,
    points: data.dataset.records
      .filter((record) => record.species === species)
      .map((record) => ({
        x: record.petal_length_cm,
        y: record.petal_width_cm,
        species,
      })),
  }));
  const comparison = evaluation.comparison.map((row) => ({
    ...row,
    label: chartModelName(row.name),
  }));

  return (
    <div className="space-y-8">
      <header className="grid items-end gap-6 lg:grid-cols-[minmax(0,1.4fr)_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-botanical">Botanical Intelligence</p>
          <h1 className="mt-2 max-w-3xl font-serif text-5xl tracking-tight text-ink md:text-6xl">
            Explore the Iris Spectrum
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-mute">
            Understand flower measurements, explore species, and evaluate a machine learning classifier.
          </p>
        </div>
        <Link to="/studio" className="primary-button px-5 py-3">
          Classify a Flower
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Dataset samples" value={String(data.dataset.rows)} detail={data.dataset.source} />
        <MetricCard label="Species" value={String(data.dataset.class_count)} detail={data.class_names.join(", ")} />
        <MetricCard label="Input features" value={String(data.dataset.feature_count)} detail="Sepal and petal measurements, cm" />
        <MetricCard
          label="Held-out accuracy"
          value={formatScore(evaluation.test_metrics.accuracy)}
          detail={`${evaluation.test_metrics.samples} flowers scored after model selection`}
        />
      </section>
      <p className="text-sm text-mute">
        {data.dataset.missing_total} missing values. {data.dataset.duplicate_note}
      </p>

      <section className="grid gap-4 lg:grid-cols-3">
        {observations.map((species) => (
          <article key={species.species} className="panel flex gap-4 p-5">
            <SpeciesMark species={species.species} petalMean={species.features.petal_length_cm.mean} />
            <div className="min-w-0">
              <h2 className="font-serif text-2xl">{species.species}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mute">
                {species.count} flowers. This class has {petalPlace(species, observations)}.
              </p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Petal length</dt>
                  <dd>{formatCm(species.features.petal_length_cm.mean)} mean</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Petal width</dt>
                  <dd>{formatCm(species.features.petal_width_cm.mean)} mean</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Sepal length</dt>
                  <dd>{formatCm(species.features.sepal_length_cm.mean)} mean</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="sage-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-botanical">Held-out test</p>
          <h2 className="mt-2 font-serif text-3xl">{evaluation.selected_model_name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            Cross-validation on the training set selected this model
            {selected ? ` with mean macro-F1 ${formatScore(selected.cv_macro_f1_mean)}` : ""}. The held-out test was
            scored once afterward and was not used to choose the winner.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-mute">Test accuracy</dt>
              <dd className="font-serif text-2xl">{formatScore(evaluation.test_metrics.accuracy)}</dd>
            </div>
            <div>
              <dt className="text-mute">Test macro-F1</dt>
              <dd className="font-serif text-2xl">{formatScore(evaluation.test_metrics.f1_macro)}</dd>
            </div>
          </dl>
          <Link to="/observatory" className="quiet-button mt-5">
            Open the Model Observatory
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">Cross-validation comparison</h2>
          <p className="mt-1 text-sm text-mute">Mean macro-F1 on the training split. The terracotta bar is the selected model.</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke={chart.grid} horizontal={false} />
                <XAxis type="number" domain={[0, 1]} tick={{ fill: chart.axis, fontSize: 12 }} />
                <YAxis type="category" dataKey="label" width={132} tick={{ fill: chart.axis, fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [formatScore(Number(value)), "CV macro-F1"]}
                  contentStyle={{
                    background: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    borderRadius: 8,
                    color: chart.ink,
                  }}
                />
                <Bar dataKey="cv_macro_f1_mean" radius={[0, 6, 6, 0]}>
                  {comparison.map((row) => (
                    <Cell key={row.key} fill={row.selected ? chart.highlight : chart.accent} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">Petal length and petal width</h2>
          <p className="mt-1 text-sm text-mute">Each point is one flower in the published Iris table.</p>
          <div className="mt-3">
            <SpeciesLegend names={data.class_names} />
          </div>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 28, left: 8 }}>
                <CartesianGrid stroke={chart.grid} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Petal length"
                  unit=" cm"
                  tick={{ fill: chart.axis, fontSize: 12 }}
                  label={{ value: "Petal length (cm)", position: "bottom", offset: 8, fill: chart.axis, fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Petal width"
                  unit=" cm"
                  tick={{ fill: chart.axis, fontSize: 12 }}
                  width={48}
                />
                <ZAxis range={[48, 48]} />
                <Tooltip
                  formatter={(value, name) => [`${Number(value).toFixed(2)} cm`, name]}
                  contentStyle={{
                    background: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    borderRadius: 8,
                    color: chart.ink,
                  }}
                />
                {scatter.map((series) => (
                  <Scatter key={series.species} name={series.species} data={series.points} fill={speciesColor(series.species)} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-mute">Vertical axis: petal width (cm)</p>
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">Recent predictions</h2>
          <p className="mt-1 text-sm text-mute">Saved in this browser after a successful classification. Nothing here is invented.</p>
          {history.length === 0 ? (
            <p className="mt-6 text-sm leading-relaxed text-mute">No flowers have been classified in this browser yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {history.map((item) => (
                <li key={item.id} className="rounded-md border border-line px-3 py-2 text-sm">
                  <p className="font-medium">{item.predicted_species}</p>
                  <p className="text-mute">
                    {formatPercent(item.highest_probability)} · {shortSpecies(item.predicted_species)} petal{" "}
                    {formatCm(item.measurements.petal_length_cm)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>
    </div>
  );
}

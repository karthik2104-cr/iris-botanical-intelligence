import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { PageHeader, RetryButton, StatusPanel } from "../components/ui";
import { SpeciesLegend } from "../components/SpeciesLegend";
import { useAnalytics } from "../hooks/AnalyticsProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { useChartTheme } from "../hooks/useTheme";
import { formatCm, formatNumber } from "../lib/format";
import { speciesColor } from "../lib/species";
import { observeSpecies } from "../lib/speciesStats";
import { buildHistogram, correlationColor, filterRecords } from "../lib/stats";
import { MEASUREMENT_FIELDS } from "../lib/validation";
import type { MeasurementKey } from "../types/api";

const PAGE_SIZE = 8;

export function AtlasPage() {
  usePageTitle("Species Atlas");
  const { data, loading, error, reload } = useAnalytics();
  const chart = useChartTheme();
  const [species, setSpecies] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [feature, setFeature] = useState<MeasurementKey>("petal_length_cm");
  const [xKey, setXKey] = useState<MeasurementKey>("petal_length_cm");
  const [yKey, setYKey] = useState<MeasurementKey>("petal_width_cm");

  const filtered = useMemo(
    () => (data ? filterRecords(data.dataset.records, species, query) : []),
    [data, query, species],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (loading && !data) {
    return <StatusPanel title="Loading the atlas" message="Fetching the Iris measurements and species statistics." />;
  }
  if (error || !data) {
    return (
      <StatusPanel
        title="API unavailable"
        message={error ?? "The dataset could not be loaded."}
        action={<RetryButton onClick={() => void reload()} />}
      />
    );
  }

  const observations = observeSpecies(data.dataset.records, data.class_names);
  const histogram = buildHistogram(filtered, feature);
  const scatter = data.class_names
    .filter((name) => species === "all" || name === species)
    .map((name) => ({
      name,
      points: filtered
        .filter((record) => record.species === name)
        .map((record) => ({ x: record[xKey], y: record[yKey], species: name })),
    }));
  const xLabel = MEASUREMENT_FIELDS.find((field) => field.key === xKey)?.label ?? "Horizontal";
  const yLabel = MEASUREMENT_FIELDS.find((field) => field.key === yKey)?.label ?? "Vertical";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Species Atlas"
        title="Three species, one table"
        description="Ranges below are observations from the Iris dataset. They are not universal biological limits."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {observations.map((item) => (
          <article
            key={item.species}
            className={`panel p-5 ${species !== "all" && species !== item.species ? "opacity-55" : ""}`}
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-mute">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: speciesColor(item.species) }} />
              {item.count} flowers
            </p>
            <h2 className="mt-2 font-serif text-2xl">{item.species}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {MEASUREMENT_FIELDS.map((field) => {
                const range = item.features[field.key];
                return (
                  <div key={field.key}>
                    <dt className="text-mute">{field.label}</dt>
                    <dd>
                      {formatNumber(range.min)}–{formatNumber(range.max)} cm · mean {formatCm(range.mean)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-serif text-2xl">Compare the measurements</h2>
            <p className="mt-1 text-sm text-mute">The filter updates the distribution, the scatter plot, and the table.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Species
              <select
                className="field mt-1"
                value={species}
                onChange={(event) => {
                  setSpecies(event.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All species</option>
                {data.class_names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Search
              <input
                className="field mt-1"
                value={query}
                placeholder="Species or measurement"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
              />
            </label>
          </div>
        </div>
        <p className="mt-3 text-sm text-mute">
          Showing {filtered.length === 0 ? "0" : `${safePage * PAGE_SIZE + 1}–${safePage * PAGE_SIZE + visible.length}`} of{" "}
          {filtered.length}
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-serif text-2xl">Distribution</h2>
            <label className="text-sm">
              Measurement
              <select className="field mt-1" value={feature} onChange={(event) => setFeature(event.target.value as MeasurementKey)}>
                {MEASUREMENT_FIELDS.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <SpeciesLegend names={histogram.species} />
          <div className="mt-4 h-72">
            {histogram.bins.length === 0 ? (
              <p className="text-sm text-mute">No flowers match this filter.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogram.bins}>
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: chart.axis, fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(_, payload) => String(payload?.[0]?.payload?.range ?? "")}
                    contentStyle={{
                      background: chart.tooltipBg,
                      border: `1px solid ${chart.tooltipBorder}`,
                      borderRadius: 8,
                      color: chart.ink,
                    }}
                  />
                  {histogram.species.map((name) => (
                    <Bar key={name} dataKey={name} stackId="species" fill={speciesColor(name)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">Relationship</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="text-sm">
              Horizontal axis
              <select className="field mt-1" value={xKey} onChange={(event) => setXKey(event.target.value as MeasurementKey)}>
                {MEASUREMENT_FIELDS.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Vertical axis
              <select className="field mt-1" value={yKey} onChange={(event) => setYKey(event.target.value as MeasurementKey)}>
                {MEASUREMENT_FIELDS.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 h-72">
            {filtered.length === 0 ? (
              <p className="text-sm text-mute">No flowers match this filter.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, bottom: 16, left: 0 }}>
                  <CartesianGrid stroke={chart.grid} />
                  <XAxis type="number" dataKey="x" name={xLabel} unit=" cm" tick={{ fill: chart.axis, fontSize: 12 }} />
                  <YAxis type="number" dataKey="y" name={yLabel} unit=" cm" tick={{ fill: chart.axis, fontSize: 12 }} />
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
                    <Scatter key={series.name} name={series.name} data={series.points} fill={speciesColor(series.name)} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Correlation</h2>
        <p className="mt-1 text-sm text-mute">
          Pearson correlation of all {data.dataset.rows} flowers. The species filter does not recompute this matrix.
          A value near 1 means the measurements rise together in this table. It is not a causal link.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[32rem] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th />
                {data.dataset.correlation.features.map((featureName) => (
                  <th key={featureName} className="px-2 text-center text-xs font-medium text-mute">
                    {featureName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.dataset.correlation.matrix.map((row, rowIndex) => (
                <tr key={data.dataset.correlation.features[rowIndex]}>
                  <th className="pr-2 text-left text-xs font-medium text-mute">
                    {data.dataset.correlation.features[rowIndex]}
                  </th>
                  {row.map((value, columnIndex) => (
                    <td key={`${rowIndex}-${columnIndex}`} className="p-0">
                      <div
                        className="flex h-14 items-center justify-center rounded-md border border-line"
                        style={{ background: correlationColor(value) }}
                        title={`${data.dataset.correlation.features[rowIndex]} and ${data.dataset.correlation.features[columnIndex]}: ${value.toFixed(3)}`}
                      >
                        {value.toFixed(2)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-serif text-2xl">Records</h2>
          <p className="text-sm text-mute">
            Page {safePage + 1} of {pageCount}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-mute">
              <tr>
                {MEASUREMENT_FIELDS.map((field) => (
                  <th key={field.key} className="px-5 py-2 font-medium">
                    {field.label}
                  </th>
                ))}
                <th className="px-5 py-2 font-medium">Species</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((record, index) => (
                <tr key={`${record.species}-${index}-${record.sepal_length_cm}`} className="border-t border-line">
                  <td className="px-5 py-2">{formatNumber(record.sepal_length_cm, 1)}</td>
                  <td className="px-5 py-2">{formatNumber(record.sepal_width_cm, 1)}</td>
                  <td className="px-5 py-2">{formatNumber(record.petal_length_cm, 1)}</td>
                  <td className="px-5 py-2">{formatNumber(record.petal_width_cm, 1)}</td>
                  <td className="px-5 py-2">{record.species}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between px-5 py-4">
          <button type="button" className="quiet-button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            Previous
          </button>
          <button
            type="button"
            className="quiet-button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

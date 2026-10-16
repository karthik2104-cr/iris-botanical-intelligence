import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ConfusionMatrix } from "../components/ConfusionMatrix";
import { MetricCard, PageHeader, RetryButton, StatusPanel } from "../components/ui";
import { useAnalytics } from "../hooks/AnalyticsProvider";
import { usePageTitle } from "../hooks/usePageTitle";
import { useChartTheme } from "../hooks/useTheme";
import { chartModelName, formatDuration, formatScore, formatSignedScore } from "../lib/format";
import { ApiError, getModelInfo } from "../services/api";
import type { ModelInfo } from "../types/api";

type MetricKey = "f1" | "accuracy";

export function ObservatoryPage() {
  usePageTitle("Model Observatory");
  const { data, loading, error, reload } = useAnalytics();
  const chart = useChartTheme();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricKey>("f1");
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getModelInfo()
      .then((info) => {
        if (!active) return;
        setModelInfo(info);
        setModelError(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setModelInfo(null);
        setModelError(caught instanceof ApiError ? caught.message : "Model information could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading && !data) {
    return <StatusPanel title="Loading the observatory" message="Fetching cross-validation and held-out test results." />;
  }
  if (error || !data) {
    return (
      <StatusPanel
        title="API unavailable"
        message={error ?? "Evaluation results could not be loaded."}
        action={<RetryButton onClick={() => void reload()} />}
      />
    );
  }

  const evaluation = data.evaluation;
  const active =
    evaluation.comparison.find((row) => row.key === (activeKey ?? evaluation.selected_model_key)) ??
    evaluation.comparison[0];
  const scoreKey = metric === "f1" ? "cv_macro_f1_mean" : "cv_accuracy_mean";
  const scoreLabel = metric === "f1" ? "CV macro-F1" : "CV accuracy";
  const folds = (metric === "f1" ? active.cv_macro_f1_folds : active.cv_accuracy_folds).map((score, index) => ({
    fold: `Fold ${index + 1}`,
    score,
  }));
  const report = evaluation.classification_report;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Model Observatory"
        title="What the comparison decided"
        description="Training scores describe flowers the model has already seen. Cross-validation chooses the model. The held-out test is scored once after that choice."
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="sage-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-botanical">Selected model</p>
          <h2 className="mt-2 font-serif text-3xl">{modelInfo?.model_name ?? evaluation.selected_model_name}</h2>
          <p className="mt-3 text-sm leading-relaxed">{modelInfo?.selection_rule ?? evaluation.selection_rule}</p>
          <p className="mt-3 text-sm text-mute">{modelInfo?.hyperparameters ?? evaluation.selected_model_hyperparameters}</p>
          {modelError ? <p className="mt-3 text-sm text-terracotta">{modelError}</p> : null}
        </article>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="panel p-4 text-sm">
            <h3 className="font-semibold">Training</h3>
            <p className="mt-2 text-mute">
              Accuracy {formatScore(evaluation.training_metrics.accuracy)} and macro-F1{" "}
              {formatScore(evaluation.training_metrics.f1_macro)} on {evaluation.training_metrics.samples} flowers the
              model has seen. {evaluation.training_metrics.note}
            </p>
          </article>
          <article className="panel p-4 text-sm">
            <h3 className="font-semibold">Cross-validation</h3>
            <p className="mt-2 text-mute">
              {evaluation.selected_model_name} mean macro-F1{" "}
              {formatScore(evaluation.comparison.find((row) => row.selected)?.cv_macro_f1_mean ?? 0)} across{" "}
              {data.cv_folds} stratified folds. This comparison selected the model.
            </p>
          </article>
          <article className="panel p-4 text-sm sm:col-span-2">
            <h3 className="font-semibold">Held-out test</h3>
            <p className="mt-2 text-mute">
              Accuracy {formatScore(evaluation.test_metrics.accuracy)} and macro-F1{" "}
              {formatScore(evaluation.test_metrics.f1_macro)} on {evaluation.test_metrics.samples} flowers.{" "}
              {evaluation.generalization_gap.note} Accuracy gap {formatSignedScore(evaluation.generalization_gap.accuracy)}.
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Test accuracy" value={formatScore(evaluation.test_metrics.accuracy)} detail={evaluation.selected_model_name} />
        <MetricCard label="Test macro-F1" value={formatScore(evaluation.test_metrics.f1_macro)} detail={`${evaluation.test_metrics.samples} test flowers`} />
        <MetricCard label="Test precision" value={formatScore(evaluation.test_metrics.precision_macro)} detail="Macro average" />
        <MetricCard label="Test recall" value={formatScore(evaluation.test_metrics.recall_macro)} detail="Macro average" />
      </section>

      <section className="panel p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="font-serif text-2xl">Model comparison</h2>
            <p className="mt-1 max-w-2xl text-sm text-mute">
              Bars show training-set cross-validation. The terracotta bar is the model open below. Test metrics stay
              with the selected model.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chart metric">
            {(
              [
                ["f1", "Macro-F1"],
                ["accuracy", "Accuracy"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={metric === key ? "primary-button" : "quiet-button"}
                aria-pressed={metric === key}
                onClick={() => setMetric(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Models">
          {evaluation.comparison.map((row) => (
            <button
              key={row.key}
              type="button"
              className={row.key === active.key ? "primary-button" : "quiet-button"}
              aria-pressed={row.key === active.key}
              onClick={() => setActiveKey(row.key)}
            >
              {row.name}
              {row.selected ? " · selected" : ""}
            </button>
          ))}
        </div>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={evaluation.comparison.map((row) => ({ ...row, label: chartModelName(row.name) }))}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid stroke={chart.grid} horizontal={false} />
              <XAxis type="number" domain={[0, 1]} tick={{ fill: chart.axis, fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={132} tick={{ fill: chart.axis, fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [formatScore(Number(value)), scoreLabel]}
                contentStyle={{
                  background: chart.tooltipBg,
                  border: `1px solid ${chart.tooltipBorder}`,
                  borderRadius: 8,
                  color: chart.ink,
                }}
              />
              <Bar
                dataKey={scoreKey}
                radius={[0, 6, 6, 0]}
                onClick={(item) => {
                  const payload = item as { key?: string; payload?: { key?: string } };
                  const key = payload.key ?? payload.payload?.key;
                  if (typeof key === "string") setActiveKey(key);
                }}
              >
                {evaluation.comparison.map((row) => (
                  <Cell key={row.key} fill={row.key === active.key ? chart.highlight : chart.accent} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">{active.name}</h3>
            <p className="mt-1 text-sm text-mute">{active.hyperparameters}</p>
            <p className="mt-2 text-sm">
              Mean {scoreLabel} {formatScore(active[scoreKey])} ±{" "}
              {formatScore(metric === "f1" ? active.cv_macro_f1_std : active.cv_accuracy_std)}
            </p>
            <p className="mt-2 text-sm text-mute">
              {active.selected
                ? "This is the selected model, so its held-out scores are reported below."
                : "Held-out test scores are intentionally not shown for models that were not selected."}
            </p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={folds}>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis dataKey="fold" tick={{ fill: chart.axis, fontSize: 12 }} />
                <YAxis domain={[0, 1]} tick={{ fill: chart.axis, fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [formatScore(Number(value)), scoreLabel]}
                  contentStyle={{
                    background: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    borderRadius: 8,
                    color: chart.ink,
                  }}
                />
                <Bar dataKey="score" fill={chart.accent} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">Confusion matrix</h2>
          <p className="mt-1 text-sm text-mute">
            {evaluation.selected_model_name} on {evaluation.test_metrics.samples} test flowers.
          </p>
          <div className="mt-4">
            <ConfusionMatrix matrix={evaluation.confusion_matrix} labels={evaluation.class_names} />
          </div>
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">Classification report</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="py-2 font-medium">Species</th>
                  <th className="py-2 font-medium">Precision</th>
                  <th className="py-2 font-medium">Recall</th>
                  <th className="py-2 font-medium">F1</th>
                  <th className="py-2 font-medium">Support</th>
                </tr>
              </thead>
              <tbody>
                {report.classes.map((row) => (
                  <tr key={row.name} className="border-t border-line">
                    <th className="py-3 text-left font-medium">{row.name}</th>
                    <td>{formatScore(row.precision)}</td>
                    <td>{formatScore(row.recall)}</td>
                    <td>{formatScore(row.f1)}</td>
                    <td>{row.support}</td>
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <th className="py-3 text-left">Macro average</th>
                  <td>{formatScore(report.macro_avg.precision)}</td>
                  <td>{formatScore(report.macro_avg.recall)}</td>
                  <td>{formatScore(report.macro_avg.f1)}</td>
                  <td>{report.macro_avg.support}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Feature importance</h2>
        <p className="mt-1 text-sm text-mute">{evaluation.feature_importance.score_label}</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...evaluation.feature_importance.features].reverse()} layout="vertical" margin={{ left: 16, right: 12 }}>
              <CartesianGrid stroke={chart.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: chart.axis, fontSize: 12 }} />
              <YAxis type="category" dataKey="feature" width={110} tick={{ fill: chart.axis, fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [formatScore(Number(value), 4), evaluation.feature_importance.score_label]}
                contentStyle={{
                  background: chart.tooltipBg,
                  border: `1px solid ${chart.tooltipBorder}`,
                  borderRadius: 8,
                  color: chart.ink,
                }}
              />
              <Bar dataKey="importance" fill={chart.highlight} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-sm leading-relaxed">{evaluation.feature_importance.narrative}</p>
        <p className="mt-2 text-sm leading-relaxed text-mute">{evaluation.feature_importance.note}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-mute">Selected model fit</dt>
            <dd>{formatDuration(evaluation.timings.selected_model_fit_seconds)}</dd>
          </div>
          <div>
            <dt className="text-mute">Cross-validation</dt>
            <dd>{formatDuration(evaluation.timings.selected_model_cross_validation_seconds)}</dd>
          </div>
          <div>
            <dt className="text-mute">Test inference</dt>
            <dd>{formatDuration(evaluation.timings.test_inference_seconds)}</dd>
          </div>
          <div>
            <dt className="text-mute">Per flower</dt>
            <dd>{formatDuration(evaluation.timings.test_inference_per_sample_seconds)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

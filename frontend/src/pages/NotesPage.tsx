import { PageHeader, RetryButton } from "../components/ui";
import { GLOSSARY, LOCAL_LIMITATIONS, PIPELINE_STAGES } from "../content/learn";
import { useAnalytics } from "../hooks/AnalyticsProvider";
import { usePageTitle } from "../hooks/usePageTitle";

const TOPICS = [
  {
    id: "load",
    title: "How the dataset is loaded",
    stageId: "load",
  },
  {
    id: "preprocess",
    title: "How preprocessing works",
    stageId: "preprocess",
  },
  {
    id: "split",
    title: "How stratified splitting works",
    stageId: "split",
  },
  {
    id: "cv",
    title: "Why cross-validation is used",
    stageId: "select",
  },
  {
    id: "select",
    title: "How the model is selected",
    stageId: "select",
  },
  {
    id: "predict",
    title: "How a prediction is generated",
    stageId: "predict",
  },
] as const;

export function NotesPage() {
  usePageTitle("Experiment Notes");
  const { data, error, reload } = useAnalytics();
  const stages = data?.pipeline_stages ?? PIPELINE_STAGES;
  const limitations = data?.limitations ?? LOCAL_LIMITATIONS;

  function stage(id: string) {
    return stages.find((item) => item.id === id);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Experiment Notes"
        title="How a measurement becomes a species"
        description="Each step says what happens, why it is there, and which library does the work. Scores on the other pages come from the saved training run."
      />

      {error ? (
        <section className="sage-panel p-4 text-sm" role="status">
          <p>{error}</p>
          <p className="mt-2 text-mute">
            The notes below still describe the pipeline. Live training details are unavailable until the API responds.
          </p>
          <div className="mt-3">
            <RetryButton onClick={() => void reload()} />
          </div>
        </section>
      ) : null}

      {data ? (
        <section className="panel p-5">
          <h2 className="font-serif text-2xl">This training run</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-mute">Selected model</dt>
              <dd className="font-medium">{data.evaluation.selected_model_name}</dd>
            </div>
            <div>
              <dt className="text-mute">Random seed</dt>
              <dd className="font-medium">{data.seed}</dd>
            </div>
            <div>
              <dt className="text-mute">Split</dt>
              <dd className="font-medium">
                {data.split.train_count} train / {data.split.test_count} test
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      <ol className="panel divide-y divide-line px-5">
        {TOPICS.map((topic, index) => {
          const details = stage(topic.stageId);
          return (
            <li key={topic.id}>
              <details className="group py-1" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-4 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-sm text-ivory">
                    {index + 1}
                  </span>
                  <span className="font-serif text-xl">{topic.title}</span>
                </summary>
                <div className="space-y-2 pb-4 pl-12 text-sm leading-relaxed">
                  <p>{details?.what}</p>
                  <p className="text-mute">{details?.why}</p>
                  {topic.id === "select" && data ? <p>{data.evaluation.selection_rule}</p> : null}
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-botanical">{details?.library}</p>
                </div>
              </details>
            </li>
          );
        })}
        <li>
          <details className="group py-1">
            <summary className="flex cursor-pointer list-none items-center gap-4 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-sm text-ivory">
                7
              </span>
              <span className="font-serif text-xl">How to interpret class probabilities</span>
            </summary>
            <div className="space-y-2 pb-4 pl-12 text-sm leading-relaxed">
              <p>
                A predicted probability is the model&apos;s score for one species, between 0 and 1. For the six
                classifiers in this project, the three scores sum to about 1.
              </p>
              <p className="text-mute">
                A score of 0.90 means the model assigns most of its confidence to that species for the measurements you
                entered. It is not botanical certainty, and it is not a frequency observed in nature.
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-botanical">
                scikit-learn predict_proba, or calibrated SVM scores
              </p>
            </div>
          </details>
        </li>
        <li>
          <details className="group py-1">
            <summary className="flex cursor-pointer list-none items-center gap-4 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta text-sm text-ivory">
                8
              </span>
              <span className="font-serif text-xl">Limitations of this small dataset</span>
            </summary>
            <ul className="list-disc space-y-2 pb-4 pl-16 text-sm leading-relaxed text-mute">
              {limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </li>
      </ol>

      <section>
        <h2 className="font-serif text-3xl">Glossary</h2>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          {GLOSSARY.map((entry) => (
            <div key={entry.term} className="panel p-4">
              <dt className="font-semibold">{entry.term}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-mute">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

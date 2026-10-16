import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-botanical">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink md:text-5xl">{title}</h1>
        <p className="mt-3 text-base leading-relaxed text-mute">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">{label}</p>
      <p className="mt-3 font-serif text-3xl tracking-tight text-ink">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-relaxed text-mute">{detail}</p> : null}
    </article>
  );
}

export function StatusPanel({
  title,
  message,
  action,
  plain = false,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  plain?: boolean;
}) {
  return (
    <section className={plain ? "px-2 py-8 text-center" : "panel mx-auto max-w-xl p-8 text-center"} role="status">
      <h2 className="font-serif text-3xl text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-mute">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="primary-button" onClick={onClick}>
      Try again
    </button>
  );
}

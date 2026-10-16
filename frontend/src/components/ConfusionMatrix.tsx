export function ConfusionMatrix({
  matrix,
  labels,
}: {
  matrix: number[][];
  labels: string[];
}) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-2 text-sm">
        <caption className="sr-only">
          Confusion matrix with actual species in rows and predicted species in columns.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="px-2 text-left text-xs font-medium text-mute">
              Actual \ Predicted
            </th>
            {labels.map((label) => (
              <th key={label} scope="col" className="px-2 text-center text-xs font-medium text-mute">
                {label.replace("Iris ", "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => {
            const rowTotal = row.reduce((sum, count) => sum + count, 0);
            return (
              <tr key={labels[rowIndex]}>
                <th scope="row" className="pr-3 text-left text-xs font-medium text-mute">
                  {labels[rowIndex]}
                </th>
                {row.map((count, columnIndex) => {
                  const strength = Math.round(18 + (count / max) * 72);
                  const correct = rowIndex === columnIndex;
                  return (
                    <td key={`${labels[rowIndex]}-${labels[columnIndex]}`} className="p-0">
                      <div
                        className="flex min-h-16 flex-col items-center justify-center rounded-lg border border-line"
                        style={{
                          background: correct
                            ? `color-mix(in srgb, var(--botanical) ${strength}%, var(--sage))`
                            : `color-mix(in srgb, var(--terracotta) ${count === 0 ? 8 : strength}%, var(--sage))`,
                        }}
                      >
                        <span className="font-serif text-xl text-ink">{count}</span>
                        <span className="text-[11px] text-mute">
                          {rowTotal === 0 ? "0%" : `${Math.round((count / rowTotal) * 100)}%`}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

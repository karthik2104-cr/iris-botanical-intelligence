export function SpeciesLegend({ names }: { names: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-mute">
      {names.map((name) => (
        <li key={name} className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: name === "Iris setosa" ? "var(--setosa)" : name === "Iris versicolor" ? "var(--versicolor)" : "var(--virginica)" }}
          />
          {name}
        </li>
      ))}
    </ul>
  );
}

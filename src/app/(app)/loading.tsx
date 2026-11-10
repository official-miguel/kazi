/**
 * Shown the instant someone taps a tab, while the real screen loads.
 * The top bar and the tab bar stay in place; only this middle part changes.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-md bg-surface-sunken" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 md:p-5">
          <div className="h-5 w-24 animate-pulse rounded-pill bg-surface-sunken" />
          <div className="h-6 w-2/3 animate-pulse rounded-md bg-surface-sunken" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-surface-sunken" />
          <div className="h-4 w-1/3 animate-pulse rounded-md bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}

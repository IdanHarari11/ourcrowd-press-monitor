export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="h-5 w-48 rounded-sm bg-border" />
      </div>
      <div className="mx-auto max-w-[1440px] px-4 py-3">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 rounded-md border border-border bg-surface" />
          ))}
        </div>
        <div className="mt-3 h-48 rounded-md border border-border bg-surface" />
        <div className="mt-3 h-72 rounded-md border border-border bg-surface" />
      </div>
    </div>
  );
}

export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <main className="page tabPage">
      <h1>{title}</h1>
      <p style={{ color: 'var(--text-2)' }}>{note ?? 'Not designed yet.'}</p>
    </main>
  );
}

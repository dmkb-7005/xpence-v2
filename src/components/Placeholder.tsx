import { Link } from 'react-router-dom';

export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <main className="page">
      <p><Link to="/">&larr; Home</Link></p>
      <h1>{title}</h1>
      <p>{note ?? 'Not implemented yet.'}</p>
    </main>
  );
}

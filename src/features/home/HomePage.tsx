import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function HomePage() {
  return (
    <main className="page">
      <h1>{format(new Date(), 'MMMM dd')}</h1>
      <p>Scaffold only: totals, trend and backup status come in a later phase.</p>
      <Link className="btn" to="/expenses/new">Add new expense</Link>
      <Link className="btn" to="/expenses">View expenses</Link>
      <Link className="btn" to="/budgets">View budgets</Link>
      <Link className="btn" to="/income">Income</Link>
      <Link className="btn" to="/setup">Setup</Link>
    </main>
  );
}

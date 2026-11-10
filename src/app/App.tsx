import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../features/home/HomePage';
import { ExpenseFormPage } from '../features/expense-form/ExpenseFormPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { BudgetsPage } from '../features/budgets/BudgetsPage';
import { IncomePage } from '../features/income/IncomePage';
import { IncomeFormPage } from '../features/income/IncomeFormPage';
import { SetupPage } from '../features/setup/SetupPage';
import { SnackbarProvider } from '../components/Snackbar';
import { UpdateBanner } from './UpdateBanner';

// HashRouter: GitHub Pages has no SPA fallback, and the PWA shortcut uses ./#/expenses/new
export function App() {
  return (
    <HashRouter>
      <SnackbarProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/expenses/:id" element={<ExpenseFormPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/income/new" element={<IncomeFormPage />} />
        <Route path="/income/:id" element={<IncomeFormPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdateBanner />
      </SnackbarProvider>
    </HashRouter>
  );
}

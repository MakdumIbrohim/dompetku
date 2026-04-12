import FinanceApp from "./components/finance-app";

export const metadata = {
  title: "Dashboard - Dompetku",
};

export default function HomePage() {
  return <FinanceApp screen="dashboard" />;
}
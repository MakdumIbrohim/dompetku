// Halaman untuk rute /kelola
import FinanceApp from "../components/finance-app";

export const metadata = {
  title: "Kelola Data - Dompetku",
};

export default function KelolaPage() {
  return <FinanceApp screen="kelola" />;
}
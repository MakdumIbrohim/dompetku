"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Screen = "login" | "dashboard" | "histori";
type TransactionType = "income" | "expense";

type Transaction = {
  id: number;
  date: string;
  title: string;
  atas_nama: string;
  type: TransactionType;
  metode_pembayaran: string;
  amount: number;
  created_at: string;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const seedTransactions: Transaction[] = [
  {
    id: 1,
    date: "2026-04-12",
    title: "Gaji bulanan",
    atas_nama: "Brohim",
    type: "income",
    metode_pembayaran: "Transfer",
    amount: 8500000,
    created_at: "2026-04-12 08:00:00",
  },
  {
    id: 2,
    date: "2026-04-11",
    title: "Belanja dapur",
    atas_nama: "Brohim",
    type: "expense",
    metode_pembayaran: "Tunai",
    amount: 425000,
    created_at: "2026-04-11 10:30:00",
  },
  {
    id: 3,
    date: "2026-04-10",
    title: "Internet rumah",
    atas_nama: "Brohim",
    type: "expense",
    metode_pembayaran: "Transfer",
    amount: 315000,
    created_at: "2026-04-10 14:00:00",
  },
  {
    id: 4,
    date: "2026-04-09",
    title: "Proyek desain",
    atas_nama: "Client ABC",
    type: "income",
    metode_pembayaran: "Transfer",
    amount: 1400000,
    created_at: "2026-04-09 16:45:00",
  },
];

const expenseBreakdown = [
  { label: "Pemasukan", value: 64, color: "#059D00" },
  { label: "Pengeluaran", value: 36, color: "#D60042" },
];

const menuItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/histori", label: "Histori" },
  { href: "/login", label: "Logout" },
];

export default function FinanceApp({ screen }: { screen: Screen }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [formType, setFormType] = useState<TransactionType>("income");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === "undefined") {
      return seedTransactions;
    }

    const saved = window.localStorage.getItem("dompetku-transactions");
    return saved ? (JSON.parse(saved) as Transaction[]) : seedTransactions;
  });
  const [form, setForm] = useState({
    date: "2026-04-12",
    title: "",
    atas_nama: "",
    type: "income" as TransactionType,
    metode_pembayaran: "Tunai",
    amount: "",
  });

  useEffect(() => {
    window.localStorage.setItem(
      "dompetku-transactions",
      JSON.stringify(transactions),
    );
  }, [transactions]);

  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  function submitTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(form.amount);
    if (!form.title.trim() || !amount) {
      return;
    }

    setTransactions((items) => [
      {
        id: Date.now(),
        date: form.date,
        title: form.title,
        atas_nama: form.atas_nama,
        type: form.type,
        metode_pembayaran: form.metode_pembayaran,
        amount,
        created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      },
      ...items,
    ]);

    setForm({
      date: "2026-04-12",
      title: "",
      atas_nama: "",
      type: form.type,
      metode_pembayaran: "Tunai",
      amount: "",
    });
  }

  function changeFormType(nextType: TransactionType) {
    setFormType(nextType);
    setForm((current) => ({
      ...current,
      type: nextType,
    }));
  }

  if (screen === "login") {
    return <LoginScreen />;
  }

  return (
    <main
      className={`web-shell ${theme === "dark" ? "is-dark" : ""} ${
        sidebarOpen ? "sidebar-open" : ""
      }`}
    >
      <button
        className="menu-button"
        type="button"
        aria-label="Buka sidebar"
        onClick={() => setSidebarOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      <button
        className="sidebar-backdrop"
        type="button"
        aria-label="Tutup sidebar"
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar screen={screen} onNavigate={() => setSidebarOpen(false)} />
      <section className="workspace">
        <span className="shape shape-cyan" />
        <span className="shape shape-coral" />
        <span className="shape shape-gold" />
        <header className="workspace-header">
          <div>
            <p>Management Keuangan</p>
            <h1>{screen === "dashboard" ? "Dashboard Dompetku" : "Histori Transaksi"}</h1>
          </div>
          <button
            className="theme-button"
            type="button"
            aria-label={
              theme === "light" ? "Aktifkan dark mode" : "Aktifkan light mode"
            }
            title={theme === "light" ? "Dark mode" : "Light mode"}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </header>

        {screen === "dashboard" && (
          <DashboardScreen
            form={form}
            formType={formType}
            totals={totals}
            transactions={transactions}
            onFormChange={setForm}
            onTypeChange={changeFormType}
            onSubmit={submitTransaction}
          />
        )}
        {screen === "histori" && (
          <HistoryScreen totals={totals} transactions={transactions} />
        )}
      </section>
    </main>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="var(--slate-deep)">
      <path d="M20.6 15.5A8.3 8.3 0 0 1 8.5 3.4a8.8 8.8 0 1 0 12.1 12.1Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="var(--slate-deep)">
      <path d="M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Z" />
      <path d="M12 2.2v2.4M12 19.4v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.2 12h2.4M19.4 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </svg>
  );
}

function Sidebar({
  screen,
  onNavigate,
}: {
  screen: Screen;
  onNavigate: () => void;
}) {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/dashboard" onClick={onNavigate}>
        <Image src="/wallet-mark.svg" alt="Dompetku" width={48} height={48} />
        <span>
          <strong>Dompetku</strong>
          <small>Personal finance</small>
        </span>
      </Link>
      <nav>
        {menuItems.map((item) => (
          <Link
            className={screenLabel(screen) === item.label ? "active" : ""}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function LoginScreen() {
  return (
    <main className="login-page">
      <span className="shape shape-cyan" />
      <span className="shape shape-coral" />
      <section className="login-panel">
        <div className="login-art">
          <Image
            src="/wallet-mark.svg"
            alt="Ilustrasi dompet Dompetku"
            width={168}
            height={168}
            priority
          />
        </div>
        <div className="login-copy">
          <p>Catat uang tanpa ribet</p>
          <h1>Dompetku</h1>
          <span>Masuk untuk mengatur pemasukan, pengeluaran, dan histori keuangan harian.</span>
        </div>
        <form className="login-form">
          <label>
            Email
            <input placeholder="nama@email.com" type="email" />
          </label>
          <label>
            Password
            <input placeholder="password" type="password" />
          </label>
          <Link className="primary-action" href="/dashboard">
            Masuk
          </Link>
        </form>
      </section>
    </main>
  );
}

function DashboardScreen({
  form,
  formType,
  totals,
  transactions,
  onFormChange,
  onTypeChange,
  onSubmit,
}: {
  form: { date: string; title: string; atas_nama: string; type: TransactionType; metode_pembayaran: string; amount: string };
  formType: TransactionType;
  totals: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  onFormChange: React.Dispatch<
    React.SetStateAction<{
      date: string;
      title: string;
      atas_nama: string;
      type: TransactionType;
      metode_pembayaran: string;
      amount: string;
    }>
  >;
  onTypeChange: (type: TransactionType) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const metodeOptions = ["Tunai", "Transfer", "E-Wallet", "Kartu Kredit"];

  const inputAmount = Number(form.amount) || 0;
  const projectedIncome = formType === "income" ? totals.balance + inputAmount : totals.balance;
  const projectedExpense = formType === "expense" ? totals.balance - inputAmount : totals.balance;
  const isExpense = formType === "expense" && inputAmount > totals.balance;

  return (
    <div className="dashboard-grid">
      <section className="summary-card balance-card">
        <p>Total saldo</p>
        <strong>{rupiah.format(totals.balance)}</strong>
        <div>
          <span>Pemasukan {rupiah.format(totals.income)}</span>
          <span>Pengeluaran {rupiah.format(totals.expense)}</span>
        </div>
      </section>

      <section className="summary-card chart-card">
        <div>
          <p>Graphic statistic</p>
          <h2>Pengeluaran bulan ini</h2>
        </div>
        <DonutChart />
        <div className="legend-list">
          {expenseBreakdown.map((item) => (
            <span key={item.label}>
              <i style={{ background: item.color }} />
              {item.label}
              <b>{item.value}%</b>
            </span>
          ))}
        </div>
      </section>

      <form className={`transaction-form ${formType}`} onSubmit={onSubmit}>
        <div className="segmented-control">
          <button
            className={formType === "income" ? "selected" : ""}
            type="button"
            onClick={() => onTypeChange("income")}
          >
            Pemasukan
          </button>
          <button
            className={formType === "expense" ? "selected" : ""}
            type="button"
            onClick={() => onTypeChange("expense")}
          >
            Pengeluaran
          </button>
        </div>
        <div className="form-grid">
          <label>
            Tanggal
            <input
              value={form.date}
              type="date"
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Keterangan
            <input
              value={form.title}
              placeholder={formType === "income" ? "Pemasukan untuk..." : "Pengeluaran untuk..."}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Atas Nama
            <input
              value={form.atas_nama}
              placeholder="Nama pihak terkait"
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  atas_nama: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Metode Pembayaran
            <select
              value={form.metode_pembayaran}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  metode_pembayaran: event.target.value,
                }))
              }
            >
              {metodeOptions.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid wide">
          <label>
            Nominal
            <input
              value={form.amount ? Number(form.amount).toLocaleString("id-ID") : ""}
              inputMode="numeric"
              placeholder="250.000"
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  amount: event.target.value.replace(/\D/g, ""),
                }))
              }
            />
          </label>
        </div>
        {inputAmount > 0 && (
          <div className="projection-card">
            <p>Perkiraan saldo</p>
            <div className="projection-content">
              <div className="projection-item">
                <div className="balance-change">
                  <span>Saat ini</span>
                  <b>{rupiah.format(totals.balance)}</b>
                </div>
                <div className="arrow">→</div>
                <div className="balance-change right">
                  <span>Menjadi</span>
                  <strong className={formType === "income" ? "income" : "expense"}>
                    {rupiah.format(formType === "income" ? projectedIncome : projectedExpense)}
                  </strong>
                </div>
              </div>
              {isExpense && <div className="warning-badge">Pengeluaran melebihi saldo saat ini!</div>}
            </div>
          </div>
        )}
        <button className="primary-action" type="submit">
          Simpan transaksi
        </button>
      </form>

      <section className="recent-card">
        <div className="section-title">
          <p>Aktivitas terbaru</p>
          <Link href="/histori">Lihat semua</Link>
        </div>
        <div className="recent-list">
          {transactions.slice(0, 5).map((item) => (
            <TransactionRow item={item} key={item.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

function HistoryScreen({
  totals,
  transactions,
}: {
  totals: { income: number; expense: number; balance: number };
  transactions: Transaction[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const currentTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="history-layout">
      <section className="history-summary">
        <div>
          <p>Monthly expense</p>
          <strong>{rupiah.format(totals.expense)}</strong>
        </div>
        <DonutChart />
        <div className="legend-list">
          {expenseBreakdown.map((item) => (
            <span key={item.label}>
              <i style={{ background: item.color }} />
              {item.label}
              <b>{item.value}%</b>
            </span>
          ))}
        </div>
      </section>

      <section className="history-metrics">
        <MetricCard label="Total budget" value={rupiah.format(totals.income)} />
        <MetricCard label="Expense" value={rupiah.format(totals.expense)} />
        <MetricCard label="Saldo" value={rupiah.format(totals.balance)} />
      </section>

      <section className="history-table">
        <div className="section-title">
          <p>Histori transaksi</p>
          <span>{transactions.length} data</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Atas Nama</th>
                <th>Metode</th>
                <th>Tipe</th>
                <th>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {currentTransactions.map((item) => (
                <HistoryRow item={item} key={item.id} />
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Sebelumnya
            </button>
            <span>Halaman {currentPage} dari {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Selanjutnya
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TransactionRow({ item }: { item: Transaction }) {
  return (
    <article className={`transaction-row ${item.type}`}>
      <div className="row-icon">{item.type === "income" ? "+" : "-"}</div>
      <div>
        <strong>{item.title}</strong>
        <span>
          {item.atas_nama} - {item.metode_pembayaran} - {formatDate(item.date)}
        </span>
      </div>
      <b>
        {item.type === "income" ? "+" : "-"}
        {rupiah.format(item.amount)}
      </b>
    </article>
  );
}

function HistoryRow({ item }: { item: Transaction }) {
  return (
    <tr className={`history-row ${item.type}`}>
      <td style={{ whiteSpace: "nowrap" }}>{formatDate(item.date)}</td>
      <td>
        <strong>{item.title}</strong>
      </td>
      <td>{item.atas_nama}</td>
      <td>{item.metode_pembayaran}</td>
      <td>
        <span className={`type-badge ${item.type}`}>
          {item.type === "income" ? "Pemasukan" : "Pengeluaran"}
        </span>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <b>
          {item.type === "income" ? "+" : "-"}
          {rupiah.format(item.amount)}
        </b>
      </td>
    </tr>
  );
}

function DonutChart() {
  return (
    <div className="donut-chart" aria-label="Grafik pengeluaran">
      <span />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function screenLabel(screen: Screen) {
  return screen === "histori" ? "Histori" : "Dashboard";
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Screen = "login" | "dashboard" | "histori";
type TransactionType = "income" | "expense";

type Transaction = {
  id: number;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  date: string;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const seedTransactions: Transaction[] = [
  {
    id: 1,
    type: "income",
    title: "Gaji bulanan",
    amount: 8500000,
    category: "Salary",
    date: "2026-04-12",
  },
  {
    id: 2,
    type: "expense",
    title: "Belanja dapur",
    amount: 425000,
    category: "Food",
    date: "2026-04-11",
  },
  {
    id: 3,
    type: "expense",
    title: "Internet rumah",
    amount: 315000,
    category: "Bills",
    date: "2026-04-10",
  },
  {
    id: 4,
    type: "income",
    title: "Proyek desain",
    amount: 1400000,
    category: "Freelance",
    date: "2026-04-09",
  },
];

const expenseBreakdown = [
  { label: "Food", value: 42, color: "#ff7058" },
  { label: "Bills", value: 26, color: "#12d6df" },
  { label: "Transport", value: 18, color: "#f6b74b" },
  { label: "Fun", value: 14, color: "#ff5fa2" },
];

const menuItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/histori", label: "Histori" },
  { href: "/login", label: "Logout" },
];

export default function FinanceApp({ screen }: { screen: Screen }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [formType, setFormType] = useState<TransactionType>("income");
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === "undefined") {
      return seedTransactions;
    }

    const saved = window.localStorage.getItem("dompetku-transactions");
    return saved ? (JSON.parse(saved) as Transaction[]) : seedTransactions;
  });
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Salary",
    date: "2026-04-12",
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
        type: formType,
        title: form.title,
        amount,
        category: form.category,
        date: form.date,
      },
      ...items,
    ]);

    setForm({
      title: "",
      amount: "",
      category: formType === "income" ? "Salary" : "Food",
      date: "2026-04-12",
    });
  }

  function changeFormType(nextType: TransactionType) {
    setFormType(nextType);
    setForm((current) => ({
      ...current,
      category: nextType === "income" ? "Salary" : "Food",
    }));
  }

  if (screen === "login") {
    return <LoginScreen />;
  }

  return (
    <main className={`web-shell ${theme === "dark" ? "is-dark" : ""}`}>
      <Sidebar screen={screen} />
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
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? "Dark Mode" : "Light Mode"}
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

function Sidebar({ screen }: { screen: Screen }) {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/dashboard">
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
  form: { title: string; amount: string; category: string; date: string };
  formType: TransactionType;
  totals: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  onFormChange: React.Dispatch<
    React.SetStateAction<{
      title: string;
      amount: string;
      category: string;
      date: string;
    }>
  >;
  onTypeChange: (type: TransactionType) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const categories =
    formType === "income"
      ? ["Salary", "Freelance", "Bonus", "Investasi"]
      : ["Food", "Bills", "Transport", "Fun"];

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

      <form className="transaction-form" onSubmit={onSubmit}>
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
        <div className="form-grid wide">
          <label>
            Keterangan
            <input
              value={form.title}
              placeholder={formType === "income" ? "Contoh: bonus" : "Contoh: makan"}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Nominal
            <input
              value={form.amount}
              inputMode="numeric"
              placeholder="250000"
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  amount: event.target.value.replace(/\D/g, ""),
                }))
              }
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Kategori
            <select
              value={form.category}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
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
        </div>
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
        <div className="table-head">
          <span>Keterangan</span>
          <span>Kategori</span>
          <span>Tanggal</span>
          <span>Nominal</span>
        </div>
        {transactions.map((item) => (
          <HistoryRow item={item} key={item.id} />
        ))}
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
          {item.category} - {formatDate(item.date)}
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
    <article className={`history-row ${item.type}`}>
      <strong>{item.title}</strong>
      <span>{item.category}</span>
      <span>{formatDate(item.date)}</span>
      <b>
        {item.type === "income" ? "+" : "-"}
        {rupiah.format(item.amount)}
      </b>
    </article>
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

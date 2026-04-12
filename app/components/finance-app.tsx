"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Screen = "login" | "dashboard" | "histori" | "kelola";
type TransactionType = "Pemasukan" | "Pengeluaran";

type Transaction = {
  id: string;
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


const expenseBreakdown = [
  { label: "Pemasukan", value: 64, color: "#059D00" },
  { label: "Pengeluaran", value: 36, color: "#D60042" },
];

const menuItems = [
  { href: "/", label: "Dashboard" },
  { href: "/histori", label: "Histori" },
  { href: "/kelola", label: "Kelola Data" },
  { href: "/login", label: "Logout" },
];

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || "";

export default function FinanceApp({ screen }: { screen: Screen }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [formType, setFormType] = useState<TransactionType>("Pemasukan");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({
    date: "2026-04-12",
    title: "",
    atas_nama: "",
    type: "income" as TransactionType,
    metode_pembayaran: "Tunai",
    amount: "",
  });

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (screen === "login") return;
    
    setIsLoading(true);
    fetch(GAS_URL)
      .then((res) => res.json())
      .then((res) => {
        if (res.status === "success") {
          const mappedData: Transaction[] = res.data.map((item: any) => {
            return {
              id: String(item.id_transaksi),
              date: item.tanggal ? new Date(item.tanggal).toISOString().split("T")[0] : "",
              title: item.keterangan,
              atas_nama: item.atas_nama,
              type: item.jenis as TransactionType,
              metode_pembayaran: item.metode_pembayaran,
              amount: Number(item.nominal) || 0,
              created_at: item.created_at,
            };
          }).reverse();
          setTransactions(mappedData);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat data dari Spreadsheet:", err);
        showToast("Gagal memuat data histori dari server.", "error");
      })
      .finally(() => setIsLoading(false));
  }, [screen]);

  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "Pemasukan")
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions
      .filter((item) => item.type === "Pengeluaran")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  async function submitTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(form.amount);
    if (!form.title.trim() || !amount) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      action: "CREATE",
      tanggal: form.date,
      keterangan: form.title,
      atas_nama: form.atas_nama,
      jenis: form.type,
      metode_pembayaran: form.metode_pembayaran,
      nominal: amount,
    };

    try {
      // Catatan: Google Apps Script memerlukan content-type text/plain agar tidak memicu error CORS preflight.
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });

      setTransactions((items) => [
        {
          id: `temp-${Date.now()}`,
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
        date: new Date().toISOString().split("T")[0],
        title: "",
        atas_nama: "",
        type: formType,
        metode_pembayaran: "Tunai",
        amount: "",
      });
      showToast("Transaksi berhasil disimpan!", "success");
    } catch (err) {
      console.error("Gagal menyimpan:", err);
      showToast("Gagal menyimpan transaksi!", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTransaction(id: string) {
    if (id.startsWith("temp-")) {
      showToast("Transaksi sedang diproses ke server, coba sebentar lagi.", "error");
      return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    
    const prev = [...transactions];
    setTransactions((items) => items.filter((i) => i.id !== id));

    try {
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "DELETE", id_transaksi: id }),
      });
      showToast("Transaksi berhasil dihapus!", "success");
    } catch (err) {
      console.error("Gagal menghapus:", err);
      setTransactions(prev);
      showToast("Gagal menghapus transaksi!", "error");
    }
  }

  function changeFormType(nextType: TransactionType) {
    setFormType(nextType);
    setForm((current) => ({
      ...current,
      type: nextType,
    }));
  }

  if (screen === "login") {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <LoginScreen showToast={showToast} />
      </>
    );
  }

  return (
    <main
      className={`web-shell ${theme === "dark" ? "is-dark" : ""} ${
        sidebarOpen ? "sidebar-open" : ""
      }`}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
            <h1>
              {screen === "dashboard" 
                ? "Dashboard Dompetku" 
                : screen === "histori" 
                ? "Histori Transaksi" 
                : "Kelola Data"}
            </h1>
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
            isSubmitting={isSubmitting}
            isLoading={isLoading}
          />
        )}
        {screen === "histori" && (
          <HistoryScreen 
            totals={totals} 
            transactions={transactions}
            isLoading={isLoading}
          />
        )}
        {screen === "kelola" && (
          <KelolaScreen 
            transactions={transactions}
            isLoading={isLoading}
            onDelete={deleteTransaction}
          />
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
      <Link className="brand" href="/" onClick={onNavigate}>
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

function LoginScreen({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      showToast("Berhasil masuk! Mengalihkan ke Dashboard...", "success");
      setTimeout(() => {
        router.push("/");
      }, 1200);
    }, 800);
  }

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
        <form className="login-form" onSubmit={handleLogin}>
          <label>
            Email
            <input placeholder="nama@email.com" type="email" required />
          </label>
          <label>
            Password
            <input placeholder="password" type="password" required />
          </label>
          <button className="primary-action" type="submit" disabled={isLoading}>
            {isLoading ? "Memproses..." : "Masuk"}
          </button>
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
  isSubmitting,
  isLoading,
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
  isSubmitting?: boolean;
  isLoading?: boolean;
}) {
  const metodeOptions = ["Tunai", "Transfer", "E-Wallet", "Kartu Kredit"];

  const inputAmount = Number(form.amount) || 0;
  const projectedIncome = formType === "Pemasukan" ? totals.balance + inputAmount : totals.balance;
  const projectedExpense = formType === "Pengeluaran" ? totals.balance - inputAmount : totals.balance;
  const isExpense = formType === "Pengeluaran" && inputAmount > totals.balance;

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
            className={formType === "Pemasukan" ? "selected" : ""}
            type="button"
            onClick={() => onTypeChange("Pemasukan")}
          >
            Pemasukan
          </button>
          <button
            className={formType === "Pengeluaran" ? "selected" : ""}
            type="button"
            onClick={() => onTypeChange("Pengeluaran")}
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
              placeholder={formType === "Pemasukan" ? "Contoh: gaji bulanan" : "Pengeluaran untuk..."}
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
                  <strong className={formType === "Pemasukan" ? "Pemasukan" : "Pengeluaran"}>
                    {rupiah.format(formType === "Pemasukan" ? projectedIncome : projectedExpense)}
                  </strong>
                </div>
              </div>
              {isExpense && <div className="warning-badge">Pengeluaran melebihi saldo saat ini!</div>}
            </div>
          </div>
        )}
        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan ke Google Sheet..." : "Simpan transaksi"}
        </button>
      </form>

      <section className="recent-card">
        <div className="section-title">
          <p>Aktivitas terbaru</p>
          <Link href="/histori">Lihat semua</Link>
        </div>
        <div className="recent-list">
          {isLoading ? (
            <p style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px", color: "var(--muted)" }}>Memuat data...</p>
          ) : transactions.length === 0 ? (
            <p style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px", color: "var(--muted)" }}>Belum ada transaksi.</p>
          ) : (
            transactions.slice(0, 5).map((item) => (
              <TransactionRow item={item} key={item.id} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function HistoryScreen({
  totals,
  transactions,
  isLoading,
}: {
  totals: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  isLoading?: boolean;
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
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>Memuat data dari Spreadsheet...</td>
                </tr>
              ) : currentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>Belum ada histori transaksi.</td>
                </tr>
              ) : (
                currentTransactions.map((item) => (
                  <HistoryRow item={item} key={item.id} />
                ))
              )}
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
      <div className="row-icon">{item.type === "Pemasukan" ? "+" : "-"}</div>
      <div>
        <strong>{item.title}</strong>
        <span>
          {item.atas_nama} - {item.metode_pembayaran} - {formatDate(item.date)}
        </span>
      </div>
      <b>
        {item.type === "Pemasukan" ? "+" : "-"}
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
          {item.type === "Pemasukan" ? "Pemasukan" : "Pengeluaran"}
        </span>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <b>
          {item.type === "Pemasukan" ? "+" : "-"}
          {rupiah.format(item.amount)}
        </b>
      </td>
    </tr>
  );
}

function KelolaScreen({
  transactions,
  isLoading,
  onDelete,
}: {
  transactions: Transaction[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const currentTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="history-layout">
      <section className="history-table">
        <div className="section-title">
          <p>Kelola Data Transaksi</p>
          <span>{transactions.length} total data</span>
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
                <th style={{ textAlign: "right" }}>Nominal</th>
                <th style={{ width: "80px", textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>Memuat data dari Spreadsheet...</td>
                </tr>
              ) : currentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>Belum ada data untuk dikelola.</td>
                </tr>
              ) : (
                currentTransactions.map((item) => (
                  <KelolaRow item={item} key={item.id} onDelete={onDelete} />
                ))
              )}
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

function KelolaRow({ item, onDelete }: { item: Transaction; onDelete: (id: string) => void }) {
  return (
    <tr className={`history-row ${item.type}`}>
      <td style={{ whiteSpace: "nowrap" }}>{formatDate(item.date)}</td>
      <td><strong>{item.title}</strong></td>
      <td>{item.atas_nama}</td>
      <td>{item.metode_pembayaran}</td>
      <td>
        <span className={`type-badge ${item.type}`}>
          {item.type === "Pemasukan" ? "Pemasukan" : "Pengeluaran"}
        </span>
      </td>
      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
        <b>{item.type === "Pemasukan" ? "+" : "-"}{rupiah.format(item.amount)}</b>
      </td>
      <td style={{ textAlign: "center" }}>
        <div className="action-buttons">
          <button type="button" className="action-btn edit" title="Edit" onClick={() => alert("Fitur Edit akan segera hadir!")}>✎</button>
          <button type="button" className="action-btn delete" title="Hapus" onClick={() => onDelete(item.id)}>✕</button>
        </div>
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

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast-wrapper">
      <div className={`toast-notification ${type}`}>
        <span>{message}</span>
        <button onClick={onClose} type="button" aria-label="Tutup">✕</button>
      </div>
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
  if (screen === "histori") return "Histori";
  if (screen === "kelola") return "Kelola Data";
  return "Dashboard";
}

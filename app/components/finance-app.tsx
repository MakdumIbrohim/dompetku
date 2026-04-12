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


const menuItems = [
  { href: "/", label: "Dashboard" },
  { href: "/histori", label: "Histori" },
  { href: "/kelola", label: "Kelola Data" }
];

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || "";

export default function FinanceApp({ screen }: { screen: Screen }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [formType, setFormType] = useState<TransactionType>("Pemasukan");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{ nama_lengkap: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editData, setEditData] = useState<Transaction | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: "submit" | "delete" | "edit" | null;
    data?: any;
  }>({ isOpen: false, action: null });
  const [form, setForm] = useState({
    date: "2026-04-12",
    title: "",
    atas_nama: "",
    type: "Pemasukan" as TransactionType,
    metode_pembayaran: "Tunai",
    amount: "",
  });
  
  const router = useRouter();

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("dompetku_user");
    if (!userStr && screen !== "login") {
      router.push("/login");
    } else if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      // Pre-fill nama user ke form 'atas_nama'
      setForm((prev) => ({ ...prev, atas_nama: userData.nama_lengkap }));

      // Cek apakah baru saja login untuk menampilkan toast di dashboard
      const showToastFlag = localStorage.getItem("dompetku_show_login_toast");
      if (showToastFlag === "true" && screen === "dashboard") {
        showToast(`Selamat datang kembali, ${userData.nama_lengkap}!`, "success");
        localStorage.removeItem("dompetku_show_login_toast");
      }
    }
  }, [screen, router, showToast]);

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

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !amount) {
      return;
    }
    setConfirmModal({ isOpen: true, action: "submit", data: { ...form, amount } });
  }

  async function executeSubmit() {
    const data = confirmModal.data;
    setConfirmModal({ isOpen: false, action: null });

    setIsSubmitting(true);

    const payload = {
      action: "CREATE",
      tanggal: data.date,
      keterangan: data.title,
      atas_nama: data.atas_nama,
      jenis: data.type,
      metode_pembayaran: data.metode_pembayaran,
      nominal: data.amount,
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
          date: data.date,
          title: data.title,
          atas_nama: data.atas_nama,
          type: data.type,
          metode_pembayaran: data.metode_pembayaran,
          amount: data.amount,
          created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
        ...items,
      ]);

      setForm({
        date: new Date().toISOString().split("T")[0],
        title: "",
        atas_nama: user?.nama_lengkap || "",
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

  function requestDelete(id: string) {
    if (id.startsWith("temp-")) {
      showToast("Transaksi sedang diproses ke server, coba sebentar lagi.", "error");
      return;
    }
    setConfirmModal({ isOpen: true, action: "delete", data: id });
  }

  async function executeDelete() {
    const id = confirmModal.data;
    setConfirmModal({ isOpen: false, action: null });
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

  async function executeEdit() {
    const updatedData: Transaction = confirmModal.data;
    setConfirmModal({ isOpen: false, action: null });
    setEditData(null);
    
    const prev = [...transactions];
    setTransactions((items) => items.map((i) => i.id === updatedData.id ? updatedData : i));

    try {
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "UPDATE",
          id_transaksi: updatedData.id,
          tanggal: updatedData.date,
          keterangan: updatedData.title,
          atas_nama: updatedData.atas_nama,
          jenis: updatedData.type,
          metode_pembayaran: updatedData.metode_pembayaran,
          nominal: updatedData.amount
        })
      });
      showToast("Transaksi berhasil diperbarui!", "success");
    } catch (err) {
      console.error("Gagal mengedit:", err);
      setTransactions(prev);
      showToast("Gagal memperbarui transaksi!", "error");
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
      
      {editData && (
        <EditTransactionModal 
          item={editData} 
          onClose={() => setEditData(null)} 
          onSubmit={(updated) => {
            setConfirmModal({ isOpen: true, action: "edit", data: updated });
          }} 
        />
      )}

      {confirmModal.isOpen && (
        <ConfirmModal
          isOpen={true}
          title={
            confirmModal.action === "submit" ? "Konfirmasi Transaksi" :
            confirmModal.action === "edit" ? "Konfirmasi Perubahan" : "Konfirmasi Hapus"
          }
          onConfirm={
            confirmModal.action === "submit" ? executeSubmit :
            confirmModal.action === "edit" ? executeEdit : executeDelete
          }
          onCancel={() => setConfirmModal({ isOpen: false, action: null })}
          confirmText={
            confirmModal.action === "submit" ? "Ya, Simpan" :
            confirmModal.action === "edit" ? "Ya, Perbarui" : "Ya, Hapus"
          }
          isDanger={confirmModal.action === "delete"}
        >
          {confirmModal.action === "delete" ? (
            <p>Apakah Anda yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan.</p>
          ) : (
            <>
              <p>Apakah data berikut sudah benar?</p>
              <ul>
                <li><strong>Tanggal:</strong> {formatDate(confirmModal.data.date)}</li>
                <li><strong>Keterangan:</strong> {confirmModal.data.title}</li>
                <li><strong>Atas Nama:</strong> {confirmModal.data.atas_nama || "-"}</li>
                <li><strong>Metode:</strong> {confirmModal.data.metode_pembayaran}</li>
                <li><strong>Tipe:</strong> {confirmModal.data.type}</li>
                <li><strong>Nominal:</strong> {rupiah.format(confirmModal.data.amount)}</li>
              </ul>
            </>
          )}
        </ConfirmModal>
      )}

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
                ? `Halo, ${user?.nama_lengkap || "Pengguna"}!` 
                : screen === "histori" 
                ? "Histori Transaksi" 
                : "Kelola Data"}
            </h1>
          </div>
          <div className="header-actions">
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
            <button
              className="logout-button"
              type="button"
              onClick={() => {
                localStorage.setItem("dompetku_show_logout_toast", "true");
                router.push("/login");
              }}
            >
              <LogOutIcon />
              Logout
            </button>
          </div>
        </header>

        {screen === "dashboard" && (
          <DashboardScreen
            form={form}
            formType={formType}
            totals={totals}
            transactions={transactions}
            onFormChange={setForm}
            onTypeChange={changeFormType}
            onSubmit={handleFormSubmit}
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
            onDelete={requestDelete}
            onEdit={setEditData}
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

function LogOutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
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

  useEffect(() => {
    // Logout otomatis (hapus sesi dari localStorage)
    localStorage.removeItem("dompetku_user");

    // Cek apakah baru saja logout untuk menampilkan toast
    const showLogoutToast = localStorage.getItem("dompetku_show_logout_toast");
    if (showLogoutToast === "true") {
      showToast("Berhasil keluar dari akun.", "success");
      localStorage.removeItem("dompetku_show_logout_toast");
    }
  }, [showToast]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        localStorage.setItem("dompetku_user", JSON.stringify(data.user));
        // Set flag untuk tampilkan toast di dashboard
        localStorage.setItem("dompetku_show_login_toast", "true");
        router.push("/");
      } else {
        showToast(data.error || "Gagal login", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi ke server", "error");
    } finally {
      setIsLoading(false);
    }
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
            Username
            <input name="username" placeholder="Masukkan username" type="text" required />
          </label>
          <label>
            Password
            <input name="password" placeholder="password" type="password" required />
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
        <DonutChart income={totals.income} expense={totals.expense} />
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
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const availableMonths = useMemo(() => {
    if (filterYear === "all") return [];
    const today = new Date();
    const isCurrentYear = parseInt(filterYear) === today.getFullYear();
    const maxMonth = isCurrentYear ? today.getMonth() + 1 : 12;
    const months = [];
    for (let m = 1; m <= maxMonth; m++) {
      months.push(m.toString().padStart(2, "0"));
    }
    return months;
  }, [filterYear]);

  const availableDates = useMemo(() => {
    if (filterYear === "all" || filterMonth === "all") return [];
    const today = new Date();
    const y = parseInt(filterYear);
    const m = parseInt(filterMonth);
    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth() + 1;
    const maxDate = isCurrentMonth ? today.getDate() : new Date(y, m, 0).getDate();
    
    const dates = [];
    for (let d = 1; d <= maxDate; d++) {
      dates.push(d.toString().padStart(2, "0"));
    }
    return dates;
  }, [filterYear, filterMonth]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return filterYear === "all";
      if (filterYear !== "all" && !t.date.startsWith(filterYear)) return false;
      if (filterMonth !== "all" && !t.date.startsWith(`${filterYear}-${filterMonth}`)) return false;
      if (filterDate !== "all" && t.date !== `${filterYear}-${filterMonth}-${filterDate}`) return false;
      return true;
    });
  }, [transactions, filterYear, filterMonth, filterDate]);

  const filteredTotals = useMemo(() => {
    const income = filteredTransactions
      .filter((item) => item.type === "Pemasukan")
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = filteredTransactions
      .filter((item) => item.type === "Pengeluaran")
      .reduce((sum, item) => sum + item.amount, 0);

    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setFilterYear(e.target.value);
    setFilterMonth("all");
    setFilterDate("all");
    setCurrentPage(1);
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setFilterMonth(e.target.value);
    setFilterDate("all");
    setCurrentPage(1);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setFilterDate(e.target.value);
    setCurrentPage(1);
  }

  return (
    <div className="history-layout">
      <div className="history-filters">
        <select value={filterYear} onChange={handleYearChange} aria-label="Filter Tahun">
          <option value="all">Semua Tahun</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {filterYear !== "all" && (
          <select value={filterMonth} onChange={handleMonthChange} aria-label="Filter Bulan">
            <option value="all">Semua Bulan</option>
            {availableMonths.map((m) => <option key={m} value={m}>{getMonthName(m)}</option>)}
          </select>
        )}
        {filterYear !== "all" && filterMonth !== "all" && (
          <select value={filterDate} onChange={handleDateChange} aria-label="Filter Tanggal">
            <option value="all">Semua Tanggal</option>
            {availableDates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      <section className="history-summary">
        <div>
          <p>Total Pengeluaran</p>
          <strong>{rupiah.format(filteredTotals.expense)}</strong>
        </div>
        <DonutChart income={filteredTotals.income} expense={filteredTotals.expense} />
      </section>

      <section className="history-metrics">
        <MetricCard label="Total Pemasukan" value={rupiah.format(filteredTotals.income)} />
        <MetricCard label="Total Pengeluaran" value={rupiah.format(filteredTotals.expense)} />
        <MetricCard label="Sisa Saldo" value={rupiah.format(filteredTotals.balance)} />
      </section>

      <section className="history-table">
        <div className="section-title">
          <p>Histori transaksi</p>
          <span>{filteredTransactions.length} data</span>
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
  onEdit,
}: {
  transactions: Transaction[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  onEdit: (item: Transaction) => void;
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
                  <KelolaRow item={item} key={item.id} onDelete={onDelete} onEdit={onEdit} />
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

function KelolaRow({ item, onDelete, onEdit }: { item: Transaction; onDelete: (id: string) => void; onEdit: (item: Transaction) => void }) {
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
          <button type="button" className="action-btn edit" title="Edit" onClick={() => onEdit(item)}>✎</button>
          <button type="button" className="action-btn delete" title="Hapus" onClick={() => onDelete(item.id)}>✕</button>
        </div>
      </td>
    </tr>
  );
}

function ConfirmModal({
  isOpen,
  title,
  children,
  onConfirm,
  onCancel,
  confirmText = "Konfirmasi",
  isDanger = false,
}: {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDanger?: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>Batal</button>
          <button type="button" className={`btn-confirm ${isDanger ? 'danger' : ''}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function EditTransactionModal({
  item,
  onClose,
  onSubmit
}: {
  item: Transaction;
  onClose: () => void;
  onSubmit: (updated: Transaction) => void;
}) {
  const [form, setForm] = useState(item);
  const metodeOptions = ["Tunai", "Transfer", "E-Wallet", "Kartu Kredit"];

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <h2>Edit Transaksi</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <div className="form-grid" style={{ marginBottom: '14px' }}>
            <label>Tanggal <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
            <label>Keterangan <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          </div>
          <div className="form-grid" style={{ marginBottom: '14px' }}>
            <label>Atas Nama <input value={form.atas_nama} onChange={(e) => setForm({ ...form, atas_nama: e.target.value })} /></label>
            <label>Metode
              <select value={form.metode_pembayaran} onChange={(e) => setForm({ ...form, metode_pembayaran: e.target.value })}>
                {metodeOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>Tipe
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })}>
                <option value="Pemasukan">Pemasukan</option>
                <option value="Pengeluaran">Pengeluaran</option>
              </select>
            </label>
            <label>Nominal <input inputMode="numeric" value={form.amount ? Number(form.amount).toLocaleString('id-ID') : ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value.replace(/\D/g, "")) })} required /></label>
          </div>
          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-confirm">Lanjut</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DonutChart({ income, expense }: { income: number; expense: number }) {
  const total = income + expense;
  const incomePct = total === 0 ? 0 : Math.round((income / total) * 100);
  const expensePct = total === 0 ? 0 : 100 - incomePct;

  const breakdown = [
    { label: "Pemasukan", value: incomePct, color: "var(--green)" },
    { label: "Pengeluaran", value: expensePct, color: "var(--rose)" },
  ];

  return (
    <>
      <div 
        className="donut-chart" 
        aria-label="Grafik pengeluaran"
        style={{
          background: total === 0 
            ? "conic-gradient(var(--border) 0 100%)" 
            : `conic-gradient(var(--green) 0 ${incomePct}%, var(--rose) ${incomePct}% 100%)`
        }}
      >
        <span />
      </div>
      <div className="legend-list">
        {breakdown.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
            <b>{item.value}%</b>
          </span>
        ))}
      </div>
    </>
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

function getMonthName(monthStr: string) {
  const date = new Date(2000, parseInt(monthStr, 10) - 1, 1);
  return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(date);
}

function screenLabel(screen: Screen) {
  if (screen === "histori") return "Histori";
  if (screen === "kelola") return "Kelola Data";
  return "Dashboard";
}

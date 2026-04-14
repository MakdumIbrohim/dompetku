"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { useData, Transaction, defaultIncomeCategories, defaultExpenseCategories } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

type Screen = "login" | "dashboard" | "histori" | "kelola";
type TransactionType = "Pemasukan" | "Pengeluaran";


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
  const { theme, toggleTheme } = useTheme();
  const [formType, setFormType] = useState<TransactionType>("Pemasukan");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { 
    transactions, 
    isLoading, 
    isSubmitting, 
    addTransaction, 
    deleteTransaction, 
    updateTransaction 
  } = useData();
  const { user, login, logout, isLoading: isAuthLoading } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editData, setEditData] = useState<Transaction | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: "submit" | "delete" | "edit" | null;
    data?: any;
  }>({ isOpen: false, action: null });
  const [form, setForm] = useState({
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    title: "",
    category: defaultIncomeCategories[0],
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
    if (!isAuthLoading && !user && screen !== "login") {
      router.push("/login");
    } else if (user) {
      // Pre-fill nama user ke form 'atas_nama'
      setForm((prev) => ({ ...prev, atas_nama: user.nama_lengkap }));

      // Cek apakah baru saja login untuk menampilkan toast di dashboard
      const showToastFlag = localStorage.getItem("dompetku_show_login_toast");
      if (showToastFlag === "true" && screen === "dashboard") {
        showToast(`Selamat datang kembali, ${user.nama_lengkap}!`, "success");
        localStorage.removeItem("dompetku_show_login_toast");
      }
    }
  }, [screen, router, showToast, user, isAuthLoading]);


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
    const success = await addTransaction(data);
    if (success) {
      setConfirmModal({ isOpen: false, action: null });
      setForm({
        date: (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        title: "",
        category: formType === "Pemasukan" ? defaultIncomeCategories[0] : defaultExpenseCategories[0],
        atas_nama: user?.nama_lengkap || "",
        type: formType,
        metode_pembayaran: "Tunai",
        amount: "",
      });
      showToast("Transaksi berhasil disimpan!", "success");
    } else {
      showToast("Gagal menyimpan transaksi!", "error");
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
    const success = await deleteTransaction(id);
    if (success) {
      setConfirmModal({ isOpen: false, action: null });
      showToast("Transaksi berhasil dihapus!", "success");
    } else {
      showToast("Gagal menghapus transaksi!", "error");
    }
  }

  async function executeEdit() {
    const updatedData: Transaction = confirmModal.data;
    const success = await updateTransaction(updatedData);
    if (success) {
      setConfirmModal({ isOpen: false, action: null });
      setEditData(null);
      showToast("Transaksi berhasil diperbarui!", "success");
    } else {
      showToast("Gagal memperbarui transaksi!", "error");
    }
  }

  function changeFormType(nextType: TransactionType) {
    setFormType(nextType);
    setForm((current) => ({
      ...current,
      type: nextType,
      category: nextType === "Pemasukan" ? defaultIncomeCategories[0] : defaultExpenseCategories[0],
    }));
  }

  if (screen === "login") {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <LoginScreen showToast={showToast} onLogin={login} />
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
          isLoading={isSubmitting}
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
          isLoading={isSubmitting}
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

      <Sidebar 
        screen={screen} 
        onNavigate={() => setSidebarOpen(false)} 
      />
      <section className="workspace">
        <span className="shape shape-cyan no-print" />
        <span className="shape shape-coral no-print" />
        <span className="shape shape-gold no-print" />
        <header className="workspace-header">
          <button
            className={`menu-button no-print ${sidebarOpen ? "is-active" : ""}`}
            type="button"
            aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <p>Management Keuangan</p>
            <h1>
              {screen === "dashboard" 
                ? `Halo, ${user?.nama_lengkap || "Pengguna"}.` 
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
              onClick={toggleTheme}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
              className="logout-button navbar-logout"
              type="button"
              onClick={logout}
            >
              <LogOutIcon />
              <span>Logout</span>
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

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function TagIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
      <line x1="7" y1="7" x2="7.01" y2="7"></line>
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
      <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
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

function LoginScreen({ showToast, onLogin }: { showToast: (msg: string, type: "success" | "error") => void, onLogin: (user: any) => void }) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
        onLogin(data.user);
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
      <span className="shape shape-cyan no-print" />
      <span className="shape shape-coral no-print" />
      <section className="login-panel">
        <div className="login-art">
          <img
            src="/login-art.png"
            alt="Ilustrasi dompet Dompetku"
            style={{ width: '100%', height: 'auto', maxWidth: '380px', objectFit: 'contain' }}
            className="login-art-image"
          />
        </div>
        <div className="login-content">
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
            <button className={`primary-action ${isLoading ? 'is-loading' : ''}`} type="submit" disabled={isLoading}>
              {isLoading && <SpinnerIcon />}
              Masuk
            </button>
          </form>
        </div>
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
  form: { date: string; title: string; category: string; atas_nama: string; type: TransactionType; metode_pembayaran: string; amount: string };
  formType: TransactionType;
  totals: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  onFormChange: React.Dispatch<
    React.SetStateAction<{
      date: string;
      title: string;
      category: string;
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
      <section className="summary-card trend-card">
        {isLoading ? (
          <div className="skeleton-box" style={{ width: '100%', height: '180px' }}></div>
        ) : (
          <>
            <h2>Tren Pengeluaran 7 Hari Terakhir</h2>
            <TrendChart transactions={transactions} />
          </>
        )}
      </section>

      <section className="summary-card balance-card">
        {isLoading ? (
          <SummaryCardSkeleton />
        ) : (
          <>
            <p>Total saldo</p>
            <strong>{rupiah.format(totals.balance)}</strong>
            <div>
              <span>Pemasukan {rupiah.format(totals.income)}</span>
              <span>Pengeluaran {rupiah.format(totals.expense)}</span>
            </div>
          </>
        )}
      </section>

      <section className="summary-card chart-card">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <>
            <div>
              <p>Graphic statistic</p>
              <h2>Pengeluaran bulan ini</h2>
            </div>
            <DonutChart income={totals.income} expense={totals.expense} />
          </>
        )}
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
        <button className={`primary-action ${isSubmitting ? 'is-loading' : ''}`} type="submit" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon />}
          Simpan transaksi
        </button>
      </form>
      
      <section className="recent-card">
        <div className="section-title">
          <p>Aktivitas terbaru</p>
          <Link href="/histori">Lihat semua</Link>
        </div>
        <div className="recent-list">
          {isLoading ? (
            <>
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
            </>
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<(Transaction & { balanceBefore: number; balanceAfter: number }) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const itemsPerPage = 20;

  const availableYears = useMemo(() => {
    if (!mounted) return [];
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, [mounted]);

  const availableMonths = useMemo(() => {
    if (!mounted || filterYear === "all") return [];
    const today = new Date();
    const isCurrentYear = parseInt(filterYear) === today.getFullYear();
    const maxMonth = isCurrentYear ? today.getMonth() + 1 : 12;
    const months = [];
    for (let m = 1; m <= maxMonth; m++) {
      months.push(m.toString().padStart(2, "0"));
    }
    return months;
  }, [mounted, filterYear]);

  const availableDates = useMemo(() => {
    if (!mounted || filterYear === "all" || filterMonth === "all") return [];
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
  }, [mounted, filterYear, filterMonth]);

  // Kalkulasi riwayat saldo (running balance)
  const transactionsWithBalance = useMemo(() => {
    const reversed = [...transactions].reverse();
    let currentBalance = 0;
    const withBalance = reversed.map((t) => {
      const before = currentBalance;
      if (t.type === "Pemasukan") {
        currentBalance += t.amount;
      } else {
        currentBalance -= t.amount;
      }
      return {
        ...t,
        balanceBefore: before,
        balanceAfter: currentBalance,
      };
    });
    return withBalance.reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactionsWithBalance.filter((t) => {
      if (!t.date) return filterYear === "all";
      if (filterYear !== "all" && !t.date.startsWith(filterYear)) return false;
      if (filterMonth !== "all" && !t.date.startsWith(`${filterYear}-${filterMonth}`)) return false;
      if (filterDate !== "all" && t.date !== `${filterYear}-${filterMonth}-${filterDate}`) return false;

      if (searchQuery.trim() !== "") {
        const lowerQuery = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(lowerQuery);
        const matchAtasNama = (t.atas_nama || "").toLowerCase().includes(lowerQuery);
        const matchMetode = t.metode_pembayaran.toLowerCase().includes(lowerQuery);
        const matchCategory = (t.category || "").toLowerCase().includes(lowerQuery);
        if (!matchTitle && !matchAtasNama && !matchMetode && !matchCategory) return false;
      }
      return true;
    });
  }, [transactionsWithBalance, filterYear, filterMonth, filterDate, searchQuery]);

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
      <PrintReportHeader 
        title="Laporan Histori Transaksi" 
        period={`${filterYear !== 'all' ? filterYear : 'Semua Tahun'}${filterMonth !== 'all' ? ' - ' + getMonthName(filterMonth) : ''}${filterDate !== 'all' ? ' - ' + filterDate : ''}`}
      />
      {isExportModalOpen ? (
        <ExportModal 
          onClose={() => setIsExportModalOpen(false)} 
          onExport={() => {
            setIsExportModalOpen(false);
            setTimeout(() => {
              window.print();
            }, 500);
          }} 
          onCSV={() => {
            setIsExportModalOpen(false);
            exportToCSV(filteredTransactions);
          }}
          onExcel={() => {
            setIsExportModalOpen(false);
            exportToExcel(filteredTransactions);
          }}
        />
      ) : selectedItem ? (
        <TransactionDetailModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      ) : null}
      <div className="section-title no-print" style={{ marginBottom: "8px" }}>
        <p>Filter Periode Waktu</p>
        <button className="export-btn no-print" onClick={() => setIsExportModalOpen(true)}>
          <DownloadIcon />
          Ekspor Data
        </button>
      </div>
      <div className="history-filters" style={{ flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Cari transaksi..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          style={{ flexGrow: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'inherit' }}
        />
        <select value={filterYear} onChange={handleYearChange} aria-label="Filter Tahun">
          <option value="all">Semua Tahun</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        
        <select 
          value={filterYear === "all" ? "disabled" : filterMonth} 
          onChange={handleMonthChange} 
          aria-label="Filter Bulan"
          disabled={filterYear === "all"}
        >
          {filterYear === "all" ? (
            <option value="disabled">Pilih Tahun Dulu</option>
          ) : (
            <>
              <option value="all">Semua Bulan</option>
              {availableMonths.map((m) => <option key={m} value={m}>{getMonthName(m)}</option>)}
            </>
          )}
        </select>

        <select 
          value={filterYear === "all" || filterMonth === "all" ? "disabled" : filterDate} 
          onChange={handleDateChange} 
          aria-label="Filter Tanggal"
          disabled={filterYear === "all" || filterMonth === "all"}
        >
          {filterYear === "all" ? (
            <option value="disabled">Pilih Tahun Dulu</option>
          ) : filterMonth === "all" ? (
            <option value="disabled">Pilih Bulan Dulu</option>
          ) : (
            <>
              <option value="all">Semua Tanggal</option>
              {availableDates.map((d) => <option key={d} value={d}>{d}</option>)}
            </>
          )}
        </select>
      </div>

      <section className="history-summary">
        {isLoading ? (
          <div style={{ display: 'contents' }}>
            <div style={{ gridColumn: '1 / span 2' }}><SummaryCardSkeleton /></div>
            <ChartSkeleton />
          </div>
        ) : (
          <>
            <div>
              <p>Total Pengeluaran</p>
              <strong>{rupiah.format(filteredTotals.expense)}</strong>
            </div>
            <DonutChart income={filteredTotals.income} expense={filteredTotals.expense} />
          </>
        )}
      </section>

      <section className="history-metrics">
        {isLoading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard label="Total Pemasukan" value={rupiah.format(filteredTotals.income)} />
            <MetricCard label="Total Pengeluaran" value={rupiah.format(filteredTotals.expense)} />
            <MetricCard label="Sisa Saldo" value={rupiah.format(filteredTotals.balance)} />
          </>
        )}
      </section>

      <section className="history-table">
        <div className="section-title">
          <p>Histori transaksi</p>
          <span>{filteredTransactions.length} data</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Atas Nama</th>
                <th>Metode</th>
                <th>Tipe</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                </>
              ) : currentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>Belum ada histori transaksi.</td>
                </tr>
              ) : (
                currentTransactions.map((item) => (
                  <HistoryRow 
                    item={item as any} 
                    key={item.id} 
                    onClick={() => setSelectedItem(item as any)}
                  />
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
          {item.atas_nama || "-"} • {formatDate(item.date)}
        </span>
      </div>
      <b>
        {item.type === "Pemasukan" ? "+" : "-"}
        {rupiah.format(item.amount)}
      </b>
    </article>
  );
}

function HistoryRow({ 
  item,
  onClick
}: { 
  item: Transaction & { balanceBefore?: number; balanceAfter?: number };
  onClick?: () => void;
}) {
  return (
    <tr className={`history-row ${item.type}`} onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
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
      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
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
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 20;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (searchQuery.trim() !== "") {
        const lowerQuery = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(lowerQuery);
        const matchAtasNama = (t.atas_nama || "").toLowerCase().includes(lowerQuery);
        const matchMetode = t.metode_pembayaran.toLowerCase().includes(lowerQuery);
        const matchCategory = (t.category || "").toLowerCase().includes(lowerQuery);
        if (!matchTitle && !matchAtasNama && !matchMetode && !matchCategory) return false;
      }
      return true;
    });
  }, [transactions, searchQuery]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="history-layout">
      <section className="history-table">
        <div className="section-title" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <p>Kelola Data Transaksi</p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="search"
              placeholder="Cari data..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ width: '250px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'inherit', fontSize: '14px' }}
            />
            <span>{filteredTransactions.length} total data</span>
          </div>
        </div>
        <div className="table-wrapper">
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
                <>
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                </>
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

function SpinnerIcon() {
  return (
    <svg className="spinner" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function TransactionSkeleton() {
  return (
    <article className="transaction-row" style={{ pointerEvents: 'none' }}>
      <div className="row-icon skeleton-box" style={{ background: 'transparent' }}></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-box" style={{ width: '60%', height: '14px' }}></div>
        <div className="skeleton-box" style={{ width: '80%', height: '10px' }}></div>
      </div>
      <div className="skeleton-box" style={{ width: '60px', height: '14px', marginLeft: 'auto' }}></div>
    </article>
  );
}

function SummaryCardSkeleton() {
  return (
    <div style={{ display: 'grid', gap: '12px', width: '100%' }}>
      <div className="skeleton-box" style={{ width: '40%', height: '10px' }}></div>
      <div className="skeleton-box" style={{ width: '80%', height: '32px' }}></div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="skeleton-box" style={{ width: '100px', height: '28px', borderRadius: '10px' }}></div>
        <div className="skeleton-box" style={{ width: '100px', height: '28px', borderRadius: '10px' }}></div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ display: 'grid', gap: '8px', flex: 1 }}>
        <div className="skeleton-box" style={{ width: '40%', height: '10px' }}></div>
        <div className="skeleton-box" style={{ width: '80%', height: '24px' }}></div>
      </div>
      <div className="skeleton-box" style={{ width: '100px', height: '100px', borderRadius: '50%' }}></div>
    </div>
  );
}

function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="history-row" style={{ pointerEvents: 'none' }}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <div 
            className="skeleton-box" 
            style={{ 
              width: i === columns - 1 || i === columns - 2 ? '60%' : '80%', 
              height: '14px', 
              marginLeft: i === columns - 1 ? 'auto' : '0' 
            }}
          ></div>
        </td>
      ))}
    </tr>
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
          <button type="button" className="action-btn edit" title="Edit" onClick={() => onEdit(item)}>
            <EditIcon />
          </button>
          <button type="button" className="action-btn delete" title="Hapus" onClick={() => onDelete(item.id)}>
            <TrashIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}

function SummaryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
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
  isLoading = false,
}: {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={isLoading}>Batal</button>
          <button type="button" className={`btn-confirm ${isDanger ? 'danger' : ''} ${isLoading ? 'is-loading' : ''}`} onClick={onConfirm} disabled={isLoading}>
            {isLoading && <SpinnerIcon />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTransactionModal({
  item,
  onClose,
  onSubmit,
  isLoading = false
}: {
  item: Transaction;
  onClose: () => void;
  onSubmit: (updated: Transaction) => void;
  isLoading?: boolean;
}) {
  const [form, setForm] = useState(item);
  const metodeOptions = ["Tunai", "Transfer", "E-Wallet", "Kartu Kredit"];

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <h2>Edit Transaksi</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <div className="form-grid" style={{ marginBottom: '14px' }}>
            <label>Tanggal <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required style={{ backgroundColor: 'var(--surface)' }} /></label>
            <label>Keterangan <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={{ backgroundColor: 'var(--surface)' }} /></label>
          </div>
          <div className="form-grid" style={{ marginBottom: '14px' }}>
            <label>Atas Nama <input value={form.atas_nama} onChange={(e) => setForm({ ...form, atas_nama: e.target.value })} style={{ backgroundColor: 'var(--surface)' }} /></label>
            <label>Metode
              <select value={form.metode_pembayaran} onChange={(e) => setForm({ ...form, metode_pembayaran: e.target.value })} style={{ backgroundColor: 'var(--surface)' }}>
                {metodeOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <div className="form-grid" style={{ marginBottom: '14px' }}>
            <label>Tipe
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType, category: e.target.value === "Pemasukan" ? defaultIncomeCategories[0] : defaultExpenseCategories[0] })} style={{ backgroundColor: 'var(--surface)' }}>
                <option value="Pemasukan">Pemasukan</option>
                <option value="Pengeluaran">Pengeluaran</option>
              </select>
            </label>
            <label>Nominal <input inputMode="numeric" value={form.amount ? Number(form.amount).toLocaleString('id-ID') : ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value.replace(/\D/g, "")) })} required style={{ backgroundColor: 'var(--surface)' }} /></label>
          </div>
          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>Batal</button>
            <button type="submit" className={`btn-confirm ${isLoading ? 'is-loading' : ''}`} disabled={isLoading}>
              {isLoading && <SpinnerIcon />}
              Lanjut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransactionDetailModal({
  item,
  onClose,
}: {
  item: Transaction & { balanceBefore: number; balanceAfter: number };
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
        <header className="detail-header">
          <div className="detail-type-badge">
            <span className={`badge ${item.type}`}>{item.type}</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Tutup">×</button>
        </header>
        
        <div className="detail-amount-section">
          <span className="label">Nominal Transaksi</span>
          <h2 className={item.type === "Pemasukan" ? "income-text" : "expense-text"}>
            {item.type === "Pemasukan" ? "+" : "-"} {rupiah.format(item.amount)}
          </h2>
        </div>

        <div className="detail-info-grid">
          <div className="info-item">
            <div className="info-icon"><CalendarIcon /></div>
            <div className="info-content">
              <span>Tanggal</span>
              <p>{formatDate(item.date)}</p>
            </div>
          </div>
          <div className="info-item">
            <div className="info-icon"><TagIcon /></div>
            <div className="info-content">
              <span>Kategori</span>
              <p>{item.category}</p>
            </div>
          </div>
          <div className="info-item">
            <div className="info-icon"><UserIcon /></div>
            <div className="info-content">
              <span>Pihak Terkait (Atas Nama)</span>
              <p>{item.atas_nama || "-"}</p>
            </div>
          </div>
          <div className="info-item">
            <div className="info-icon"><WalletIcon /></div>
            <div className="info-content">
              <span>Metode Pembayaran</span>
              <p>{item.metode_pembayaran}</p>
            </div>
          </div>
        </div>

        <div className="detail-description">
          <span>Keterangan</span>
          <p>{item.title}</p>
        </div>

        <div className="detail-balance-card">
          <div className="balance-info">
            <div className="balance-step">
              <span>Saldo Sebelum</span>
              <strong>{rupiah.format(item.balanceBefore)}</strong>
            </div>
            <div className="balance-arrow">→</div>
            <div className="balance-step">
              <span>Saldo Sesudah</span>
              <strong className={item.type === "Pemasukan" ? "income-text" : "expense-text"}>
                {rupiah.format(item.balanceAfter)}
              </strong>
            </div>
          </div>
          <div className="balance-footer">
            <span>Selisih: {rupiah.format(item.amount)}</span>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button type="button" className="btn-confirm" onClick={onClose} style={{ width: '100%' }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ transactions }: { transactions: Transaction[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 1. Ambil 7 hari terakhir
  const last7Days = useMemo(() => {
    interface TrendDay {
      date: string;
      label: string;
      fullLabel: string;
      income: number;
      expense: number;
    }
    const days: TrendDay[] = [];
    const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        label: dayLabels[d.getDay()],
        fullLabel: d.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'short' }),
        income: 0,
        expense: 0
      });
    }
    
    // 2. Isi data pemasukan & pengeluaran
    transactions.forEach(t => {
      const day = days.find(d => d.date === t.date);
      if (day) {
        if (t.type === "Pemasukan") day.income += t.amount;
        else day.expense += t.amount;
      }
    });
    
    return days;
  }, [transactions]);

  const maxAmount = Math.max(
    ...last7Days.map(d => d.income), 
    ...last7Days.map(d => d.expense), 
    1
  );
  
  const chartHeight = 280; // Increased from 160 for better mobile impact
  const chartWidth = 1000;
  const paddingX = 80;
  
  // 3. Kalkulasi koordinat titik
  const points = last7Days.map((d, i) => {
    const x = paddingX + (i / (last7Days.length - 1)) * (chartWidth - paddingX * 2);
    // Increased the data drawing area (chartHeight - 40)
    const incomeY = chartHeight - (d.income / maxAmount) * (chartHeight - 40);
    const expenseY = chartHeight - (d.expense / maxAmount) * (chartHeight - 40);
    return { x, incomeY, expenseY };
  });

  const getPath = (attr: 'incomeY' | 'expenseY') => 
    points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p[attr]}` : `${acc} L ${p.x} ${p[attr]}`, "");
  
  const incomePath = getPath('incomeY');
  const expensePath = getPath('expenseY');
  
  const incomeArea = `${incomePath} L ${points[points.length-1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
  const expenseArea = `${expensePath} L ${points[points.length-1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="trend-content" style={{ width: '100%', marginTop: '16px' }}>
      {/* Tooltip (Mini-Card Style) */}
      {hoveredIndex !== null && (
        <div 
          className="trend-tooltip" 
          style={{ 
            left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
            top: `${(Math.min(points[hoveredIndex].incomeY, points[hoveredIndex].expenseY) / (chartHeight + 80)) * 100}%`
          }}
        >
          <strong>{last7Days[hoveredIndex].fullLabel}</strong>
          <div className="trend-tooltip-row">
            <span className="trend-tooltip-label">
              <i className="trend-tooltip-dot" style={{ background: 'var(--green)' }} />
              Masuk
            </span>
            <span className="trend-tooltip-value" style={{ color: 'var(--green)' }}>
              {rupiah.format(last7Days[hoveredIndex].income)}
            </span>
          </div>
          <div className="trend-tooltip-row">
            <span className="trend-tooltip-label">
              <i className="trend-tooltip-dot" style={{ background: 'var(--rose)' }} />
              Keluar
            </span>
            <span className="trend-tooltip-value" style={{ color: 'var(--rose)' }}>
              {rupiah.format(last7Days[hoveredIndex].expense)}
            </span>
          </div>
        </div>
      )}

      <svg 
        viewBox={`0 0 ${chartWidth} ${chartHeight + 80}`} 
        className="trend-svg" 
        width="100%" 
        height="auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--green)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--rose)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--rose)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 0.5, 1].map(v => (
          <line 
            key={v}
            x1={paddingX} y1={chartHeight - v * (chartHeight - 40)} 
            x2={chartWidth - paddingX} y2={chartHeight - v * (chartHeight - 40)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        ))}

        {/* Tracker Line */}
        {hoveredIndex !== null && (
          <line 
            x1={points[hoveredIndex].x} y1="0" 
            x2={points[hoveredIndex].x} y2={chartHeight} 
            stroke="var(--slate-mid)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4"
          />
        )}

        {/* Areas */}
        <path d={incomeArea} fill="url(#incomeGradient)" />
        <path d={expenseArea} fill="url(#expenseGradient)" />
        
        {/* Lines */}
        <path d={incomePath} fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={expensePath} fill="none" stroke="var(--rose)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Labels & Markers */}
        {points.map((p, i) => (
          <g key={i}>
            {/* Markers */}
            <circle 
              cx={p.x} cy={p.incomeY} r={hoveredIndex === i ? 6 : 4} 
              fill={hoveredIndex === i ? "var(--green)" : "var(--bg-card)"} 
              stroke="var(--green)" strokeWidth="2.5" 
              style={{ transition: 'all 0.2s' }}
            />
            <circle 
              cx={p.x} cy={p.expenseY} r={hoveredIndex === i ? 6 : 4} 
              fill={hoveredIndex === i ? "var(--rose)" : "var(--bg-card)"} 
              stroke="var(--rose)" strokeWidth="2.5" 
              style={{ transition: 'all 0.2s' }}
            />
            
            {/* Day Labels */}
            <text 
              x={p.x} y={chartHeight + 35} textAnchor="middle" fontSize="14" 
              fill={hoveredIndex === i ? "var(--fg)" : "var(--muted)"} 
              fontWeight={hoveredIndex === i ? "800" : "700"}
              style={{ transition: 'all 0.2s' }}
            >
              {last7Days[i].label}
            </text>
          </g>
        ))}

        {/* Interaction Areas (Hit boxes) */}
        {points.map((p, i) => (
          <rect 
            key={`hit-${i}`}
            x={p.x - 40} y="0" width="80" height={chartHeight + 50}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

        {/* Legend */}
        <g transform={`translate(${chartWidth/2 - 100}, ${chartHeight + 65})`}>
          <circle cx="0" cy="0" r="5" fill="var(--green)" />
          <text x="12" y="5" fontSize="13" fontWeight="700" fill="var(--muted)">Pemasukan</text>
          
          <circle cx="110" cy="0" r="5" fill="var(--rose)" />
          <text x="122" y="5" fontSize="13" fontWeight="700" fill="var(--muted)">Pengeluaran</text>
        </g>
      </svg>
    </div>
  );
}

function DonutChart({ income, expense }: { income: number; expense: number }) {
  const total = income + expense;
  const incomePct = total === 0 ? 0 : Math.round((income / total) * 100);
  const expensePct = total === 0 ? 0 : 100 - incomePct;

  // SVG calculations for the donut chart
  const incomeValue = total === 0 ? 0 : incomePct;
  const expenseValue = total === 0 ? 0 : expensePct;

  const breakdown = [
    { label: "Pemasukan", value: incomePct, color: "var(--green)" },
    { label: "Pengeluaran", value: expensePct, color: "var(--rose)" },
  ];

  return (
    <>
      <div className="donut-chart" aria-label="Grafik pengeluaran">
        <svg viewBox="0 0 36 36" className="donut-svg">
          {/* Background circle */}
          <circle 
            cx="18" cy="18" r="15.9155" 
            fill="none" 
            stroke="var(--border)" 
            strokeWidth="4" 
          />
          {/* Income segment */}
          <circle 
            cx="18" cy="18" r="15.9155" 
            fill="none" 
            stroke="var(--green)" 
            strokeWidth="4" 
            strokeDasharray={`${incomeValue} ${100 - incomeValue}`}
            strokeDashoffset="25"
            style={{ transition: "stroke-dasharray 0.3s ease" }}
          />
          {/* Expense segment */}
          <circle 
            cx="18" cy="18" r="15.9155" 
            fill="none" 
            stroke="var(--rose)" 
            strokeWidth="4" 
            strokeDasharray={`${expenseValue} ${100 - expenseValue}`}
            strokeDashoffset={25 - incomeValue}
            style={{ transition: "stroke-dasharray 0.3s ease" }}
          />
        </svg>
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
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation 300ms before closing
    const exitTimer = setTimeout(() => setIsExiting(true), 3200);
    const closeTimer = setTimeout(onClose, 3500);
    
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div className="toast-wrapper">
      <div className={`toast-notification ${type} ${isExiting ? 'is-exiting' : ''}`}>
        <span>{message}</span>
        <button onClick={onClose} type="button" aria-label="Tutup">✕</button>
        <div className="toast-progress"></div>
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


function ExportModal({ onClose, onExport, onCSV, onExcel }: { 
  onClose: () => void, 
  onExport: () => void,
  onCSV: () => void,
  onExcel: () => void
}) {
  return (
    <div className="modal-backdrop no-print">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Ekspor Dokumen</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--muted)' }}>✕</button>
        </div>
        
        <div className="modal-body">
          <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: '14px' }}>
            Pilih format dokumen yang ingin Anda unduh untuk histori transaksi saat ini.
          </p>
          
          <div className="export-options-grid">
            <button className="export-option-card" onClick={onExport}>
              <div className="export-icon pdf"><DownloadIcon /></div>
              <div className="export-info">
                <strong>Dokumen PDF</strong>
                <span>Laporan resmi & rapi</span>
              </div>
            </button>

            <button className="export-option-card" onClick={onCSV}>
              <div className="export-icon csv"><CalendarIcon /></div>
              <div className="export-info">
                <strong>Data CSV</strong>
                <span>Untuk Google Sheets</span>
              </div>
            </button>

            <button className="export-option-card" onClick={onExcel}>
              <div className="export-icon excel"><SummaryIcon /></div>
              <div className="export-info">
                <strong>Data Excel</strong>
                <span>Format .xls (Spreadsheet)</span>
              </div>
            </button>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="btn-cancel" style={{ width: '100%' }} onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

// Helper: Export to CSV
function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportToCSV(data: Transaction[]) {
  const headers = ["Tanggal", "Keterangan", "Kategori", "Atas Nama", "Metode", "Tipe", "Nominal"];
  const rows = data.map(t => [
    t.date,
    `"${t.title.replace(/"/g, '""')}"`,
    t.category,
    `"${(t.atas_nama || "-").replace(/"/g, '""')}"`,
    t.metode_pembayaran,
    t.type,
    t.amount
  ]);
  
  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  triggerDownload(csvContent, `Dompetku-History-${new Date().toISOString().split('T')[0]}.csv`, "text/csv;charset=utf-8;");
}

function exportToExcel(data: Transaction[]) {
  // Simple HTML table trick for Excel (natively supported as spreadsheet)
  const rows = data.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.title}</td>
      <td>${t.category}</td>
      <td>${t.atas_nama || "-"}</td>
      <td>${t.metode_pembayaran}</td>
      <td>${t.type}</td>
      <td>${t.amount}</td>
    </tr>
  `).join("");

  const table = `
    <table border="1">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th>Tanggal</th>
          <th>Keterangan</th>
          <th>Kategori</th>
          <th>Atas Nama</th>
          <th>Metode</th>
          <th>Tipe</th>
          <th>Nominal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Histori Transaksi</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>${table}</body>
    </html>
  `;

  triggerDownload(excelContent, `Dompetku-History-${new Date().toISOString().split('T')[0]}.xls`, "application/vnd.ms-excel");
}

function PrintReportHeader({ title, period }: { title: string; period: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = useMemo(() => {
    if (!mounted) return "";
    return new Intl.DateTimeFormat("id-ID", { 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    }).format(new Date());
  }, [mounted]);

  return (
    <div className="report-header-print">
      <div className="report-info">
        <h1>{title}</h1>
        <p>Aplikasi Keuangan Dompetku</p>
      </div>
      <div className="report-meta">
        <div><strong>Periode:</strong> {period}</div>
        <div><span>Dicetak pada:</span> {today}</div>
      </div>
    </div>
  );
}

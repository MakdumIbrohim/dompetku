"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

type TransactionType = "Pemasukan" | "Pengeluaran";

export type Transaction = {
  id: string;
  date: string;
  title: string;
  atas_nama: string;
  type: TransactionType;
  category: string;
  metode_pembayaran: string;
  amount: number;
  created_at: string;
};

interface DataContextType {
  transactions: Transaction[];
  isLoading: boolean;
  isSubmitting: boolean;
  fetchData: () => Promise<void>;
  addTransaction: (data: any) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  updateTransaction: (data: Transaction) => Promise<boolean>;
}

export const defaultIncomeCategories = [
  "Gaji",
  "Bonus",
  "Investasi",
  "Penjualan",
  "Pemasukan",
];

export const defaultExpenseCategories = [
  "Makanan & Minuman",
  "Transportasi",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Kesehatan",
  "Pendidikan",
  "Cicilan/Utang",
  "Pengeluaran",
];

const DataContext = createContext<DataContextType | undefined>(undefined);

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || "";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFetchedUser, setLastFetchedUser] = useState<string | null>(null);
  
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!GAS_URL || !user) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${GAS_URL}?user=${user.username}`);
      const data = await res.json();
      if (data.status === "success") {
        const mappedData: Transaction[] = data.data.map((item: any) => ({
          id: String(item.id_transaksi),
          date: item.tanggal ? (() => {
            const d = new Date(item.tanggal);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })() : "",
          title: item.keterangan,
          category: item.kategori || (item.jenis === "Pemasukan" ? "Pemasukan" : "Pengeluaran"),
          atas_nama: item.atas_nama,
          type: item.jenis as TransactionType,
          metode_pembayaran: item.metode_pembayaran,
          amount: Number(item.nominal) || 0,
          created_at: item.created_at,
        })).reverse();
        setTransactions(mappedData);
        setLastFetchedUser(user.username);
      }
    } catch (err) {
      console.error("Terjadi kesalahan koneksi ke server", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, GAS_URL]);

  // Fetch data when user logs in or changes
  useEffect(() => {
    if (user && user.username !== lastFetchedUser) {
      fetchData();
    } else if (!user) {
      setTransactions([]);
      setLastFetchedUser(null);
    }
  }, [fetchData, user, lastFetchedUser]);

  const addTransaction = async (data: any) => {
    setIsSubmitting(true);
    const payload = {
      action: "CREATE",
      tanggal: data.date,
      keterangan: data.title,
      atas_nama: data.atas_nama,
      kategori: data.category,
      jenis: data.type,
      metode_pembayaran: data.metode_pembayaran,
      nominal: data.amount,
      username: user?.username, // Include username
    };

    try {
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
          category: data.category,
          atas_nama: data.atas_nama,
          type: data.type,
          metode_pembayaran: data.metode_pembayaran,
          amount: data.amount,
          created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
        ...items,
      ]);
      return true;
    } catch (err) {
      console.error("Gagal menyimpan:", err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    const prev = [...transactions];
    setTransactions((items) => items.filter((i) => i.id !== id));
    setIsSubmitting(true);
    try {
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "DELETE", id_transaksi: id }),
      });
      return true;
    } catch (err) {
      console.error("Gagal menghapus:", err);
      setTransactions(prev);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTransaction = async (updatedData: Transaction) => {
    const prev = [...transactions];
    setTransactions((items) => items.map((i) => (i.id === updatedData.id ? updatedData : i)));
    setIsSubmitting(true);
    try {
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "UPDATE",
          id_transaksi: updatedData.id,
          tanggal: updatedData.date,
          keterangan: updatedData.title,
          kategori: updatedData.category,
          atas_nama: updatedData.atas_nama,
          jenis: updatedData.type,
          metode_pembayaran: updatedData.metode_pembayaran,
          nominal: updatedData.amount,
        }),
      });
      return true;
    } catch (err) {
      console.error("Gagal memperbarui:", err);
      setTransactions(prev);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DataContext.Provider
      value={{
        transactions,
        isLoading,
        isSubmitting,
        fetchData,
        addTransaction,
        deleteTransaction,
        updateTransaction,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

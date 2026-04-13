"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type TransactionType = "Pemasukan" | "Pengeluaran";

export type Transaction = {
  id: string;
  date: string;
  title: string;
  atas_nama: string;
  type: TransactionType;
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

const DataContext = createContext<DataContextType | undefined>(undefined);

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || "";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    if (!GAS_URL) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(GAS_URL);
      const data = await res.json();
      if (data.status === "success") {
        const mappedData: Transaction[] = data.data.map((item: any) => ({
          id: String(item.id_transaksi),
          date: item.tanggal ? new Date(item.tanggal).toISOString().split("T")[0] : "",
          title: item.keterangan,
          atas_nama: item.atas_nama,
          type: item.jenis as TransactionType,
          metode_pembayaran: item.metode_pembayaran,
          amount: Number(item.nominal) || 0,
          created_at: item.created_at,
        })).reverse();
        setTransactions(mappedData);
        setHasLoaded(true);
      }
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    if (!hasLoaded) {
      fetchData();
    }
  }, [fetchData, hasLoaded]);

  const addTransaction = async (data: any) => {
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
    }
  };

  const updateTransaction = async (updatedData: Transaction) => {
    const prev = [...transactions];
    setTransactions((items) => items.map((i) => (i.id === updatedData.id ? updatedData : i)));

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
          nominal: updatedData.amount,
        }),
      });
      return true;
    } catch (err) {
      console.error("Gagal memperbarui:", err);
      setTransactions(prev);
      return false;
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

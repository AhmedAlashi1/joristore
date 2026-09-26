import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearCustomerId,
  getCachedCustomerProfile,
  getCustomerId,
  setCachedCustomerProfile,
  setCustomerId,
} from '../lib/customer-storage';
import { customerApi } from '../lib/api';
import { removePushSubscription } from '../lib/push-subscribe';

export type CustomerProfile = {
  id: number;
  first_name: string;
  last_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  orders_count: number;
  total_spent: number;
  addresses?: CustomerAddress[];
};

export type CustomerAddress = {
  id: number;
  label?: string;
  full_name: string;
  phone?: string;
  delivery_region_id?: number;
  region_name?: string;
  city: string;
  area?: string;
  street?: string;
  building?: string;
  notes?: string;
  is_default: boolean;
};

type CustomerCtx = {
  customer: CustomerProfile | null;
  isLoggedIn: boolean;
  login: (phone: string) => Promise<void>;
  register: (data: { first_name: string; last_name?: string; email?: string; phone: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setCustomerLocal: (c: CustomerProfile | null) => void;
};

const CustomerContext = createContext<CustomerCtx | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    const id = getCustomerId();
    if (!id) return null;
    return getCachedCustomerProfile();
  });

  const refresh = async () => {
    const id = getCustomerId();
    if (!id) {
      setCustomer(null);
      return;
    }
    try {
      const res = await customerApi.profile();
      setCustomer(res);
      setCachedCustomerProfile(res);
    } catch {
      const cached = getCachedCustomerProfile();
      if (cached?.id === id) {
        setCustomer(cached);
        return;
      }
      clearCustomerId();
      setCustomer(null);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<CustomerCtx>(() => ({
    customer,
    isLoggedIn: !!customer,
    login: async (phone) => {
      const res = await customerApi.login(phone);
      setCustomerId(res.id);
      setCustomer(res);
      setCachedCustomerProfile(res);
    },
    register: async (data) => {
      const res = await customerApi.register(data);
      setCustomerId(res.id);
      setCustomer(res);
      setCachedCustomerProfile(res);
    },
    logout: () => {
      void removePushSubscription();
      clearCustomerId();
      setCustomer(null);
    },
    refresh,
    setCustomerLocal: setCustomer,
  }), [customer]);

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer outside provider');
  return ctx;
}

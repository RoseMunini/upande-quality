import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage, StorageKeys } from '@/src/core/storage';

// Single-farm build: no instance-mapper, no `tenant` field. Kept the file
// name and exports (`TenantProvider`, `useTenant`) so app/_layout.tsx and
// login.tsx need no import changes — this is purely an instance-URL store
// now. (Rename candidate later: tenant-context.tsx -> instance-context.tsx,
// useTenant -> useInstance.)
type TenantContextValue = {
  instanceUrl: string | null;
  setInstanceUrl: (url: string | null) => Promise<void>;
  hydrated: boolean;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [instanceUrl, setUrlState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await storage.get(StorageKeys.instanceUrl);
      setUrlState(stored);
      setHydrated(true);
    })();
  }, []);

  const setInstanceUrl = async (url: string | null) => {
    if (url) await storage.set(StorageKeys.instanceUrl, url);
    else await storage.remove(StorageKeys.instanceUrl);
    setUrlState(url);
  };

  return (
    <TenantContext.Provider value={{ instanceUrl, setInstanceUrl, hydrated }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside <TenantProvider>');
  return ctx;
}

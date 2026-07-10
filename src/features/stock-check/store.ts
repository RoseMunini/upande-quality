import { create } from 'zustand';
import {
  stockCheckRepository,
  type GreenhouseStock,
  type SalesOrderLine,
  type SalesOrderSummary,
  type StockTransferRequest,
  type SubmitOutcome,
} from './repository';

type State = {
  searchQuery: string;
  searchResults: SalesOrderSummary[];
  searching: boolean;

  selectedOrder: SalesOrderSummary | null;
  orderLines: SalesOrderLine[];
  linesLoading: boolean;

  stockByLine: Record<string, GreenhouseStock[]>;
  stockLoading: Record<string, boolean>;

  requesting: boolean;
  pendingRequests: StockTransferRequest[];
  pendingRequestsLoading: boolean;
  resolving: boolean;

  search: (query: string) => Promise<void>;
  selectOrder: (order: SalesOrderSummary) => Promise<void>;
  clearOrder: () => void;

  checkAvailability: (itemCode: string) => Promise<GreenhouseStock[]>;

  sendTransferRequest: (args: {
    itemCode: string;
    greenhouse: string;
    bucketId: string;
    stemQty: number;
  }) => Promise<SubmitOutcome>;

  recordShortfall: (args: {
    itemCode: string;
    requiredQty: number;
    availableQty: number;
    shortfallQty: number;
  }) => Promise<SubmitOutcome>;

  loadPendingRequests: () => Promise<void>;
  resolveRequest: (name: string, action: 'fulfill' | 'reject') => Promise<SubmitOutcome>;
};

export const useStockCheckStore = create<State>((set, get) => ({
  searchQuery: '',
  searchResults: [],
  searching: false,

  selectedOrder: null,
  orderLines: [],
  linesLoading: false,

  stockByLine: {},
  stockLoading: {},

  requesting: false,
  pendingRequests: [],
  pendingRequestsLoading: false,
  resolving: false,

  search: async (query) => {
    set({ searchQuery: query, searching: true });
    const results = await stockCheckRepository.searchSalesOrders(query);
    set({ searchResults: results, searching: false });
  },

  selectOrder: async (order) => {
    set({ selectedOrder: order, linesLoading: true, orderLines: [], stockByLine: {} });
    const lines = await stockCheckRepository.getSalesOrderLines(order.name);
    set({ orderLines: lines, linesLoading: false });
  },

  clearOrder: () => set({ selectedOrder: null, orderLines: [], stockByLine: {} }),

  checkAvailability: async (itemCode) => {
    set((s) => ({ stockLoading: { ...s.stockLoading, [itemCode]: true } }));
    const stock = await stockCheckRepository.findVarietyStock(itemCode);
    set((s) => ({
      stockByLine: { ...s.stockByLine, [itemCode]: stock },
      stockLoading: { ...s.stockLoading, [itemCode]: false },
    }));
    return stock;
  },

  sendTransferRequest: async ({ itemCode, greenhouse, bucketId, stemQty }) => {
    const { selectedOrder } = get();
    if (!selectedOrder) return { kind: 'error', message: 'No order selected.' };
    set({ requesting: true });
    const outcome = await stockCheckRepository.createStockTransferRequest({
      salesOrder: selectedOrder.name,
      itemCode,
      sourceGreenhouse: greenhouse,
      bucketId,
      stemQty,
    });
    set({ requesting: false });
    return outcome;
  },

  recordShortfall: async ({ itemCode, requiredQty, availableQty, shortfallQty }) => {
    const { selectedOrder } = get();
    if (!selectedOrder) return { kind: 'error', message: 'No order selected.' };
    return stockCheckRepository.recordStockShortfall({
      salesOrder: selectedOrder.name,
      itemCode,
      requiredQty,
      availableQty,
      shortfallQty,
    });
  },

  loadPendingRequests: async () => {
    set({ pendingRequestsLoading: true });
    const rows = await stockCheckRepository.listStockTransferRequests();
    set({ pendingRequests: rows, pendingRequestsLoading: false });
  },

  resolveRequest: async (name, action) => {
    set({ resolving: true });
    const outcome = await stockCheckRepository.resolveStockTransferRequest(name, action);
    set({ resolving: false });
    if (outcome.kind === 'ok') {
      set((s) => ({ pendingRequests: s.pendingRequests.filter((r) => r.name !== name) }));
    }
    return outcome;
  },
}));

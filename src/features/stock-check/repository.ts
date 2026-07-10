import { stockCheckApi, type RawSalesOrder, type RawSalesOrderLine, type RawShelfStock, type RawStockTransferRequest } from './api';

export type SalesOrderSummary = {
  name: string;
  customerName: string;
  transactionDate: string;
  status: string;
};

export type SalesOrderLine = {
  itemCode: string;
  itemName: string;
  qty: number;
  stockUom: string;
};

export type GreenhouseStock = {
  greenhouse: string;
  totalStems: number;
  buckets: { bucketId: string; stemQty: number; shelf: string }[];
};

export type StockTransferRequest = {
  name: string;
  salesOrder: string;
  itemCode: string;
  sourceGreenhouse: string;
  bucketId: string;
  stemQty: number;
  requestedBy: string;
  requestedAt: string;
};

export type SubmitOutcome = { kind: 'ok'; name: string } | { kind: 'error'; message: string };

/** Groups the flat per-bucket rows returned by find_variety_stock_by_greenhouse into one row per greenhouse. */
export function aggregateByGreenhouse(rows: RawShelfStock[]): GreenhouseStock[] {
  const byGreenhouse = new Map<string, GreenhouseStock>();
  for (const row of rows) {
    const key = row.greenhouse || 'Unknown';
    const existing = byGreenhouse.get(key);
    const bucket = { bucketId: row.bucket_id, stemQty: row.stem_qty, shelf: row.shelf };
    if (existing) {
      existing.totalStems += row.stem_qty;
      existing.buckets.push(bucket);
    } else {
      byGreenhouse.set(key, { greenhouse: key, totalStems: row.stem_qty, buckets: [bucket] });
    }
  }
  return Array.from(byGreenhouse.values()).sort((a, b) => b.totalStems - a.totalStems);
}

export const stockCheckRepository = {
  async searchSalesOrders(query: string): Promise<SalesOrderSummary[]> {
    try {
      const res = await stockCheckApi.searchSalesOrders(query);
      return (res.message ?? []).map((o: RawSalesOrder) => ({
        name: o.name,
        customerName: o.customer_name || o.customer,
        transactionDate: o.transaction_date,
        status: o.status,
      }));
    } catch {
      return [];
    }
  },

  async getSalesOrderLines(salesOrder: string): Promise<SalesOrderLine[]> {
    try {
      const res = await stockCheckApi.getSalesOrderLines(salesOrder);
      return (res.message ?? []).map((l: RawSalesOrderLine) => ({
        itemCode: l.item_code,
        itemName: l.item_name || l.item_code,
        qty: l.qty,
        stockUom: l.stock_uom,
      }));
    } catch {
      return [];
    }
  },

  async findVarietyStock(variety: string): Promise<GreenhouseStock[]> {
    try {
      const res = await stockCheckApi.findVarietyStockByGreenhouse(variety);
      return aggregateByGreenhouse(res.message ?? []);
    } catch {
      return [];
    }
  },

  async createStockTransferRequest(args: {
    salesOrder: string;
    itemCode: string;
    sourceGreenhouse: string;
    bucketId: string;
    stemQty: number;
  }): Promise<SubmitOutcome> {
    try {
      const res = await stockCheckApi.createStockTransferRequest({
        sales_order: args.salesOrder,
        item_code: args.itemCode,
        source_greenhouse: args.sourceGreenhouse,
        bucket_id: args.bucketId,
        stem_qty: args.stemQty,
      });
      if (res.error) return { kind: 'error', message: res.error };
      return { kind: 'ok', name: res.name ?? '' };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to send request.' };
    }
  },

  async listStockTransferRequests(): Promise<StockTransferRequest[]> {
    try {
      const res = await stockCheckApi.listStockTransferRequests();
      return (res.message ?? []).map((r: RawStockTransferRequest) => ({
        name: r.name,
        salesOrder: r.sales_order,
        itemCode: r.item_code,
        sourceGreenhouse: r.source_greenhouse ?? '',
        bucketId: r.bucket_id,
        stemQty: r.stem_qty,
        requestedBy: r.requested_by,
        requestedAt: r.requested_at,
      }));
    } catch {
      return [];
    }
  },

  async resolveStockTransferRequest(name: string, action: 'fulfill' | 'reject'): Promise<SubmitOutcome> {
    try {
      const res = await stockCheckApi.resolveStockTransferRequest(name, action);
      if (res.error) return { kind: 'error', message: res.error };
      return { kind: 'ok', name };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to update request.' };
    }
  },

  async recordStockShortfall(args: {
    salesOrder: string;
    itemCode: string;
    requiredQty: number;
    availableQty: number;
    shortfallQty: number;
    reason?: string;
  }): Promise<SubmitOutcome> {
    try {
      const res = await stockCheckApi.recordStockShortfall({
        sales_order: args.salesOrder,
        item_code: args.itemCode,
        required_qty: args.requiredQty,
        available_qty: args.availableQty,
        shortfall_qty: args.shortfallQty,
        reason: args.reason,
      });
      if (res.error) return { kind: 'error', message: res.error };
      return { kind: 'ok', name: res.name ?? '' };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to record shortfall.' };
    }
  },
};

import { api } from '@/src/core/api/client';

export type RawSalesOrder = {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  status: string;
};

export type RawSalesOrderLine = {
  item_code: string;
  item_name: string;
  qty: number;
  stock_uom: string;
  custom_stock_available?: number;
  custom_fully_allocated?: number;
};

export type RawShelfStock = {
  bucket_id: string;
  greenhouse: string;
  stem_qty: number;
  shelf: string;
};

export type RawStockTransferRequest = {
  name: string;
  sales_order: string;
  item_code: string;
  source_greenhouse: string | null;
  bucket_id: string;
  stem_qty: number;
  requested_by: string;
  requested_at: string;
  notes: string | null;
};

type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const stockCheckApi = {
  searchSalesOrders(query: string): Promise<MethodResponse<{ message?: RawSalesOrder[] }>> {
    return api({
      method: 'POST',
      url: '/api/method/search_sales_orders',
      data: { query },
      validateStatus: () => true,
    });
  },

  getSalesOrderLines(salesOrder: string): Promise<MethodResponse<{ message?: RawSalesOrderLine[] }>> {
    return api({
      method: 'POST',
      url: '/api/method/get_sales_order_lines',
      data: { sales_order: salesOrder },
      validateStatus: () => true,
    });
  },

  findVarietyStockByGreenhouse(
    variety: string,
    excludeGreenhouse?: string,
  ): Promise<MethodResponse<{ message?: RawShelfStock[] }>> {
    return api({
      method: 'POST',
      url: '/api/method/find_variety_stock_by_greenhouse',
      data: { variety, exclude_greenhouse: excludeGreenhouse },
      validateStatus: () => true,
    });
  },

  createStockTransferRequest(payload: {
    sales_order: string;
    item_code: string;
    source_greenhouse?: string;
    bucket_id?: string;
    stem_qty: number;
    notes?: string;
  }): Promise<MethodResponse<{ message?: string; name?: string }>> {
    return api({
      method: 'POST',
      url: '/api/method/create_stock_transfer_request',
      data: payload,
      validateStatus: () => true,
    });
  },

  listStockTransferRequests(): Promise<MethodResponse<{ message?: RawStockTransferRequest[] }>> {
    return api({
      method: 'POST',
      url: '/api/method/list_stock_transfer_requests',
      validateStatus: () => true,
    });
  },

  resolveStockTransferRequest(
    name: string,
    action: 'fulfill' | 'reject',
  ): Promise<MethodResponse<{ message?: string }>> {
    return api({
      method: 'POST',
      url: '/api/method/resolve_stock_transfer_request',
      data: { name, action },
      validateStatus: () => true,
    });
  },

  recordStockShortfall(payload: {
    sales_order: string;
    item_code: string;
    required_qty: number;
    available_qty: number;
    shortfall_qty: number;
    reason?: string;
  }): Promise<MethodResponse<{ message?: string; name?: string }>> {
    return api({
      method: 'POST',
      url: '/api/method/record_stock_shortfall',
      data: payload,
      validateStatus: () => true,
    });
  },
};

import { apiFetch } from './client';
import {
    StockMovement, StockMovementCreate, StockProduct, StockProductCreate,
    StockPurchase, StockPurchaseCreate, StockSummary
} from './types';

const qs = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') search.set(key, String(value));
    });
    const query = search.toString();
    return query ? `?${query}` : '';
};

export const stockApi = {

    getProducts: (params?: { search?: string; skip?: number; limit?: number }) =>
        apiFetch<StockProduct[]>(`/api/v1/stock/products${qs({ ...params })}`),
    createProduct: (data: StockProductCreate) =>
        apiFetch<StockProduct>('/api/v1/stock/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id: number, data: Partial<StockProductCreate>) =>
        apiFetch<StockProduct>(`/api/v1/stock/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id: number) =>
        apiFetch<void>(`/api/v1/stock/products/${id}`, { method: 'DELETE' }),
    getProduct: (id: number) =>
        apiFetch<StockProduct>(`/api/v1/stock/products/${id}`),

    getPurchases: (params?: { productId?: number; skip?: number; limit?: number }) =>
        apiFetch<StockPurchase[]>(
            `/api/v1/stock/purchases${qs({
                product_id: params?.productId,
                skip: params?.skip,
                limit: params?.limit,
            })}`
        ),
    createPurchase: (data: StockPurchaseCreate) =>
        apiFetch<StockPurchase>('/api/v1/stock/purchases', { method: 'POST', body: JSON.stringify(data) }),

    getMovements: (params?: { productId?: number; skip?: number; limit?: number }) =>
        apiFetch<StockMovement[]>(
            `/api/v1/stock/movements${qs({
                product_id: params?.productId,
                skip: params?.skip,
                limit: params?.limit ?? 50,
            })}`
        ),
    createMovement: (data: StockMovementCreate) =>
        apiFetch<StockMovement>('/api/v1/stock/movements', { method: 'POST', body: JSON.stringify(data) }),

    getSummary: () => apiFetch<StockSummary>('/api/v1/stock/summary'),

};

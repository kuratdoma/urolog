import { apiFetch } from './client';
import {
    StockMovement, StockProduct, StockProductCreate, StockPurchase, StockSummary
} from './types';

export const stockApi = {

        getProducts: (params?: { search?: string; skip?: number; limit?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.search) searchParams.set('search', params.search);
            if (params?.skip) searchParams.set('skip', String(params.skip));
            if (params?.limit) searchParams.set('limit', String(params.limit));
            return apiFetch<StockProduct[]>(`/api/v1/stock/products?${searchParams.toString()}`);
        },
        createProduct: (data: StockProductCreate) =>
            apiFetch<StockProduct>('/api/v1/stock/products', { method: 'POST', body: JSON.stringify(data) }),
        updateProduct: (id: number, data: Partial<StockProductCreate>) =>
            apiFetch<StockProduct>(`/api/v1/stock/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteProduct: (id: number) =>
            apiFetch<void>(`/api/v1/stock/products/${id}`, { method: 'DELETE' }),
        getProduct: (id: number) =>
            apiFetch<StockProduct>(`/api/v1/stock/products/${id}`),

        getPurchases: (productId?: number) => {
            const url = productId ? `/api/v1/stock/purchases?product_id=${productId}` : '/api/v1/stock/purchases';
            return apiFetch<StockPurchase[]>(url);
        },
        createPurchase: (data: Partial<StockPurchase>) =>
            apiFetch<StockPurchase>('/api/v1/stock/purchases', { method: 'POST', body: JSON.stringify(data) }),

        getMovements: (productId?: number, limit: number = 50) => {
            const searchParams = new URLSearchParams();
            if (productId) searchParams.set('product_id', String(productId));
            searchParams.set('limit', String(limit));
            return apiFetch<StockMovement[]>(`/api/v1/stock/movements?${searchParams.toString()}`);
        },
        createMovement: (data: Partial<StockMovement>) =>
            apiFetch<StockMovement>('/api/v1/stock/movements', { method: 'POST', body: JSON.stringify(data) }),

        getSummary: () => apiFetch<StockSummary>('/api/v1/stock/summary'),
    
};

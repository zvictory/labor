import { apiFetch, ApiError } from './client';

export interface OrderSummary {
  id: number;
  number: string;
  state: string;
  total: number;
  completed_at: string | null;
}

export interface OrderLineItem {
  name: string;
  slug: string;
  image: string | null;
  quantity: number;
  price: number;
  line_total: number;
}

export interface OrderShipAddress {
  name: string;
  phone: string;
  city: string;
  address1: string;
  address2: string | null;
  zipcode: string;
}

export interface OrderShipment {
  state: string;
  tracking: string | null;
}

export interface OrderPayment {
  state: string;
  method: string;
}

export interface OrderDetail {
  id: number;
  number: string;
  state: string;
  completed_at: string | null;
  total: number;
  line_items: OrderLineItem[];
  ship_address: OrderShipAddress | null;
  shipments: OrderShipment[];
  payments: OrderPayment[];
}

interface OrdersListResponse {
  data: OrderSummary[];
}

interface OrderDetailResponse {
  data: OrderDetail;
}

const toMessage = (err: unknown): string => {
  if (err instanceof ApiError) {
    if (err.body && typeof err.body === 'object' && 'error' in err.body) {
      const e = (err.body as { error?: unknown }).error;
      if (typeof e === 'string') return e;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
};

export const getOrders = async (locale: string, token: string): Promise<OrderSummary[]> => {
  try {
    const res = await apiFetch<OrdersListResponse>('/storefront/account/orders', { locale, token });
    return res.data;
  } catch (e) {
    throw new Error(toMessage(e));
  }
};

export const getOrder = async (
  number: string,
  locale: string,
  token: string
): Promise<OrderDetail> => {
  try {
    const res = await apiFetch<OrderDetailResponse>(
      `/storefront/account/orders/${encodeURIComponent(number)}`,
      { locale, token }
    );
    return res.data;
  } catch (e) {
    throw new Error(toMessage(e));
  }
};

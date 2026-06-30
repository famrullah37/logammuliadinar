export interface ProductMaster {
  id: string;
  name: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  type_name: string;
  weight: number;
  products?: ProductMaster;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Price {
  id: string;
  brand_id: string;
  variant_id: string;
  harga_beli: number;
  harga_buyback: number;
  created_at?: string;
  brands?: Brand;
  product_variants?: ProductVariant;
}

export interface LandingPriceItem {
  harga_beli: number;
  harga_buyback: number;
  variant_id: string;
  brands: Pick<Brand, "name"> | null;
  product_variants: {
    id: string;
    type_name: string;
    weight: number;
    products: Pick<ProductMaster, "name"> | null;
  } | null;
}

export interface PriceTableRow {
  variantId: string;
  productName: string;
  typeName: string;
  weight: number;
  byBrand: Record<string, { harga_beli: number; harga_buyback: number }>;
}

export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type DeliveryMethod = "pickup" | "delivery";
export type PaymentMethod = "transfer" | "cod";

export interface Order {
  id: string;
  order_number: string;
  variant_id: string;
  brand_id: string;
  quantity: number;
  harga_beli: number;
  total_harga: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string | null;
  delivery_method: DeliveryMethod;
  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_postal_code?: string | null;
  payment_method: PaymentMethod;
  notes?: string | null;
  status: OrderStatus;
  created_at?: string;
  product_variants?: ProductVariant;
  brands?: Brand;
}

export interface CreateOrderPayload {
  variant_id: string;
  brand_id: string;
  quantity: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string;
  delivery_method: DeliveryMethod;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  payment_method: PaymentMethod;
  notes?: string;
}

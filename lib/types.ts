export interface ProductMaster {
  id: string;
  name: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  type_name: string;
  weight: number;
  purity?: string;
  image_url?: string | null;
  description?: string | null;
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
  image_url?: string | null;
  description?: string | null;
  created_at?: string;
  /** waktu harga terakhir diubah */
  updated_at?: string;
  brands?: Brand;
  product_variants?: ProductVariant;
}

export interface LandingPriceItem {
  harga_beli: number;
  harga_buyback: number;
  variant_id: string;
  /** link halaman detail brand × pecahan */
  href?: string | null;
  /** null = stok tidak dilacak */
  stock?: number | null;
  updated_at?: string;
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
  byBrand: Record<string, { harga_beli: number; harga_buyback: number; href?: string | null; stock?: number | null }>;
}

export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type DeliveryMethod = "pickup" | "delivery";
export type PaymentMethod = "transfer" | "cod" | "cash";
export type Channel = "online" | "store";

export interface Order {
  id: string;
  order_number: string;
  variant_id: string;
  brand_id: string;
  quantity: number;
  harga_beli: number;
  total_harga: number;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_email?: string | null;
  channel?: Channel;
  delivery_method: DeliveryMethod;
  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_postal_code?: string | null;
  payment_method: PaymentMethod;
  notes?: string | null;
  status: OrderStatus;
  /** kode unik 500-999, hanya untuk transfer */
  kode_unik?: number | null;
  /** total_harga + kode_unik (nominal yang harus ditransfer) */
  total_transfer?: number | null;
  /** ongkos kirim dari admin; null = belum dikonfirmasi (atau ambil sendiri) */
  ongkir?: number | null;
  /** total_harga + ongkir + kode_unik (dihitung database) */
  total_bayar?: number;
  invoice_number?: string | null;
  receipt_token?: string | null;
  completed_at?: string | null;
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

export type HandoverMethod = "store" | "shipping";

export interface BuybackRequest {
  id: string;
  request_number: string;
  variant_id: string;
  brand_id: string;
  quantity: number;
  harga_buyback: number;
  total_estimasi: number;
  total_final?: number | null;
  seller_name: string;
  seller_phone: string | null;
  seller_email?: string | null;
  channel?: Channel;
  payout_method?: "cash" | "transfer" | null;
  seller_bank?: string | null;
  seller_account_number?: string | null;
  seller_account_holder?: string | null;
  has_certificate: boolean;
  has_packaging: boolean;
  handover_method: HandoverMethod;
  notes?: string | null;
  status: OrderStatus;
  receipt_number?: string | null;
  receipt_token?: string | null;
  completed_at?: string | null;
  created_at?: string;
  product_variants?: { type_name: string; weight: number; products: { name: string } | null };
  brands?: { name: string };
}

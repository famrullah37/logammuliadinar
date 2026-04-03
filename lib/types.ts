export interface Product {
  id: string;
  name: string;
  harga_konsumen: number;
  harga_buyback: number;
  weight?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductMaster {
  id: string;
  name: string;
  weight: number;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Price {
  id: string;
  brand_id: string;
  product_id: string;
  harga_beli: number;
  harga_buyback: number;
  created_at?: string;
  brands?: Brand;
  products?: ProductMaster;
}

export interface LandingPriceItem {
  harga_beli: number;
  harga_buyback: number;
  brands: Pick<Brand, "name"> | null;
  products: Pick<ProductMaster, "name" | "weight"> | null;
}

export interface PriceTableRow {
  productName: string;
  weight: number;
  byBrand: Record<
    string,
    {
      harga_beli: number;
      harga_buyback: number;
    }
  >;
}

export interface User {
  id: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  harga_konsumen: number;
  harga_buyback: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
}

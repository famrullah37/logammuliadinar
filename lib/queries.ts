import "server-only";

// SELECT yang menghasilkan bentuk objek bersarang sama seperti yang dipakai UI
// (sebelumnya dari nested select Supabase): brands{...}, product_variants{..., products{...}}.

export const PRICE_SELECT = `
  SELECT pr.id, pr.brand_id, pr.variant_id, pr.harga_beli, pr.harga_buyback, pr.image_url, pr.description, pr.stock, pr.created_at, pr.updated_at,
         json_build_object('id', b.id, 'name', b.name) AS brands,
         json_build_object(
           'id', v.id, 'type_name', v.type_name, 'weight', v.weight, 'product_id', v.product_id,
           'products', json_build_object('id', p.id, 'name', p.name)
         ) AS product_variants
    FROM prices pr
    JOIN brands b ON b.id = pr.brand_id
    JOIN product_variants v ON v.id = pr.variant_id
    JOIN products p ON p.id = v.product_id
`;

export const ORDER_SELECT = `
  SELECT o.*,
         json_build_object(
           'type_name', v.type_name, 'weight', v.weight,
           'products', json_build_object('name', p.name)
         ) AS product_variants,
         json_build_object('name', b.name) AS brands
    FROM orders o
    JOIN product_variants v ON v.id = o.variant_id
    JOIN products p ON p.id = v.product_id
    JOIN brands b ON b.id = o.brand_id
`;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

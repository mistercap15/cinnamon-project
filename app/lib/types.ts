export type Money = { amount: string; currencyCode: string };
export type ProductImage = { url: string; altText: string | null };
export type Variant = { id: string; title: string; availableForSale: boolean; price: Money };
export type Product = {
  id: string; handle: string; title: string; productType: string; description: string;
  featuredImage: ProductImage | null; images: ProductImage[]; variants: Variant[];
  seo: { title: string | null; description: string | null }; demo: boolean;
};
export type Article = {
  id: string; handle: string; title: string; excerpt: string; contentHtml: string;
  tags: string[]; image: ProductImage | null; publishedAt: string; author: string;
  readTime: number; seo: { title: string | null; description: string | null };
};
export function money(price: Money) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currencyCode, maximumFractionDigits: 2 }).format(Number(price.amount));
}
export function firstVariant(product: Product) {
  return product.variants.find(v => v.availableForSale) ?? product.variants[0];
}

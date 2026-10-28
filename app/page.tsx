import Home from './home';
import { commerceConfigured, getArticles, getProducts } from './lib/shopify';
export const revalidate = 60;
export default async function Page() {
 const [products, articles] = await Promise.all([getProducts(), getArticles()]);
 return <Home products={products} articles={articles} preview={!commerceConfigured()} />;
}

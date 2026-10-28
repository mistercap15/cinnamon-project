import { NextResponse } from 'next/server';
import { commerceConfigured, storefront } from '../../lib/shopify';

type Line = { merchandiseId: string; quantity: number };
export async function POST(request: Request) {
  if (!commerceConfigured()) return NextResponse.json({ error: 'The shop is in preview. Checkout is not yet available.' }, { status: 503 });
  // Only the storefront itself may initiate a checkout; prices are never accepted from clients.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Please start checkout from the shop.' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 16000) return NextResponse.json({ error: 'Your bag is too large.' }, { status: 413 });
  let lines: Line[];
  try {
    const body = await request.json();
    if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 50) throw new Error();
    const seen = new Set<string>();
    lines = body.lines.map((line: Line) => {
      if (!line || !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(line.merchandiseId) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 || seen.has(line.merchandiseId)) throw new Error();
      seen.add(line.merchandiseId);
      return { merchandiseId: line.merchandiseId, quantity: line.quantity };
    });
  } catch { return NextResponse.json({ error: 'Please check the items and quantities in your bag.' }, { status: 400 }); }
  try {
    const result = await storefront<{ cartCreate: { cart: { checkoutUrl: string; totalQuantity: number } | null; userErrors: { message: string }[]; warnings: { message: string }[] } }>(`mutation Checkout($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl totalQuantity } userErrors { message } warnings { message } } }`, { input: { lines } }, true);
    const payload = result.cartCreate;
    if (payload.userErrors.length || payload.warnings?.length || !payload.cart || payload.cart.totalQuantity !== lines.reduce((sum, line) => sum + line.quantity, 0)) return NextResponse.json({ error: payload.userErrors[0]?.message || payload.warnings?.[0]?.message || 'Some items are no longer available in the requested quantity. Please review your bag.' }, { status: 409 });
    const checkoutUrl = new URL(payload.cart.checkoutUrl);
    if (checkoutUrl.protocol !== 'https:') throw new Error('Invalid checkout URL');
    return NextResponse.json({ checkoutUrl: checkoutUrl.href }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Checkout could not be created:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'We couldn’t open checkout just now. Your bag is saved; please try again shortly.' }, { status: 502 });
  }
}

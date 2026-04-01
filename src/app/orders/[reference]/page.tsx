import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Order, OrderItem } from '@/types/supabase';
import { OrderConfirmationView } from './OrderConfirmationView';
import { OrderPoller } from './OrderPoller';

type FullOrder = Order & { order_items: OrderItem[] };

async function fetchOrderByReference(
  reference: string
): Promise<FullOrder | null> {
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const result = await serviceSupabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('paystack_reference', reference)
    .single();

  if (result.error || !result.data) return null;
  return result.data as unknown as FullOrder;
}

interface PageProps {
  params: Promise<{ reference: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { reference } = await params;

  const order = await fetchOrderByReference(reference);

  if (order) {
    // Webhook arrived before page load — render confirmation immediately (no client JS needed)
    return <OrderConfirmationView order={order} />;
  }

  // Webhook still in flight — render client poller
  return <OrderPoller reference={reference} />;
}

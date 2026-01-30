import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Package, Calendar, CreditCard, MapPin, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  shipping_address: string | null;
  shipping_city: string | null;
  payment_method: string | null;
  order_items: OrderItem[];
}

export default function Orders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else {
        loadOrders();
      }
    }
  }, [user, authLoading, navigate]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string }> = {
      pending: { variant: 'outline', label: 'Pendiente' },
      processing: { variant: 'secondary', label: 'En proceso' },
      shipped: { variant: 'secondary', label: 'Enviado' },
      delivered: { variant: 'default', label: 'Completado', className: 'bg-success text-success-foreground' },
      cancelled: { variant: 'destructive', label: 'Cancelado' }
    };
    const { variant, label, className } = config[status] || { variant: 'outline', label: status };
    return <Badge variant={variant} className={className}>{label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-display font-bold mb-2">Mis Pedidos</h1>
          <p className="text-muted-foreground mb-8">Historial de todas tus compras</p>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No tienes pedidos aún</h2>
                <p className="text-muted-foreground mb-6">
                  Cuando realices tu primera compra, aparecerá aquí
                </p>
                <Button asChild>
                  <Link to="/">Explorar productos</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium">
                          Pedido #{order.id.slice(0, 8)}
                        </CardTitle>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          {order.payment_method === 'card' ? 'Tarjeta' : 'Contra entrega'}
                        </div>
                        {order.shipping_city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {order.shipping_city}
                          </div>
                        )}
                      </div>

                      <Accordion type="single" collapsible>
                        <AccordionItem value="items" className="border-0">
                          <AccordionTrigger className="py-2 text-sm hover:no-underline">
                            Ver {order.order_items.length} productos
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pt-2">
                              {order.order_items.map(item => (
                                <div
                                  key={item.id}
                                  className="flex justify-between text-sm py-2 border-b last:border-0"
                                >
                                  <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    <p className="text-muted-foreground">
                                      {item.quantity} × ${item.product_price.toFixed(2)}
                                    </p>
                                  </div>
                                  <p className="font-medium">${item.subtotal.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      <div className="flex justify-between items-center pt-4 border-t mt-4">
                        <span className="font-medium">Total</span>
                        <span className="text-xl font-bold text-primary">
                          ${order.total.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

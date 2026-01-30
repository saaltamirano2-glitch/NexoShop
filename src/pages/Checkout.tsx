import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, Truck, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type CheckoutStep = 'shipping' | 'payment' | 'confirmation' | 'success';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [processing, setProcessing] = useState(false);
  
  const [shippingData, setShippingData] = useState({
    fullName: '',
    address: '',
    city: '',
    phone: '',
    notes: ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (items.length === 0 && step !== 'success') {
    navigate('/cart');
    return null;
  }

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingData.fullName || !shippingData.address || !shippingData.city) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    setStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'card') {
      if (!cardData.number || !cardData.expiry || !cardData.cvv || !cardData.name) {
        toast.error('Por favor completa los datos de la tarjeta');
        return;
      }
    }
    setStep('confirmation');
  };

  const processOrder = async () => {
    setProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total: total,
          status: 'pending',
          shipping_address: shippingData.address,
          shipping_city: shippingData.city,
          payment_method: paymentMethod,
          notes: shippingData.notes || null
        })
        .select('id')
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items (stock will be reduced when order is completed by admin)
      for (const item of items) {
        await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.products?.name || '',
            product_price: item.products?.price || 0,
            quantity: item.quantity,
            subtotal: (item.products?.price || 0) * item.quantity
          });
      }
      
      // Clear the cart
      await clearCart();
      
      setStep('success');
      toast.success('¡Compra realizada con éxito!');
      
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Error al procesar el pedido. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19);
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    return numbers;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {['Envío', 'Pago', 'Confirmar'].map((label, index) => {
            const stepIndex = ['shipping', 'payment', 'confirmation'].indexOf(step);
            const isActive = index <= stepIndex || step === 'success';
            const isCurrent = index === stepIndex;
            
            return (
              <div key={label} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all
                  ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                `}>
                  {step === 'success' || index < stepIndex ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`mx-2 text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {index < 2 && (
                  <div className={`w-12 h-1 rounded ${index < stepIndex || step === 'success' ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Shipping Step */}
          {step === 'shipping' && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Información de Envío
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleShippingSubmit}>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Nombre completo *</Label>
                        <Input
                          id="fullName"
                          value={shippingData.fullName}
                          onChange={e => setShippingData({ ...shippingData, fullName: e.target.value })}
                          placeholder="Juan Pérez"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={shippingData.phone}
                          onChange={e => setShippingData({ ...shippingData, phone: e.target.value })}
                          placeholder="+1 234 567 890"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección *</Label>
                      <Input
                        id="address"
                        value={shippingData.address}
                        onChange={e => setShippingData({ ...shippingData, address: e.target.value })}
                        placeholder="Calle Principal #123, Colonia Centro"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">Ciudad *</Label>
                      <Input
                        id="city"
                        value={shippingData.city}
                        onChange={e => setShippingData({ ...shippingData, city: e.target.value })}
                        placeholder="Ciudad de México"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas adicionales</Label>
                      <Textarea
                        id="notes"
                        value={shippingData.notes}
                        onChange={e => setShippingData({ ...shippingData, notes: e.target.value })}
                        placeholder="Instrucciones especiales para la entrega..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => navigate('/cart')}>
                      Volver al carrito
                    </Button>
                    <Button type="submit">
                      Continuar al pago
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Método de Pago
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handlePaymentSubmit}>
                  <CardContent className="space-y-6">
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                          <CreditCard className="h-5 w-5" />
                          Tarjeta de crédito/débito
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Banknote className="h-5 w-5" />
                          Pago contra entrega
                        </Label>
                      </div>
                    </RadioGroup>

                    {paymentMethod === 'card' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-4 border-t"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Número de tarjeta</Label>
                          <Input
                            id="cardNumber"
                            value={cardData.number}
                            onChange={e => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiry">Fecha de expiración</Label>
                            <Input
                              id="expiry"
                              value={cardData.expiry}
                              onChange={e => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                              placeholder="MM/YY"
                              maxLength={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <Input
                              id="cvv"
                              value={cardData.cvv}
                              onChange={e => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                              placeholder="123"
                              maxLength={4}
                              type="password"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Nombre en la tarjeta</Label>
                          <Input
                            id="cardName"
                            value={cardData.name}
                            onChange={e => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                            placeholder="JUAN PEREZ"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          <ShieldCheck className="h-4 w-4 text-success" />
                          <span>Este es un pago simulado. No se realizará ningún cargo real.</span>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep('shipping')}>
                      Atrás
                    </Button>
                    <Button type="submit">
                      Revisar pedido
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          )}

          {/* Confirmation Step */}
          {step === 'confirmation' && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <img
                        src={item.products?.image_url || '/placeholder.svg'}
                        alt={item.products?.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.products?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Cantidad: {item.quantity} × ${item.products?.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-semibold">
                        ${((item.products?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Envío</span>
                      <span className="text-success">Gratis</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Información de Envío</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Nombre:</strong> {shippingData.fullName}</p>
                  <p><strong>Dirección:</strong> {shippingData.address}</p>
                  <p><strong>Ciudad:</strong> {shippingData.city}</p>
                  {shippingData.phone && <p><strong>Teléfono:</strong> {shippingData.phone}</p>}
                  <p><strong>Método de pago:</strong> {paymentMethod === 'card' ? 'Tarjeta de crédito/débito' : 'Pago contra entrega'}</p>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('payment')} disabled={processing}>
                  Atrás
                </Button>
                <Button onClick={processOrder} disabled={processing} size="lg" className="gap-2">
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Confirmar compra
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="h-12 w-12 text-success" />
              </motion.div>
              
              <h1 className="text-3xl font-display font-bold mb-4">¡Compra Exitosa!</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Tu pedido ha sido confirmado y está siendo procesado. Recibirás un correo con los detalles de tu compra.
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/orders')}>
                  Ver mis pedidos
                </Button>
                <Button onClick={() => navigate('/')}>
                  Seguir comprando
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

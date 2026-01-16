import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { CartItem, Product } from '@/types';
import { toast } from 'sonner';

interface CartContextType {
  items: CartItem[];
  cartId: string | null;
  loading: boolean;
  itemCount: number;
  total: number;
  addItem: (product: Product, quantity?: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getSessionId = () => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => {
    const price = item.products?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const getOrCreateCart = async () => {
    const sessionId = getSessionId();
    
    let query = supabase.from('carts').select('id');
    
    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.eq('session_id', sessionId).is('user_id', null);
    }
    
    const { data: existingCart } = await query.maybeSingle();
    
    if (existingCart) {
      return existingCart.id;
    }
    
    const { data: newCart, error } = await supabase
      .from('carts')
      .insert(user ? { user_id: user.id } : { session_id: sessionId })
      .select('id')
      .single();
    
    if (error) throw error;
    return newCart.id;
  };

  const refreshCart = async () => {
    try {
      setLoading(true);
      const id = await getOrCreateCart();
      setCartId(id);
      
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, products(*)')
        .eq('cart_id', id);
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [user]);

  const addItem = async (product: Product, quantity = 1) => {
    try {
      const id = cartId || await getOrCreateCart();
      
      const existingItem = items.find(item => item.product_id === product.id);
      
      if (existingItem) {
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        await supabase
          .from('cart_items')
          .insert({ cart_id: id, product_id: product.id, quantity });
        
        await refreshCart();
      }
      
      toast.success('Producto agregado al carrito');
    } catch (error) {
      toast.error('Error al agregar producto');
      console.error(error);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await supabase.from('cart_items').delete().eq('id', itemId);
      setItems(items.filter(item => item.id !== itemId));
      toast.success('Producto eliminado');
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }
      
      await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);
      
      setItems(items.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      ));
    } catch (error) {
      toast.error('Error al actualizar cantidad');
    }
  };

  const clearCart = async () => {
    try {
      if (cartId) {
        await supabase.from('cart_items').delete().eq('cart_id', cartId);
        setItems([]);
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  return (
    <CartContext.Provider value={{
      items, cartId, loading, itemCount, total,
      addItem, removeItem, updateQuantity, clearCart, refreshCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}

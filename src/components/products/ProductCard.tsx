import { Link } from 'react-router-dom';
import { ShoppingCart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="product-card group">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            <img
              src={product.image_url || '/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {product.featured && (
              <span className="badge-featured">Destacado</span>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-full bg-warning text-warning-foreground">
                ¡Últimas unidades!
              </span>
            )}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <span className="text-lg font-semibold text-muted-foreground">Agotado</span>
              </div>
            )}
            
            {/* Quick Add Button */}
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Button
                size="icon"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="rounded-full shadow-lg"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              {product.categories?.name || 'Sin categoría'}
            </p>
            <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center justify-between">
              <span className="price-tag">${product.price.toFixed(2)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="gap-1"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar</span>
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

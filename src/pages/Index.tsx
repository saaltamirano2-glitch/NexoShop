import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types';
import { Header } from '@/components/layout/Header';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortBy, searchQuery]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from('products').select('*, categories(*)');

    if (selectedCategory !== 'all') {
      query = query.eq('category_id', selectedCategory);
    }

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    switch (sortBy) {
      case 'price-asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price-desc':
        query = query.order('price', { ascending: false });
        break;
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      default:
        query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
    }

    const { data } = await query;
    if (data) setProducts(data);
    setLoading(false);
  };

  const featuredProducts = products.filter(p => p.featured).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      {!searchQuery && selectedCategory === 'all' && (
        <section className="relative overflow-hidden py-16 md:py-24" style={{ background: 'var(--gradient-hero)' }}>
          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6">
                Descubre lo mejor en <span className="text-accent">NexoShop</span>
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8">
                Encuentra productos de calidad a los mejores precios. Compra fácil, seguro y rápido.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="btn-hero" asChild>
                  <a href="#productos">
                    Explorar productos
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />
        </section>
      )}

      {/* Categories */}
      {!searchQuery && selectedCategory === 'all' && categories.length > 0 && (
        <section className="py-12 border-b">
          <div className="container">
            <h2 className="text-2xl font-display font-bold mb-6">Categorías</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="category-card aspect-[4/3]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <img
                    src={category.image_url || '/placeholder.svg'}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 z-10 flex items-end p-4">
                    <h3 className="text-lg font-semibold text-primary-foreground">{category.name}</h3>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      <section id="productos" className="py-12">
        <div className="container">
          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold">
                {searchQuery ? `Resultados para "${searchQuery}"` : 'Todos los Productos'}
              </h2>
              <p className="text-muted-foreground">{products.length} productos encontrados</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Destacados</SelectItem>
                  <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                  <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
                  <SelectItem value="name">Nombre A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">No se encontraron productos</p>
              <Button variant="outline" onClick={() => { setSelectedCategory('all'); }} className="mt-4">
                Ver todos los productos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">N</span>
              </div>
              <span className="font-display font-bold text-xl">NexoShop</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 NexoShop. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

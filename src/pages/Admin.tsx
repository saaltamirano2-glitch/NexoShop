import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';

interface AdminProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category_id: string | null;
  featured: boolean | null;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | null;
}

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Package, Tags, ShoppingCart, Loader2, Search, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
  category_id: string;
  featured: boolean;
}

interface CategoryFormData {
  name: string;
  description: string;
  image_url: string;
}

const emptyProduct: ProductFormData = {
  name: '',
  description: '',
  price: '',
  stock: '',
  image_url: '',
  category_id: '',
  featured: false
};

const emptyCategory: CategoryFormData = {
  name: '',
  description: '',
  image_url: ''
};

type ActiveSection = 'products' | 'categories' | 'orders';

export default function Admin() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [activeSection, setActiveSection] = useState<ActiveSection>('products');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Product dialogs
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [deleteProductDialogOpen, setDeleteProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null);
  const [productFormData, setProductFormData] = useState<ProductFormData>(emptyProduct);
  const [savingProduct, setSavingProduct] = useState(false);

  // Category dialogs
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(emptyCategory);
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/');
        toast.error('No tienes permisos de administrador');
      } else {
        loadData();
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(50)
      ]);
      
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Product handlers
  const openCreateProductDialog = () => {
    setEditingProduct(null);
    setProductFormData(emptyProduct);
    setProductDialogOpen(true);
  };

  const openEditProductDialog = (product: AdminProduct) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      image_url: product.image_url || '',
      category_id: product.category_id || '',
      featured: product.featured || false
    });
    setProductDialogOpen(true);
  };

  const openDeleteProductDialog = (product: AdminProduct) => {
    setProductToDelete(product);
    setDeleteProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productFormData.name || !productFormData.price) {
      toast.error('Nombre y precio son requeridos');
      return;
    }

    setSavingProduct(true);
    try {
      const productData = {
        name: productFormData.name,
        description: productFormData.description || null,
        price: parseFloat(productFormData.price),
        stock: parseInt(productFormData.stock) || 0,
        image_url: productFormData.image_url || null,
        category_id: productFormData.category_id || null,
        featured: productFormData.featured
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        toast.success('Producto actualizado');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        
        if (error) throw error;
        toast.success('Producto creado');
      }

      setProductDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);
      
      if (error) throw error;
      
      toast.success('Producto eliminado');
      setDeleteProductDialogOpen(false);
      setProductToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
    }
  };

  // Category handlers
  const openCreateCategoryDialog = () => {
    setEditingCategory(null);
    setCategoryFormData(emptyCategory);
    setCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || ''
    });
    setCategoryDialogOpen(true);
  };

  const openDeleteCategoryDialog = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name) {
      toast.error('El nombre es requerido');
      return;
    }

    setSavingCategory(true);
    try {
      const categoryData = {
        name: categoryFormData.name,
        description: categoryFormData.description || null,
        image_url: categoryFormData.image_url || null
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        
        if (error) throw error;
        toast.success('Categoría actualizada');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryData);
        
        if (error) throw error;
        toast.success('Categoría creada');
      }

      setCategoryDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Error al guardar la categoría');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);
      
      if (error) throw error;
      
      toast.success('Categoría eliminada');
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error al eliminar la categoría. Puede que tenga productos asociados.');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive">Sin stock</Badge>;
    if (stock <= 5) return <Badge variant="outline" className="border-warning text-warning">Bajo stock</Badge>;
    return <Badge variant="secondary">{stock} disponibles</Badge>;
  };

  const getOrderStatusBadge = (status: string) => {
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

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleCompleteOrder = async (order: any) => {
    setUpdatingOrderId(order.id);
    try {
      // Reduce stock for each item in the order
      for (const item of order.order_items) {
        // Get current product stock
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();
        
        if (productError) throw productError;
        
        const newStock = Math.max(0, (product?.stock || 0) - item.quantity);
        
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product_id);
      }
      
      // Update order status to delivered
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', order.id);
      
      if (orderError) throw orderError;
      
      toast.success('Pedido completado y stock actualizado');
      loadData();
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Error al completar el pedido');
    } finally {
      setUpdatingOrderId(null);
    }
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
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-display font-bold mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground mb-8">Gestiona productos, categorías y pedidos</p>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${activeSection === 'products' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveSection('products')}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`p-3 rounded-lg ${activeSection === 'products' ? 'bg-primary text-primary-foreground' : 'bg-primary/10'}`}>
                  <Package className={`h-6 w-6 ${activeSection === 'products' ? 'text-primary-foreground' : 'text-primary'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{products.length}</p>
                  <p className="text-sm text-muted-foreground">Productos</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${activeSection === 'categories' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveSection('categories')}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`p-3 rounded-lg ${activeSection === 'categories' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50'}`}>
                  <Tags className={`h-6 w-6 ${activeSection === 'categories' ? 'text-primary-foreground' : 'text-secondary-foreground'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-sm text-muted-foreground">Categorías</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${activeSection === 'orders' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveSection('orders')}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`p-3 rounded-lg ${activeSection === 'orders' ? 'bg-primary text-primary-foreground' : 'bg-success/10'}`}>
                  <ShoppingCart className={`h-6 w-6 ${activeSection === 'orders' ? 'text-primary-foreground' : 'text-success'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{orders.length}</p>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Section */}
          {activeSection === 'products' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Gestión de Productos</CardTitle>
                  <Button onClick={openCreateProductDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Producto
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar productos..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Imagen</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Destacado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No se encontraron productos
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProducts.map(product => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <img
                                  src={product.image_url || '/placeholder.svg'}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{(product as any).categories?.name || '-'}</TableCell>
                              <TableCell>${product.price.toFixed(2)}</TableCell>
                              <TableCell>{getStockBadge(product.stock)}</TableCell>
                              <TableCell>
                                {product.featured && <Badge>Destacado</Badge>}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditProductDialog(product)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => openDeleteProductDialog(product)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Categories Section */}
          {activeSection === 'categories' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Gestión de Categorías</CardTitle>
                  <Button onClick={openCreateCategoryDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Categoría
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Imagen</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Productos</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No hay categorías
                            </TableCell>
                          </TableRow>
                        ) : (
                          categories.map(category => {
                            const productCount = products.filter(p => p.category_id === category.id).length;
                            return (
                              <TableRow key={category.id}>
                                <TableCell>
                                  <img
                                    src={category.image_url || '/placeholder.svg'}
                                    alt={category.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {category.description || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{productCount} productos</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditCategoryDialog(category)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => openDeleteCategoryDialog(category)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Orders Section */}
          {activeSection === 'orders' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No hay pedidos
                            </TableCell>
                          </TableRow>
                        ) : (
                          orders.map(order => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-sm">
                                {order.id.slice(0, 8)}...
                              </TableCell>
                              <TableCell>
                                {new Date(order.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-medium">
                                ${order.total.toFixed(2)}
                              </TableCell>
                              <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                              <TableCell>{order.order_items?.length || 0} productos</TableCell>
                              <TableCell className="text-right">
                                {order.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleCompleteOrder(order)}
                                    disabled={updatingOrderId === order.id}
                                  >
                                    {updatingOrderId === order.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      'Completar'
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica los detalles del producto' : 'Añade un nuevo producto al catálogo'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={productFormData.name}
                onChange={e => setProductFormData({ ...productFormData, name: e.target.value })}
                placeholder="Nombre del producto"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={productFormData.description}
                onChange={e => setProductFormData({ ...productFormData, description: e.target.value })}
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productFormData.price}
                  onChange={e => setProductFormData({ ...productFormData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={productFormData.stock}
                  onChange={e => setProductFormData({ ...productFormData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image_url">URL de imagen</Label>
              <Input
                id="image_url"
                value={productFormData.image_url}
                onChange={e => setProductFormData({ ...productFormData, image_url: e.target.value })}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={productFormData.category_id}
                onValueChange={value => setProductFormData({ ...productFormData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="featured">Producto destacado</Label>
              <Switch
                id="featured"
                checked={productFormData.featured}
                onCheckedChange={checked => setProductFormData({ ...productFormData, featured: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} disabled={savingProduct}>
              {savingProduct ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
      <AlertDialog open={deleteProductDialogOpen} onOpenChange={setDeleteProductDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Eliminar producto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto "{productToDelete?.name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Modifica los detalles de la categoría' : 'Añade una nueva categoría'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre *</Label>
              <Input
                id="category-name"
                value={categoryFormData.name}
                onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="Nombre de la categoría"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category-description">Descripción</Label>
              <Textarea
                id="category-description"
                value={categoryFormData.description}
                onChange={e => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Descripción de la categoría"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category-image">URL de imagen</Label>
              <Input
                id="category-image"
                value={categoryFormData.image_url}
                onChange={e => setCategoryFormData({ ...categoryFormData, image_url: e.target.value })}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={savingCategory}>
              {savingCategory ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Eliminar categoría?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La categoría "{categoryToDelete?.name}" será eliminada permanentemente.
              Los productos asociados quedarán sin categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

-- =====================================================
-- NEXOSHOP - Sistema de Compras en Línea
-- =====================================================

-- 1. ENUM para roles de usuario
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- 2. Tabla de perfiles de usuario
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tabla de roles de usuario (separada para seguridad)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Tabla de categorías
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 5. Tabla de productos
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 6. Tabla de carritos
CREATE TABLE public.carts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT cart_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- 7. Tabla de items del carrito
CREATE TABLE public.cart_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (cart_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 8. Tabla de pedidos
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_address TEXT,
    shipping_city TEXT,
    payment_method TEXT DEFAULT 'card',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 9. Tabla de items del pedido
CREATE TABLE public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCIONES HELPER PARA RLS
-- =====================================================

-- Función para verificar si usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
$$;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Profiles: usuarios ven todos los perfiles, editan el suyo
CREATE POLICY "Profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- User Roles: solo admins gestionan roles
CREATE POLICY "Anyone can view roles for auth checks" 
    ON public.user_roles FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage roles" 
    ON public.user_roles FOR ALL 
    USING (public.is_admin());

-- Categories: públicas para leer, admins para gestionar
CREATE POLICY "Categories are viewable by everyone" 
    ON public.categories FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage categories" 
    ON public.categories FOR ALL 
    USING (public.is_admin());

-- Products: públicos para leer, admins para gestionar
CREATE POLICY "Products are viewable by everyone" 
    ON public.products FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage products" 
    ON public.products FOR ALL 
    USING (public.is_admin());

-- Carts: usuarios ven/gestionan su carrito o por session_id
CREATE POLICY "Users can manage own cart" 
    ON public.carts FOR ALL 
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
        OR 
        (user_id IS NULL AND session_id IS NOT NULL)
    );

CREATE POLICY "Allow insert for session carts" 
    ON public.carts FOR INSERT 
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
        OR 
        (user_id IS NULL AND session_id IS NOT NULL)
    );

-- Cart Items: usuarios gestionan items de su carrito
CREATE POLICY "Users can view own cart items" 
    ON public.cart_items FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.carts 
            WHERE carts.id = cart_items.cart_id 
            AND (
                (auth.uid() IS NOT NULL AND carts.user_id = auth.uid())
                OR carts.session_id IS NOT NULL
            )
        )
    );

CREATE POLICY "Users can manage own cart items" 
    ON public.cart_items FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.carts 
            WHERE carts.id = cart_items.cart_id 
            AND (
                (auth.uid() IS NOT NULL AND carts.user_id = auth.uid())
                OR carts.session_id IS NOT NULL
            )
        )
    );

-- Orders: usuarios ven sus pedidos, admins ven todos
CREATE POLICY "Users can view own orders" 
    ON public.orders FOR SELECT 
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create own orders" 
    ON public.orders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders" 
    ON public.orders FOR UPDATE 
    USING (public.is_admin());

-- Order Items: usuarios ven items de sus pedidos
CREATE POLICY "Users can view own order items" 
    ON public.order_items FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Users can create order items for own orders" 
    ON public.order_items FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGERS PARA TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_carts_updated_at
    BEFORE UPDATE ON public.carts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TRIGGER PARA CREAR PERFIL AL REGISTRARSE
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        NEW.email
    );
    
    -- Asignar rol de usuario por defecto
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- DATOS INICIALES: CATEGORÍAS Y PRODUCTOS
-- =====================================================

INSERT INTO public.categories (id, name, description, image_url) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Electrónica', 'Dispositivos electrónicos y gadgets', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ropa', 'Moda y accesorios', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Hogar', 'Artículos para el hogar', 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400'),
    ('d4e5f6a7-b8c9-0123-def0-234567890123', 'Deportes', 'Equipamiento deportivo', 'https://images.unsplash.com/photo-1461896836934- voices-of-the-game?w=400'),
    ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'Libros', 'Literatura y educación', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400');

INSERT INTO public.products (name, description, price, stock, image_url, category_id, featured) VALUES
    ('Smartphone Pro X', 'Teléfono inteligente de última generación con cámara de 108MP', 899.99, 50, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true),
    ('Laptop UltraBook', 'Portátil ultraligero con procesador de última generación', 1299.99, 30, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true),
    ('Auriculares Wireless', 'Auriculares inalámbricos con cancelación de ruido', 199.99, 100, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', false),
    ('Smartwatch Elite', 'Reloj inteligente con monitor de salud avanzado', 349.99, 75, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true),
    ('Tablet Pro 12', 'Tablet profesional con stylus incluido', 799.99, 40, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', false),
    ('Chaqueta Premium', 'Chaqueta de cuero genuino estilo urbano', 189.99, 60, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', true),
    ('Zapatillas Sport', 'Zapatillas deportivas de alto rendimiento', 129.99, 120, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', false),
    ('Camisa Elegante', 'Camisa de algodón premium para ocasiones formales', 79.99, 80, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', false),
    ('Lámpara Moderna', 'Lámpara de diseño minimalista LED', 89.99, 45, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400', 'c3d4e5f6-a7b8-9012-cdef-123456789012', true),
    ('Sofá Confort', 'Sofá de 3 plazas con tejido premium', 699.99, 15, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400', 'c3d4e5f6-a7b8-9012-cdef-123456789012', true),
    ('Bicicleta Mountain', 'Bicicleta de montaña profesional', 549.99, 25, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400', 'd4e5f6a7-b8c9-0123-def0-234567890123', true),
    ('Mancuernas Set', 'Set de mancuernas ajustables 5-25kg', 149.99, 35, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', 'd4e5f6a7-b8c9-0123-def0-234567890123', false),
    ('Yoga Mat Premium', 'Esterilla de yoga antideslizante ecológica', 49.99, 90, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400', 'd4e5f6a7-b8c9-0123-def0-234567890123', false),
    ('Best Seller Novel', 'La novela más vendida del año', 24.99, 200, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', 'e5f6a7b8-c9d0-1234-ef01-345678901234', true),
    ('Guía de Programación', 'Manual completo de desarrollo web moderno', 59.99, 70, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400', 'e5f6a7b8-c9d0-1234-ef01-345678901234', false);
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Users, Eye, Plus, Package, ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, convertToUSD, ADMIN_PASSWORD } from "@/lib/constants";
import { useProducts } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"stats" | "products" | "add">("stats");
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const { data: products = [] } = useProducts();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // New product form
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "ИБП",
    price: "",
    image: "",
    brand: "",
  });

  useEffect(() => {
    if (!authenticated) return;

    const fetchStats = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: online } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", fiveMinAgo)
        .eq("is_online", true);

      const { count: total } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true });

      setOnlineCount(online || 0);
      setTotalVisitors(total || 0);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      toast.error("Неверный пароль!");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.image) {
      toast.error("Заполните все поля!");
      return;
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "add",
          password: ADMIN_PASSWORD,
          product: {
            name: newProduct.name,
            category: newProduct.category,
            price: parseInt(newProduct.price),
            image: newProduct.image,
            brand: newProduct.brand || "Generic",
            in_stock: true,
          },
        }),
      });

      if (!resp.ok) throw new Error("Failed to add product");

      toast.success("Товар добавлен!");
      setNewProduct({ name: "", category: "ИБП", price: "", image: "", brand: "" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setTab("products");
    } catch {
      toast.error("Ошибка при добавлении товара");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "delete", password: ADMIN_PASSWORD, productId: id }),
      });

      if (!resp.ok) throw new Error("Failed");
      toast.success("Товар удалён");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  const categories = [...new Set(products.map((p) => p.category))];

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 w-full max-w-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-center mb-6">Админ-панель</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:scale-[1.02] transition-transform">
              Войти
            </button>
          </form>
          <button
            onClick={() => navigate("/")}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-primary text-center transition-colors"
          >
            ← Вернуться в магазин
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="glass rounded-lg w-9 h-9 flex items-center justify-center hover:border-primary transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold">📊 Админ-панель</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Онлайн: {onlineCount}
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Eye, label: "Онлайн сейчас", value: onlineCount, color: "text-green-400" },
            { icon: Users, label: "Всего посетителей", value: totalVisitors, color: "text-primary" },
            { icon: Package, label: "Всего товаров", value: products.length, color: "text-accent" },
            { icon: Package, label: "Категорий", value: categories.length, color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-5">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-extrabold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "stats" as const, label: "Статистика" },
            { id: "products" as const, label: "Товары" },
            { id: "add" as const, label: "Добавить товар" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                tab === t.id ? "bg-primary text-primary-foreground" : "glass glass-hover"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "stats" && (
          <div className="space-y-4">
            <h3 className="font-bold">Статистика по категориям</h3>
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-semibold">Категория</th>
                      <th className="text-right p-4 font-semibold">Товаров</th>
                      <th className="text-right p-4 font-semibold hidden sm:table-cell">Мин. цена</th>
                      <th className="text-right p-4 font-semibold hidden sm:table-cell">Макс. цена</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const catProducts = products.filter((p) => p.category === cat);
                      const min = Math.min(...catProducts.map((p) => p.price));
                      const max = Math.max(...catProducts.map((p) => p.price));
                      return (
                        <tr key={cat} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-4 font-medium">{cat}</td>
                          <td className="p-4 text-right text-primary font-bold">{catProducts.length}</td>
                          <td className="p-4 text-right hidden sm:table-cell">{formatPrice(min)} сум</td>
                          <td className="p-4 text-right hidden sm:table-cell">{formatPrice(max)} сум</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold">Товар</th>
                    <th className="text-left p-4 font-semibold hidden sm:table-cell">Категория</th>
                    <th className="text-right p-4 font-semibold">Цена</th>
                    <th className="text-right p-4 font-semibold w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={p.image} alt="" className="w-10 h-10 object-contain rounded-lg bg-card shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">{p.category}</td>
                      <td className="p-4 text-right font-bold whitespace-nowrap">${convertToUSD(p.price)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="w-8 h-8 rounded-lg hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "add" && (
          <form onSubmit={handleAddProduct} className="glass rounded-xl p-6 max-w-lg space-y-4">
            <h3 className="font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Добавить товар</h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Фото (URL)</label>
              <input
                value={newProduct.image}
                onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Название</label>
              <input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Название товара"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Цена (сум)</label>
              <input
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                placeholder="1000000"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Категория</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {["ИБП", "Мониторы", "Сеть", "Комплектующие", "Моноблоки", "Аксессуары", "Колонки"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Бренд</label>
              <input
                value={newProduct.brand}
                onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                placeholder="Бренд"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:scale-[1.02] transition-transform">
              Добавить товар
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Admin;

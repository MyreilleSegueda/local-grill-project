"use client";

import { useEffect, useState } from "react";
import React from "react";
import SidebarLayout from "@/src/navbar/SidebarLayout";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";
import AlertBadge from "@/src/components/ui/AlertBadge";
import { PencilSquareIcon, EyeIcon, PlusIcon, CubeIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    unit_id: "1",
    minimum_stock: "10",
    is_perishable: false,
  });
  const [editProduct, setEditProduct] = useState(null);
  const [showDetails, setShowDetails] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchProducts();
  }, [token, search, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedCategory) params.append("category_id", selectedCategory);

      const response = await fetch(`/api/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.data.products);
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrEditProduct = async (e) => {
    e.preventDefault();
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products/create";
      const method = editProduct ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          category_id: parseInt(formData.category_id),
          unit_id: parseInt(formData.unit_id),
          minimum_stock: parseFloat(formData.minimum_stock),
        }),
      });
      if (response.ok) {
        setFormData({ name: "", category_id: "", unit_id: "1", minimum_stock: "10", is_perishable: false });
        setEditProduct(null);
        setShowModal(false);
        fetchProducts();
      }
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id?.toString() || "",
      unit_id: product.unit_id?.toString() || "1",
      minimum_stock: product.minimum_stock?.toString() || "10",
      is_perishable: !!product.is_perishable,
    });
    setShowModal("edit");
  };

  const handleDetails = (product) => {
    setShowDetails(product);
    setShowModal("details");
  };

  const handleAdd = () => {
    setEditProduct(null);
    setFormData({ name: "", category_id: "", unit_id: "1", minimum_stock: "10", is_perishable: false });
    setShowModal("add");
  };

  return (
    <SidebarLayout>
      <main className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="mb-8 flex items-center gap-3">
                  <CubeIcon className="h-8 w-8 animate-pulse" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      Gestion des Produits
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Suivi des alertes de stock en temps réel
                    </p>
                  </div>
                </div>
          <Button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition"
          >
            <PlusIcon className="w-5 h-5" /> Ajouter un produit
          </Button>
        </div>



        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg p-6 relative animate-fadeIn scale-95 animate-scaleUp">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
                onClick={() => { setShowModal(false); setEditProduct(null); setShowDetails(null); }}
                aria-label="Fermer"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              {showModal === "details" && showDetails && (
                <>
                  <h2 className="text-xl font-bold mb-4">Détail du produit</h2>
                  <div className="space-y-2 text-gray-700 dark:text-gray-300">
                    <div><b>Nom :</b> {showDetails.name}</div>
                    <div><b>Catégorie :</b> {categories.find(c => c.id === showDetails.category_id)?.name || "-"}</div>
                    <div><b>Stock minimum :</b> {showDetails.minimum_stock}</div>
                    <div><b>Périssable :</b> {showDetails.is_perishable ? "Oui" : "Non"}</div>
                  </div>
                </>
              )}

              {(showModal === "add" || showModal === "edit") && (
                <>
                  <h2 className="text-xl font-bold mb-4">{showModal === "add" ? "Ajouter un produit" : "Éditer le produit"}</h2>
                  <form onSubmit={handleAddOrEditProduct} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Nom du produit"
                        placeholder="Ex: Poulet frais"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                      <div>
                        <label className="block text-sm font-medium mb-1">Catégorie</label>
                        <select
                          value={formData.category_id}
                          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 transition"
                          required
                        >
                          <option value="">Sélectionner...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Stock minimum"
                        type="number"
                        value={formData.minimum_stock}
                        onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      />
                      <label className="flex items-center gap-2 col-span-1">
                        <input
                          type="checkbox"
                          checked={formData.is_perishable}
                          onChange={(e) => setFormData({ ...formData, is_perishable: e.target.checked })}
                          className="w-4 h-4 accent-green-600"
                        />
                        <span className="text-sm font-medium">Produit périssable</span>
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditProduct(null); }}>
                        Annuler
                      </Button>
                      <Button type="submit">{showModal === "add" ? "Créer le produit" : "Enregistrer"}</Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 transition"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Products Table */}
        <Card className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse text-gray-500">Chargement...</div>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun produit trouvé
            </div>
          ) : (
<div className="w-full max-w-full overflow-x-auto">
  <table className="w-full table-fixed border-collapse">
    <thead>
      <tr className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <th className="px-4 py-3 text-left font-semibold w-1/4 truncate">
          Nom
        </th>
        <th className="px-4 py-3 text-left font-semibold w-1/4 truncate">
          Catégorie
        </th>
        <th className="px-4 py-3 text-center font-semibold w-1/6">
          Stock min
        </th>
        <th className="px-4 py-3 text-center font-semibold w-1/6">
          Périssable
        </th>
        <th className="px-4 py-3 text-center font-semibold w-1/6">
          Actions
        </th>
      </tr>
    </thead>

    <tbody>
      {products.map((product) => (
        <tr
          key={product.id}
          className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
        >
          <td className="px-4 py-3 font-medium truncate">
            {product.name}
          </td>

          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate">
            {product.category_name ||
              categories.find(c => c.id === product.category_id)?.name ||
              "-"}
          </td>

          <td className="px-4 py-3 text-center">
            {product.minimum_stock}
          </td>

          <td className="px-4 py-3 text-center">
            {product.is_perishable ? (
              <span className="inline-block px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded text-sm font-medium">
                Oui
              </span>
            ) : (
              <span className="text-gray-500">Non</span>
            )}
          </td>

          <td className="px-4 py-3 text-center">
            <div className="flex justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(product)}
                title="Éditer"
              >
                <PencilSquareIcon className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDetails(product)}
                title="Détails"
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

          )}
        </Card>
      </main>
    </SidebarLayout>
  );
}

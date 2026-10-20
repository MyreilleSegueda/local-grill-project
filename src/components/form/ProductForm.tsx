"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProductFormProps {
  product?: any;
  categories: any[];
  units: any[];
  suppliers: any[];
  onSubmit: (data: any) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function ProductForm({ product, categories, units, suppliers, onSubmit, onDelete }: ProductFormProps) {
  const [form, setForm] = useState({
    name: product?.name || '',
    category_id: product?.category_id || '',
    unit_id: product?.unit_id || '',
    supplier_id: product?.supplier_id || '',
    sku: product?.sku || '',
    description: product?.description || '',
    minimum_stock: product?.minimum_stock || 10,
    is_perishable: product?.is_perishable || false,
    is_active: product?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;
    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }
    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        category_id: Number(form.category_id),
        unit_id: Number(form.unit_id),
        supplier_id: form.supplier_id ? Number(form.supplier_id) : undefined,
        minimum_stock: Number(form.minimum_stock),
      });
      router.push('/produits');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete && confirm('Supprimer ce produit ?')) {
      setLoading(true);
      setError(null);
      try {
        await onDelete();
        router.push('/produits');
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white p-8 rounded shadow-md space-y-6">
      <h2 className="text-2xl font-bold mb-4">{product ? 'Modifier le produit' : 'Créer un produit'}</h2>
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Nom *</label>
          <input name="name" value={form.name} onChange={handleChange} required className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block font-medium">Catégorie *</label>
          <select name="category_id" value={form.category_id} onChange={handleChange} required className="input input-bordered w-full">
            <option value="">Sélectionner</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Unité *</label>
          <select name="unit_id" value={form.unit_id} onChange={handleChange} required className="input input-bordered w-full">
            <option value="">Sélectionner</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Fournisseur</label>
          <select name="supplier_id" value={form.supplier_id} onChange={handleChange} className="input input-bordered w-full">
            <option value="">Aucun</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>{sup.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">SKU</label>
          <input name="sku" value={form.sku} onChange={handleChange} className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block font-medium">Stock minimum *</label>
          <input name="minimum_stock" type="number" min="1" value={form.minimum_stock} onChange={handleChange} required className="input input-bordered w-full" />
        </div>
        <div className="md:col-span-2">
          <label className="block font-medium">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} className="input input-bordered w-full" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="is_perishable" checked={form.is_perishable} onChange={handleChange} />
          <label>Produit périssable</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          <label>Actif</label>
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <button type="submit" className="btn btn-primary" disabled={loading}>{product ? 'Enregistrer' : 'Créer'}</button>
        {product && onDelete && (
          <button type="button" className="btn btn-error" onClick={handleDelete} disabled={loading}>Supprimer</button>
        )}
      </div>
    </form>
  );
}

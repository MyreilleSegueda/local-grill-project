"use client";
import React, { useEffect, useState } from 'react';
import ProductForm from '../../../src/components/form/ProductForm';
import { useRouter, useSearchParams } from 'next/navigation';

async function fetchInitialData(id?: string) {
  const [categoriesRes, unitsRes, suppliersRes, productRes] = await Promise.all([
    fetch('/api/categories'),
    fetch('/api/units'),
    fetch('/api/suppliers'),
    id ? fetch(`/api/products/${id}`) : Promise.resolve({ json: async () => null }),
  ]);
  const [categories, units, suppliers, product] = await Promise.all([
    categoriesRes.json(),
    unitsRes.json(),
    suppliersRes.json(),
    productRes.json(),
  ]);
  return {
    categories: categories.data || [],
    units: units.data || [],
    suppliers: suppliers.data || [],
    product: product?.data || null,
  };
}

export default function ProductFormPage({ params }: { params: { id?: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ categories: [], units: [], suppliers: [], product: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData(params.id)
      .then(setData)
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSubmit = async (formData: any) => {
    setError(null);
    const method = params.id ? 'PUT' : 'POST';
    const url = params.id ? `/api/products/${params.id}` : '/api/products/create';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Erreur API');
    }
  };

  const handleDelete = async () => {
    if (!params.id) return;
    const res = await fetch(`/api/products/${params.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Erreur API');
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <ProductForm
      product={data.product}
      categories={data.categories}
      units={data.units}
      suppliers={data.suppliers}
      onSubmit={handleSubmit}
      onDelete={params.id ? handleDelete : undefined}
    />
  );
}

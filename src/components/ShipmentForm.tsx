import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Priority, KanbanColumnID } from '../types';
import { supabase } from '../integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
  address: string;
  email?: string;
  phone?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
}

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

interface ShipmentFormProps {
  onSubmit: (data: {
    orderNumber: string;
    customerId: string;
    products: { productId: string; quantity: number }[];
    assignedTo: string;
    dueDate: string;
    priority: Priority;
    trackingNumber?: string;
  }) => Promise<void>;
  onCancel: () => void;
  createCustomer: (data: { name: string; address: string; email?: string; phone?: string }) => Promise<any>;
  createProduct: (data: { name: string; description?: string; sku?: string }) => Promise<any>;
}

export const ShipmentForm: React.FC<ShipmentFormProps> = ({ 
  onSubmit, 
  onCancel, 
  createCustomer, 
  createProduct 
}) => {
  const [formData, setFormData] = useState({
    orderNumber: '',
    customerId: '',
    assignedTo: '',
    dueDate: '',
    priority: Priority.Medium,
    trackingNumber: ''
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string; quantity: number }[]>([]);
  
  const [newCustomer, setNewCustomer] = useState({ name: '', address: '', email: '', phone: '' });
  const [newProduct, setNewProduct] = useState({ name: '', description: '', sku: '' });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchProfiles();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    setCustomers(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    setProducts(data || []);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    setProfiles(data || []);
  };

  const handleCreateCustomer = async () => {
    try {
      const customer = await createCustomer(newCustomer);
      setCustomers(prev => [...prev, customer]);
      setFormData(prev => ({ ...prev, customerId: customer.id }));
      setNewCustomer({ name: '', address: '', email: '', phone: '' });
      setShowNewCustomerForm(false);
    } catch (error) {
      console.error('Errore creazione cliente:', error);
    }
  };

  const handleCreateProduct = async () => {
    try {
      const product = await createProduct(newProduct);
      setProducts(prev => [...prev, product]);
      setNewProduct({ name: '', description: '', sku: '' });
      setShowNewProductForm(false);
    } catch (error) {
      console.error('Errore creazione prodotto:', error);
    }
  };

  const addProduct = (productId: string) => {
    if (!selectedProducts.find(p => p.productId === productId)) {
      setSelectedProducts(prev => [...prev, { productId, quantity: 1 }]);
    }
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(prev => 
      prev.map(p => p.productId === productId ? { ...p, quantity } : p)
    );
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderNumber || !formData.customerId || !formData.assignedTo || selectedProducts.length === 0) {
      alert('Compilare tutti i campi obbligatori e aggiungere almeno un prodotto');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        products: selectedProducts
      });
    } catch (error) {
      console.error('Errore creazione spedizione:', error);
      alert('Errore durante la creazione della spedizione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-2xl font-bold">Nuova Spedizione</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Numero Ordine */}
            <div>
              <label className="block text-sm font-medium mb-2">Numero Ordine *</label>
              <input
                type="text"
                value={formData.orderNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>

            {/* Tracking Number */}
            <div>
              <label className="block text-sm font-medium mb-2">Numero Tracking</label>
              <input
                type="text"
                value={formData.trackingNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium mb-2">Cliente *</label>
              <div className="flex space-x-2">
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                  className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  required
                >
                  <option value="">Seleziona cliente</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button type="button" onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}>
                  Nuovo
                </Button>
              </div>
            </div>

            {/* Assegnato a */}
            <div>
              <label className="block text-sm font-medium mb-2">Assegnato a *</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              >
                <option value="">Seleziona utente</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Data Scadenza */}
            <div>
              <label className="block text-sm font-medium mb-2">Data Scadenza *</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>

            {/* Priorità */}
            <div>
              <label className="block text-sm font-medium mb-2">Priorità</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value={Priority.Low}>Bassa</option>
                <option value={Priority.Medium}>Media</option>
                <option value={Priority.High}>Alta</option>
              </select>
            </div>
          </div>

          {/* Nuovo Cliente Form */}
          {showNewCustomerForm && (
            <div className="border p-4 rounded-md bg-gray-50 dark:bg-gray-700">
              <h4 className="font-semibold mb-3">Nuovo Cliente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome *"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                />
                <input
                  type="text"
                  placeholder="Indirizzo *"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  className="p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  className="p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                />
                <input
                  type="tel"
                  placeholder="Telefono"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  className="p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                />
              </div>
              <div className="mt-3 space-x-2">
                <Button type="button" onClick={handleCreateCustomer}>Crea Cliente</Button>
                <Button type="button" variant="secondary" onClick={() => setShowNewCustomerForm(false)}>Annulla</Button>
              </div>
            </div>
          )}

          {/* Prodotti */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium">Prodotti *</label>
              <Button type="button" onClick={() => setShowNewProductForm(!showNewProductForm)}>
                Nuovo Prodotto
              </Button>
            </div>

            {/* Nuovo Prodotto Form */}
            {showNewProductForm && (
              <div className="border p-4 rounded-md bg-gray-50 dark:bg-gray-700 mb-4">
                <h4 className="font-semibold mb-3">Nuovo Prodotto</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Nome *"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="SKU"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                    className="p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Descrizione"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    className="p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                  />
                </div>
                <div className="mt-3 space-x-2">
                  <Button type="button" onClick={handleCreateProduct}>Crea Prodotto</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowNewProductForm(false)}>Annulla</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <select
                onChange={(e) => e.target.value && addProduct(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                value=""
              >
                <option value="">Aggiungi prodotto</option>
                {products.filter(p => !selectedProducts.find(sp => sp.productId === p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {selectedProducts.map(sp => {
                const product = products.find(p => p.id === sp.productId);
                return (
                  <div key={sp.productId} className="flex items-center space-x-3 p-3 border rounded-md">
                    <span className="flex-1">{product?.name}</span>
                    <input
                      type="number"
                      min="1"
                      value={sp.quantity}
                      onChange={(e) => updateProductQuantity(sp.productId, parseInt(e.target.value) || 1)}
                      className="w-20 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeProduct(sp.productId)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Rimuovi
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea Spedizione'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
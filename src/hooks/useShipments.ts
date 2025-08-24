import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Shipment, KanbanColumnID, Priority } from '../types';

export const useShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = useCallback(async () => {
    try {
      // Get shipments data - customer data will be limited based on user role
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select(`
          *,
          assigned_to:profiles!shipments_assigned_to_fkey(*),
          products:shipment_products(*, product:products(*)),
          attachments(*),
          comments(*, author:profiles!comments_author_id_fkey(*))
        `);
        
      // Get customer data using role-based function
      const { data: customersData, error: customersError } = await supabase.rpc('get_customers_by_role');

      if (shipmentsError) throw shipmentsError;
      if (customersError) console.warn('Accesso limitato ai dati clienti:', customersError);

      // Create a customer lookup map
      const customersMap = (customersData || []).reduce((acc, customer) => {
        acc[customer.id] = customer;
        return acc;
      }, {} as Record<string, any>);

      const mappedShipments: Shipment[] = (shipmentsData || []).map(s => {
        const customer = customersMap[s.customer_id];
        return {
          id: s.id,
          orderNumber: s.order_number,
          trackingNumber: s.tracking_number || '',
          customer: {
            name: customer?.name || 'Cliente non disponibile',
            address: customer?.address || ''
          },
          products: (s.products || []).map(p => ({
            id: p.product?.id || '',
            name: p.product?.name || '',
            quantity: p.quantity
          })),
          assignedTo: {
            id: s.assigned_to?.id || '',
            name: s.assigned_to?.name || 'Non assegnato',
            avatarUrl: s.assigned_to?.avatar_url || 'https://picsum.photos/100/100'
          },
          dueDate: new Date(s.due_date || Date.now()),
          priority: s.priority as Priority || Priority.Medium,
          status: s.status as KanbanColumnID || KanbanColumnID.ToDo,
          attachments: (s.attachments || []).map(a => ({
            id: a.id,
            name: a.name,
            url: a.url,
            type: a.type as 'document' | 'image'
          })),
          comments: (s.comments || []).map(c => ({
            id: c.id,
            author: {
              id: c.author?.id || '',
              name: c.author?.name || 'Utente',
              avatarUrl: c.author?.avatar_url || 'https://picsum.photos/100/100'
            },
            text: c.text,
            timestamp: new Date(c.created_at)
          }))
        };
      });

      setShipments(mappedShipments);
    } catch (error) {
      console.error('Errore nel caricamento spedizioni:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateShipmentStatus = useCallback(async (shipmentId: string, newStatus: KanbanColumnID) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus })
        .eq('id', shipmentId);

      if (error) throw error;
      
      setShipments(prev => 
        prev.map(s => s.id === shipmentId ? { ...s, status: newStatus } : s)
      );
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato spedizione:', error);
    }
  }, []);

  useEffect(() => {
    fetchShipments();

    // Set up real-time listener for shipments
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Shipment change:', payload);
          // Refetch data when any shipment changes
          fetchShipments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchShipments]);

  const createCustomer = useCallback(async (customerData: { name: string; address: string; email?: string; phone?: string }) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Errore nella creazione cliente:', error);
      throw error;
    }
  }, []);

  const createProduct = useCallback(async (productData: { name: string; description?: string; sku?: string }) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Errore nella creazione prodotto:', error);
      throw error;
    }
  }, []);

  const createShipment = useCallback(async (shipmentData: {
    orderNumber: string;
    customerId: string;
    products: { productId: string; quantity: number }[];
    assignedTo: string;
    dueDate: string;
    priority: Priority;
    trackingNumber?: string;
  }) => {
    try {
      // Create the shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          order_number: shipmentData.orderNumber,
          customer_id: shipmentData.customerId,
          assigned_to: shipmentData.assignedTo,
          due_date: shipmentData.dueDate,
          priority: shipmentData.priority,
          tracking_number: shipmentData.trackingNumber,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          status: KanbanColumnID.ToDo
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Add products to the shipment
      if (shipmentData.products.length > 0) {
        const shipmentProducts = shipmentData.products.map(p => ({
          shipment_id: shipment.id,
          product_id: p.productId,
          quantity: p.quantity
        }));

        const { error: productsError } = await supabase
          .from('shipment_products')
          .insert(shipmentProducts);

        if (productsError) throw productsError;
      }

      // Refresh shipments list
      fetchShipments();
      
      return shipment;
    } catch (error) {
      console.error('Errore nella creazione spedizione:', error);
      throw error;
    }
  }, [fetchShipments]);

  return {
    shipments,
    loading,
    refetch: fetchShipments,
    updateShipmentStatus,
    createShipment,
    createCustomer,
    createProduct
  };
};
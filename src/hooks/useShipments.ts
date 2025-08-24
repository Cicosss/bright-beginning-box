import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Shipment, KanbanColumnID, Priority } from '../types';

export const useShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = useCallback(async () => {
    try {
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select(`
          *,
          customer:customers(*),
          assigned_to:profiles!shipments_assigned_to_fkey(*),
          products:shipment_products(*, product:products(*)),
          attachments(*),
          comments(*, author:profiles!comments_author_id_fkey(*))
        `);

      if (shipmentsError) throw shipmentsError;

      const mappedShipments: Shipment[] = (shipmentsData || []).map(s => ({
        id: s.id,
        orderNumber: s.order_number,
        trackingNumber: s.tracking_number || '',
        customer: {
          name: s.customer?.name || '',
          address: s.customer?.address || ''
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
      }));

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

  return {
    shipments,
    loading,
    refetch: fetchShipments,
    updateShipmentStatus
  };
};
import React, { useMemo, useState } from 'react';
import { Shipment, KanbanColumnID } from '../types';
import { Button } from './ui/button';
import { ShipmentForm } from './ShipmentForm';

const KANBAN_COLUMNS = [KanbanColumnID.ToDo, KanbanColumnID.InProgress, KanbanColumnID.Ready];

// Icon component (reused from App.tsx)
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <i className={`fas ${name} ${className}`}></i>
);

// Priority class function (reused from App.tsx)
const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'Alta': return 'bg-red-500';
    case 'Media': return 'bg-yellow-500';
    case 'Bassa': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const KanbanCard: React.FC<{ shipment: Shipment, onClick: () => void }> = ({ shipment, onClick }) => (
  <div 
    draggable="true"
    onDragStart={(e) => {
      e.dataTransfer.setData('shipmentId', shipment.id);
    }}
    onClick={onClick} 
    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4 cursor-pointer hover:shadow-xl transition-shadow"
  >
    <div className="flex justify-between items-start">
      <h4 className="font-bold text-md">{shipment.orderNumber}</h4>
      <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getPriorityClass(shipment.priority)}`}>
        {shipment.priority}
      </span>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{shipment.customer.name}</p>
    <div className="mt-4 flex justify-between items-center">
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <Icon name="fa-calendar-alt" />
        <span>{shipment.dueDate.toLocaleDateString()}</span>
      </div>
      <img src={shipment.assignedTo.avatarUrl} alt={shipment.assignedTo.name} className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-gray-800" />
    </div>
  </div>
);

const KanbanColumn: React.FC<{ 
  title: KanbanColumnID, 
  shipments: Shipment[], 
  onCardClick: (shipment: Shipment) => void, 
  onUpdateStatus: (shipmentId: string, newStatus: KanbanColumnID) => void 
}> = ({ title, shipments, onCardClick, onUpdateStatus }) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const shipmentId = e.dataTransfer.getData('shipmentId');
    if (shipmentId) {
      onUpdateStatus(shipmentId, title);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="bg-gray-200 dark:bg-gray-900 rounded-lg p-3 w-80 flex-shrink-0"
    >
      <h3 className="font-bold text-lg mb-4 px-2">{title} ({shipments.length})</h3>
      <div className="min-h-[200px]">
        {shipments.map(shipment => (
          <KanbanCard key={shipment.id} shipment={shipment} onClick={() => onCardClick(shipment)} />
        ))}
      </div>
    </div>
  );
};

interface KanbanViewProps {
  shipments: Shipment[];
  onCardClick: (shipment: Shipment) => void;
  onUpdateStatus: (shipmentId: string, newStatus: KanbanColumnID) => void;
  createShipment: (data: any) => Promise<void>;
  createCustomer: (data: any) => Promise<any>;
  createProduct: (data: any) => Promise<any>;
}

export const KanbanView: React.FC<KanbanViewProps> = ({ 
  shipments, 
  onCardClick, 
  onUpdateStatus, 
  createShipment, 
  createCustomer, 
  createProduct 
}) => {
  const [showNewShipmentForm, setShowNewShipmentForm] = useState(false);

  const shipmentsByStatus = useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, status) => {
      acc[status] = shipments.filter(s => s.status === status);
      return acc;
    }, {} as Record<KanbanColumnID, Shipment[]>);
  }, [shipments]);

  const handleCreateShipment = async (data: any) => {
    await createShipment(data);
    setShowNewShipmentForm(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Kanban Spedizioni</h2>
        <Button onClick={() => setShowNewShipmentForm(true)}>
          <Icon name="fa-plus" className="mr-2" />
          Nuova Spedizione
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <div className="flex space-x-6 min-w-max">
          {KANBAN_COLUMNS.map(status => (
            <KanbanColumn
              key={status}
              title={status}
              shipments={shipmentsByStatus[status]}
              onCardClick={onCardClick}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      </div>

      {showNewShipmentForm && (
        <ShipmentForm
          onSubmit={handleCreateShipment}
          onCancel={() => setShowNewShipmentForm(false)}
          createCustomer={createCustomer}
          createProduct={createProduct}
        />
      )}
    </div>
  );
};
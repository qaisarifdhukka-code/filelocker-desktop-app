import React from 'react';
import DeliveryDashboard from '../DeliveryDashboard';
import { useAppContext } from '../../AppContext';

export default function DeliveriesPage() {
  const { hardwareId, firmName } = useAppContext();

  return (
    <div className="flex flex-col w-full max-w-5xl h-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Deliveries</h1>
        <p className="text-gray-500">Manage and track your secure document deliveries.</p>
      </div>

      <div className="flex-1 min-h-0">
        <DeliveryDashboard hardwareId={hardwareId} firmName={firmName} />
      </div>
    </div>
  );
}

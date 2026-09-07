import React, { useState } from 'react';
import {
  Utensils,
  ArrowRightLeft,
  Merge,
  RotateCcw,
  Clock,
  User,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { RestaurantTable, TableStatus } from '../../types/index.ts';

interface TableManagementViewProps {
  onOpenTableInPos: (table: RestaurantTable) => void;
}

export const TableManagementView: React.FC<TableManagementViewProps> = ({
  onOpenTableInPos,
}) => {
  const { tables, closeTable, transferTable, mergeTables } = useRestaurant();

  const [activeSection, setActiveSection] = useState<string>('ALL');
  const [transferFromTable, setTransferFromTable] = useState<RestaurantTable | null>(
    null
  );
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [mergePrimaryTable, setMergePrimaryTable] = useState<RestaurantTable | null>(
    null
  );
  const [mergeSecondaryId, setMergeSecondaryId] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  const sections = [
    'ALL',
    'Main Dining',
    'AC Lounge',
    'Rooftop Lounge',
    'Garden Patio',
  ];

  const safeTables = Array.isArray(tables) ? tables : [];

  const filteredTables = safeTables.filter(
    (t) => t && (activeSection === 'ALL' || t.section === activeSection)
  );

  const totalTables = safeTables.length;
  const occupiedTables = safeTables.filter((t) => t && t.status !== 'AVAILABLE').length;
  const availableTables = totalTables - occupiedTables;
  const totalActiveRevenue = safeTables.reduce(
    (sum, t) => sum + (t?.activeBillAmount || 0),
    0
  );

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'OCCUPIED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ORDER READY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'BILL REQUESTED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PAYMENT PENDING':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getDuration = (occupiedSince?: string) => {
    if (!occupiedSince) return null;
    const minutes = Math.floor(
      (Date.now() - new Date(occupiedSince).getTime()) / (1000 * 60)
    );
    if (minutes < 0) return 'Just seated';
    if (minutes > 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  const handleExecuteTransfer = async () => {
    if (!transferFromTable || !transferTargetId) return;
    try {
      setActionError('');
      await transferTable(transferFromTable.id, transferTargetId);
      setTransferFromTable(null);
      setTransferTargetId('');
    } catch (err: any) {
      setActionError(err.message || 'Transfer failed');
    }
  };

  const handleExecuteMerge = async () => {
    if (!mergePrimaryTable || !mergeSecondaryId) return;
    try {
      setActionError('');
      await mergeTables(mergePrimaryTable.id, mergeSecondaryId);
      setMergePrimaryTable(null);
      setMergeSecondaryId('');
    } catch (err: any) {
      setActionError(err.message || 'Merge failed');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Operational Stats (High Density Style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Tables
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {totalTables}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              Available
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
              {availableTables}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
              Occupied
            </span>
            <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
              {occupiedTables}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Live Running Value
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              ₹{totalActiveRevenue.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Section Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeSection === sec
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
            {filteredTables.length} tables in {activeSection === 'ALL' ? 'all zones' : activeSection}
          </span>
        </div>

        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700">
            {actionError}
          </div>
        )}

        {/* Tables Floor Plan Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTables.map((table) => {
            const isOccupied = table.status !== 'AVAILABLE';
            const duration = getDuration(table.occupiedSince);

            return (
              <div
                key={table.id}
                className={`bg-white rounded-xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs ${
                  isOccupied
                    ? 'border-amber-400 ring-1 ring-amber-400/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Top */}
                <div className="p-3.5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900 font-mono">
                        {table.tableNumber}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        ({table.capacity}P)
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                        table.status
                      )}`}
                    >
                      {table.status}
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">
                    {table.section}
                  </p>

                  {/* Occupied Details */}
                  {isOccupied && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-xs">
                            {table.customerName || 'Guest'}
                          </span>
                        </span>
                        {duration && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{duration}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">
                          Running Bill:
                        </span>
                        <span className="text-sm font-black font-mono text-amber-600">
                          ₹{table.activeBillAmount?.toFixed(0) || '0'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => onOpenTableInPos(table)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs ${
                      isOccupied
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>{isOccupied ? 'Manage Order' : 'Take Order'}</span>
                  </button>

                  {isOccupied && (
                    <>
                      <button
                        onClick={() => setTransferFromTable(table)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                        title="Transfer Table"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setMergePrimaryTable(table)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                        title="Merge Table"
                      >
                        <Merge className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => closeTable(table.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Clear / Mark Available"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Transfer Table Modal */}
        {transferFromTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-3 border border-slate-200">
              <h3 className="font-black text-sm text-slate-900 uppercase">
                Transfer Order from {transferFromTable.tableNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Select an available destination table to shift orders.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Table:
                </label>
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                >
                  <option value="">Choose available table...</option>
                  {tables
                    .filter(
                      (t) =>
                        t.status === 'AVAILABLE' && t.id !== transferFromTable.id
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tableNumber} ({t.section}) - Cap: {t.capacity}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setTransferFromTable(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteTransfer}
                  disabled={!transferTargetId}
                  className="px-4 py-1.5 text-xs font-black uppercase tracking-wider bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Merge Table Modal */}
        {mergePrimaryTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-3 border border-slate-200">
              <h3 className="font-black text-sm text-slate-900 uppercase">
                Merge Table {mergePrimaryTable.tableNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Combine seating and orders with an adjacent occupied table.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Table to Merge With:
                </label>
                <select
                  value={mergeSecondaryId}
                  onChange={(e) => setMergeSecondaryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold"
                >
                  <option value="">Choose table...</option>
                  {tables
                    .filter((t) => t.id !== mergePrimaryTable.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tableNumber} ({t.section}) - {t.status}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setMergePrimaryTable(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteMerge}
                  disabled={!mergeSecondaryId}
                  className="px-4 py-1.5 text-xs font-black uppercase tracking-wider bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  Merge Tables
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

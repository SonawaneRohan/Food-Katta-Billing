import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { KotStatus } from '../../types/index.ts';

export const KitchenDisplayView: React.FC = () => {
  const { kotOrders, updateKotStatus } = useRestaurant();
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [now, setNow] = useState<number>(Date.now());

  // Update timer every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const stations = ['ALL', 'MAIN KITCHEN', 'DRINKS', 'HOOKAH'];

  // Filter KOTs
  const safeKotOrders = Array.isArray(kotOrders) ? kotOrders : [];
  const filteredKots = safeKotOrders.filter((kot) => {
    if (!kot) return false;
    const matchesStation =
      selectedStation === 'ALL' || kot.kitchenStation === selectedStation;

    const isActive = kot.status !== 'SERVED' && kot.status !== 'CANCELLED';
    const matchesMode = viewMode === 'ACTIVE' ? isActive : !isActive;

    return matchesStation && matchesMode;
  });

  const getElapsedMinutes = (createdAt: string) => {
    return Math.floor((now - new Date(createdAt).getTime()) / (1000 * 60));
  };

  const getUrgencyColor = (minutes: number) => {
    if (minutes < 10) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
    if (minutes < 20) return 'text-amber-400 bg-amber-950/60 border-amber-800';
    return 'text-rose-400 bg-rose-950/60 border-rose-800 animate-pulse';
  };

  const getStatusColor = (status: KotStatus) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-900/60 text-blue-300 border-blue-700';
      case 'ACCEPTED':
        return 'bg-amber-900/60 text-amber-300 border-amber-700';
      case 'PREPARING':
        return 'bg-purple-900/60 text-purple-300 border-purple-700';
      case 'READY':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
      case 'SERVED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'CANCELLED':
        return 'bg-red-900/60 text-red-300 border-red-700';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-white leading-tight">
                Kitchen Display System (KDS)
              </h2>
              <p className="text-[11px] text-slate-400">
                Live order tickets routed by kitchen stations
              </p>
            </div>
          </div>

          {/* Station Filters */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {stations.map((stn) => (
              <button
                key={stn}
                onClick={() => setSelectedStation(stn)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  selectedStation === stn
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {stn}
              </button>
            ))}
          </div>

          {/* Mode toggle (Active vs Completed) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('ACTIVE')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                viewMode === 'ACTIVE'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({kotOrders.filter((k) => k.status !== 'SERVED' && k.status !== 'CANCELLED').length})
            </button>
            <button
              onClick={() => setViewMode('HISTORY')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                viewMode === 'HISTORY'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredKots.map((kot) => {
            const elapsed = getElapsedMinutes(kot.createdAt);
            const urgencyClass = getUrgencyColor(elapsed);

            return (
              <div
                key={kot.id}
                className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between shadow-sm"
              >
                {/* Ticket Top Header */}
                <div className="p-3.5 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white font-mono">
                        {kot.kotNumber}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {kot.tableName || 'Takeaway'}
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${urgencyClass}`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{elapsed}m</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                      {kot.kitchenStation}
                    </span>
                    <span className="text-[11px]">By: {kot.cashierName}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-3 flex-1 space-y-2 overflow-y-auto max-h-56 scrollbar-thin scrollbar-thumb-slate-800">
                  {kot.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-amber-600/30 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                            {item.quantity}
                          </span>
                          <span className="font-bold text-xs text-slate-100">
                            {item.name}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-amber-300 italic mt-0.5 pl-7">
                            * {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {kot.notes && (
                    <div className="p-2 rounded bg-slate-950 text-xs text-slate-300 italic border border-slate-800">
                      Ticket Note: {kot.notes}
                    </div>
                  )}
                </div>

                {/* Ticket Action Status Bar */}
                <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${getStatusColor(
                      kot.status
                    )}`}
                  >
                    {kot.status}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {kot.status === 'NEW' && (
                      <button
                        onClick={() => updateKotStatus(kot.id, 'ACCEPTED')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors"
                      >
                        Accept
                      </button>
                    )}

                    {kot.status === 'ACCEPTED' && (
                      <button
                        onClick={() => updateKotStatus(kot.id, 'PREPARING')}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition-colors"
                      >
                        Preparing
                      </button>
                    )}

                    {kot.status === 'PREPARING' && (
                      <button
                        onClick={() => updateKotStatus(kot.id, 'READY')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors"
                      >
                        Ready
                      </button>
                    )}

                    {kot.status === 'READY' && (
                      <button
                        onClick={() => updateKotStatus(kot.id, 'SERVED')}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold transition-colors"
                      >
                        Served
                      </button>
                    )}

                    {kot.status !== 'SERVED' && kot.status !== 'CANCELLED' && (
                      <button
                        onClick={() => updateKotStatus(kot.id, 'CANCELLED')}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Cancel KOT"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredKots.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-700 mb-2" />
            <p className="text-xs font-bold text-slate-400">
              No active KOTs in {selectedStation === 'ALL' ? 'all stations' : selectedStation}
            </p>
            <p className="text-[11px] text-slate-600">
              New orders punched by cashiers will stream here in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

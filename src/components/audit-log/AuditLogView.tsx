import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  ShieldAlert,
  User,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';

export const AuditLogView: React.FC = () => {
  const { auditLogs = [] } = useRestaurant();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const actionTypes = [
    'ALL',
    'BILL_GENERATED',
    'BILL_CREATED',
    'KOT_SENT',
    'KOT_STATUS_UPDATED',
    'TRANSFER_TABLE',
    'MERGE_TABLES',
    'REGISTER_OPENED',
    'REGISTER_CLOSED',
    'EXPENSE_ADDED',
    'INVENTORY_ADJUSTED',
  ];

  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];

  const filteredLogs = safeLogs.filter((log) => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const authorName = log.userName || (log as any).performedByName || '';
    const matchesSearch =
      searchQuery === '' ||
      authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesAction && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <History className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Security Audit Trail</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Immutable chronological log of billing transactions, KOTs & cash adjustments
              </p>
            </div>
          </div>

          <span className="text-[11px] text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {filteredLogs.length} events
          </span>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit logs by staff or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {actionTypes.slice(0, 6).map((type) => (
              <button
                key={type}
                onClick={() => setActionFilter(type)}
                className={`px-2 py-1 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${
                  actionFilter === type
                    ? 'bg-amber-500 text-slate-900 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Timeline */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-2.5">
              <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-900 text-white uppercase tracking-wider">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-500">by</span>
                    <span className="text-xs font-bold text-slate-900">
                      {log.userName || (log as any).performedByName || 'Staff'} <span className="text-[10px] text-amber-600 uppercase font-black">({log.role || 'USER'})</span>
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>

                {log.details && (
                  <div className="mt-1.5 text-[11px] font-mono bg-slate-50 p-2 rounded border border-slate-200 text-slate-700 break-all">
                    {typeof log.details === 'object' ? (
                      <div className="space-y-0.5">
                        {Object.entries(log.details).map(([k, v]) => (
                          <div key={k} className="flex gap-1.5">
                            <span className="text-slate-400 font-semibold">{k}:</span>
                            <span className="text-slate-900">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      String(log.details)
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No audit records match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

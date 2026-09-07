import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowUpDown,
  Search,
  PackageCheck,
  RotateCcw,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { InventoryItem } from '../../types/index.ts';

export const InventoryView: React.FC = () => {
  const { inventory, adjustInventoryStock, saveInventoryItem } = useRestaurant();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<string>('Purchase');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    unit: 'kg',
    currentStock: 10,
    minimumStock: 5,
    costPrice: 50,
  });

  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const lowStockItems = safeInventory.filter(
    (item) => item && item.currentStock <= item.minimumStock
  );

  const filteredItems = safeInventory.filter(
    (item) =>
      item &&
      ((item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust || adjustQty === 0) return;
    try {
      await adjustInventoryStock(
        selectedItemForAdjust.id,
        adjustType === 'Wastage' || adjustType === 'Consumption' ? -Math.abs(adjustQty) : Math.abs(adjustQty),
        adjustType,
        adjustNotes
      );
      setIsAdjustModalOpen(false);
      setSelectedItemForAdjust(null);
      setAdjustQty(0);
      setAdjustNotes('');
    } catch (err) {
      console.error('Adjust stock error:', err);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.unit) return;
    try {
      await saveInventoryItem(newItem);
      setIsNewItemModalOpen(false);
      setNewItem({ name: '', unit: 'kg', currentStock: 10, minimumStock: 5, costPrice: 50 });
    } catch (err) {
      console.error('Save inventory error:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-100">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Boxes className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Inventory & Stock Control</h2>
              <p className="text-xs text-neutral-500">
                Track ingredients, momo wrappers, milk, syrups, coal & raw materials
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Stock Item</span>
          </button>
        </div>

        {/* Low stock alert banner */}
        {lowStockItems.length > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-xs">Low Stock Alert:</span>
                <span className="text-xs ml-1">
                  {lowStockItems.map((i) => `${i.name} (${i.currentStock} ${i.unit})`).join(', ')}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              {lowStockItems.length} item(s) below threshold
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search stock item by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 uppercase font-bold border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Min. Threshold</th>
                  <th className="py-3 px-4">Unit Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.minimumStock;

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-bold text-neutral-900">{item.name}</td>
                      <td className="py-3 px-4 font-mono text-neutral-500">{item.sku}</td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-sm text-neutral-900">
                          {item.currentStock}
                        </span>{' '}
                        <span className="text-neutral-500">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {item.minimumStock} {item.unit}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-800">
                        ₹{item.costPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLow
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedItemForAdjust(item);
                            setIsAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-md transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      No stock items recorded yet. Click "Add Stock Item" to create.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adjust Stock Modal */}
        {isAdjustModalOpen && selectedItemForAdjust && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-neutral-200">
              <h3 className="font-bold text-sm text-neutral-900 mb-1">
                Adjust Stock for {selectedItemForAdjust.name}
              </h3>
              <p className="text-xs text-neutral-500 mb-4">
                Current Level: {selectedItemForAdjust.currentStock} {selectedItemForAdjust.unit}
              </p>

              <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Adjustment Reason
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Purchase">Purchase (Stock In)</option>
                    <option value="Stock adjustment">Physical Audit Adjustment</option>
                    <option value="Consumption">Daily Kitchen Consumption</option>
                    <option value="Wastage">Spoilage / Wastage</option>
                    <option value="Return">Supplier Return</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Quantity ({selectedItemForAdjust.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={adjustQty || ''}
                    onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-bold border border-neutral-300 rounded-lg bg-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Invoice # or reason..."
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-3 py-1.5 text-neutral-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-neutral-900 text-white font-bold rounded-lg"
                  >
                    Save Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Item Modal */}
        {isNewItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-neutral-200">
              <h3 className="font-bold text-sm text-neutral-900 mb-3">Add New Stock Item</h3>

              <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paneer (Block)"
                    value={newItem.name || ''}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Unit *</label>
                    <select
                      value={newItem.unit || 'kg'}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    >
                      <option value="kg">kg</option>
                      <option value="liters">liters</option>
                      <option value="pcs">pcs</option>
                      <option value="packets">packets</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      value={newItem.currentStock || 0}
                      onChange={(e) =>
                        setNewItem({ ...newItem, currentStock: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Min Threshold
                    </label>
                    <input
                      type="number"
                      value={newItem.minimumStock || 5}
                      onChange={(e) =>
                        setNewItem({ ...newItem, minimumStock: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Cost Price (₹)</label>
                    <input
                      type="number"
                      value={newItem.costPrice || 0}
                      onChange={(e) =>
                        setNewItem({ ...newItem, costPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsNewItemModalOpen(false)}
                    className="px-3 py-1.5 text-neutral-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-neutral-900 text-white font-bold rounded-lg"
                  >
                    Create Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

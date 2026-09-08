import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MessageSquare,
  DollarSign,
  Calendar,
  Edit2,
  MapPin,
  Clock,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { Customer } from '../../types/index.ts';

export const CustomersView: React.FC = () => {
  const { customers, saveCustomer, bills } = useRestaurant();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const safeCustomers = Array.isArray(customers) ? customers : [];

  const filteredCustomers = safeCustomers.filter(
    (c) =>
      c &&
      ((c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.whatsappNumber && c.whatsappNumber.includes(searchQuery)))
  );

  const handleOpenModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer({ ...cust });
    } else {
      setEditingCustomer({
        name: '',
        phone: '',
        whatsappNumber: '',
        email: '',
        address: '',
        notes: '',
      });
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name || !editingCustomer.phone) {
      setFormError('Name and Phone are required.');
      return;
    }
    try {
      setIsSaving(true);
      setFormError('');
      await saveCustomer(editingCustomer);
      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  // Get bills for selected customer
  const customerBills = selectedCustomer
    ? bills.filter((b) => b.customerId === selectedCustomer.id || b.customerPhone === selectedCustomer.phone)
    : [];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-100">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Bar */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Customer CRM & Loyalty</h2>
              <p className="text-xs text-neutral-500">
                Directory of regular dining guests, visit metrics & order history
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Search & List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Customer List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search customers by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs divide-y divide-neutral-100 max-h-[600px] overflow-y-auto">
              {filteredCustomers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors flex items-center justify-between ${
                    selectedCustomer?.id === cust.id ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900">{cust.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                        {cust.totalVisits || 0} visits
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {cust.phone}
                      </span>
                      {cust.whatsappNumber && cust.whatsappNumber !== cust.phone && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3" />
                          {cust.whatsappNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-sm font-black text-neutral-900">
                        ₹{cust.totalSpending?.toFixed(0) || '0'}
                      </span>
                      <div className="text-[10px] text-neutral-400">Total Spend</div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(cust);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredCustomers.length === 0 && (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  No customers found matching your search.
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected Customer Profile & History */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-5 space-y-4">
            {selectedCustomer ? (
              <div className="space-y-4">
                <div className="border-b border-neutral-200 pb-3">
                  <h3 className="font-black text-base text-neutral-900">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Customer Profile</p>
                </div>

                <div className="space-y-2 text-xs text-neutral-700">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Phone:</span>
                    <span className="font-semibold">{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.whatsappNumber && selectedCustomer.whatsappNumber !== selectedCustomer.phone && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Alt Phone:</span>
                      <span className="font-semibold">{selectedCustomer.whatsappNumber}</span>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Address:</span>
                      <span className="font-semibold text-right max-w-[160px] truncate">{selectedCustomer.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total Visits:</span>
                    <span className="font-bold text-neutral-900">{selectedCustomer.totalVisits || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total Spent:</span>
                    <span className="font-black text-emerald-700">₹{selectedCustomer.totalSpending?.toFixed(2) || '0.00'}</span>
                  </div>
                  {selectedCustomer.lastVisit && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Last Visit:</span>
                      <span className="font-mono text-[11px]">{new Date(selectedCustomer.lastVisit).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-200 pt-3">
                  <h4 className="font-bold text-xs text-neutral-900 mb-2">Past Invoices</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {customerBills.map((b) => (
                      <div
                        key={b.id}
                        className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs flex justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-neutral-800">{b.billNumber}</div>
                          <div className="text-[10px] text-neutral-500">
                            {new Date(b.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                        <span className="font-extrabold text-neutral-900">
                          ₹{Number(b.grandTotal || 0).toFixed(0)}
                        </span>
                      </div>
                    ))}

                    {customerBills.length === 0 && (
                      <p className="text-[11px] text-neutral-400 italic">No past bills recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-400 text-xs">
                <Users className="w-8 h-8 text-neutral-300 mb-2" />
                <p className="font-semibold">Select a customer</p>
                <p className="text-[11px] text-neutral-400">View detailed CRM stats and dining history</p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-neutral-200">
              <h3 className="font-bold text-base text-neutral-900 mb-4">
                {editingCustomer.id ? 'Edit Customer' : 'Add New Customer'}
              </h3>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg mb-3">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name || ''}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={editingCustomer.phone || ''}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Alternate Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editingCustomer.whatsappNumber || ''}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, whatsappNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={editingCustomer.address || ''}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 text-neutral-600 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-neutral-900 text-white font-bold rounded-lg hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Customer'}
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

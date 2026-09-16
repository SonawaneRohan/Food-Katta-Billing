import React, { useState, useEffect } from 'react';
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
  Trash2,
  CheckCircle2,
  Mail,
  FileText,
  X,
  AlertCircle,
  Check,
  UserCheck,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { Customer } from '../../types/index.ts';

export const CustomersView: React.FC = () => {
  const { customers, saveCustomer, deleteCustomer, bills } = useRestaurant();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string>('');

  const safeCustomers = Array.isArray(customers) ? customers : [];

  // Keep selectedCustomer in sync with real-time updates to customers array
  useEffect(() => {
    if (selectedCustomer) {
      const fresh = safeCustomers.find((c) => c.id === selectedCustomer.id);
      if (fresh) {
        setSelectedCustomer(fresh);
      }
    } else if (safeCustomers.length > 0 && !selectedCustomer) {
      // Auto-select first customer for better preview
      setSelectedCustomer(safeCustomers[0]);
    }
  }, [safeCustomers]);

  const filteredCustomers = safeCustomers.filter(
    (c) =>
      c &&
      ((c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.whatsappNumber && c.whatsappNumber.includes(searchQuery)))
  );

  const handleOpenModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer({
        id: cust.id,
        name: cust.name || '',
        phone: cust.phone || '',
        whatsappNumber: cust.whatsappNumber || cust.phone || '',
        email: cust.email || '',
        address: cust.address || '',
        notes: cust.notes || '',
        totalVisits: cust.totalVisits || 0,
        totalSpending: cust.totalSpending || 0,
        lastVisit: cust.lastVisit,
        createdAt: cust.createdAt,
      });
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
    if (!editingCustomer || !editingCustomer.name?.trim() || !editingCustomer.phone?.trim()) {
      setFormError('Customer Name and 10-digit Phone Number are required.');
      return;
    }

    const cleanPhone = editingCustomer.phone.trim();
    if (cleanPhone.length < 7) {
      setFormError('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');
      const updated = await saveCustomer({
        ...editingCustomer,
        name: editingCustomer.name.trim(),
        phone: cleanPhone,
        whatsappNumber: (editingCustomer.whatsappNumber || cleanPhone).trim(),
        email: (editingCustomer.email || '').trim(),
        address: (editingCustomer.address || '').trim(),
        notes: (editingCustomer.notes || '').trim(),
      });

      setSelectedCustomer(updated);
      setIsModalOpen(false);
      setEditingCustomer(null);
      setSuccessToast(
        editingCustomer.id ? `Updated details for ${updated.name}` : `Added new customer ${updated.name}`
      );
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cust: Customer) => {
    if (
      !window.confirm(
        `Are you sure you want to delete customer "${cust.name}" (${cust.phone})? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteCustomer(cust.id);
      if (selectedCustomer?.id === cust.id) {
        setSelectedCustomer(null);
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
      setSuccessToast(`Customer ${cust.name} deleted successfully.`);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get bills for selected customer
  const customerBills = selectedCustomer
    ? bills.filter(
        (b) =>
          b.customerId === selectedCustomer.id ||
          (selectedCustomer.phone && b.customerPhone === selectedCustomer.phone)
      )
    : [];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-100">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast('')}
              className="text-white/80 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Header Bar */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Customer CRM & Directory</h2>
              <p className="text-xs text-neutral-500">
                View, add, and edit guest details, phone numbers, addresses, and dining history
              </p>
            </div>
          </div>

          <button
            id="add-customer-btn"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Add New Customer</span>
          </button>
        </div>

        {/* Search & List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Customer List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="search-customers-input"
                type="text"
                placeholder="Search customers by name or 10-digit mobile number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs divide-y divide-neutral-100 max-h-[620px] overflow-y-auto">
              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    id={`customer-item-${cust.id}`}
                    onClick={() => setSelectedCustomer(cust)}
                    className={`p-3.5 hover:bg-neutral-50 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-amber-50/70 border-l-4 border-l-amber-600' : ''
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900 truncate">
                          {cust.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                          {cust.totalVisits || 0} visits
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                        <span className="flex items-center gap-1 font-mono font-medium text-neutral-700">
                          <Phone className="w-3 h-3 text-amber-600" />
                          {cust.phone}
                        </span>
                        {cust.whatsappNumber && cust.whatsappNumber !== cust.phone && (
                          <span className="flex items-center gap-1 text-emerald-700 font-mono text-[11px]">
                            <MessageSquare className="w-3 h-3" />
                            {cust.whatsappNumber}
                          </span>
                        )}
                        {cust.address && (
                          <span className="flex items-center gap-1 text-neutral-400 text-[11px] truncate max-w-[200px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{cust.address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right pr-2 hidden sm:block">
                        <span className="text-sm font-black text-neutral-900">
                          ₹{cust.totalSpending?.toFixed(0) || '0'}
                        </span>
                        <div className="text-[10px] text-neutral-400">Total Spend</div>
                      </div>

                      {/* Prominent Edit Button */}
                      <button
                        type="button"
                        id={`edit-customer-btn-${cust.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(cust);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-xs"
                        title={`Edit ${cust.name}'s name, number, or address`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredCustomers.length === 0 && (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  <p className="font-semibold text-neutral-700">No customers found</p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    {searchQuery
                      ? `No record matches "${searchQuery}". Click 'Add New Customer' to register.`
                      : 'No registered customers yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected Customer Profile & History */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-5 space-y-4">
            {selectedCustomer ? (
              <div className="space-y-4">
                {/* Profile Header with Prominent Edit Button */}
                <div className="border-b border-neutral-200 pb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-base text-neutral-900 leading-tight">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Guest Profile & CRM History</p>
                  </div>
                  <button
                    type="button"
                    id="profile-edit-customer-btn"
                    onClick={() => handleOpenModal(selectedCustomer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0"
                    title="Edit Name, Phone, or Address"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-white" />
                    <span>Edit Details</span>
                  </button>
                </div>

                {/* Edit Helper Banner */}
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2">
                  <div className="text-[11px] text-amber-950">
                    <span className="font-bold">Wrong name or phone entered?</span>
                    <span className="text-amber-800 ml-1">Click Edit to correct it anytime.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(selectedCustomer)}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-amber-400 rounded-md text-[11px] font-bold shrink-0 transition-colors shadow-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                {/* Details List */}
                <div className="space-y-2.5 text-xs text-neutral-700 bg-neutral-50/60 p-3 rounded-xl border border-neutral-100">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Primary Phone:</span>
                    </span>
                    <span className="font-mono font-bold text-neutral-900">
                      {selectedCustomer.phone}
                    </span>
                  </div>

                  {selectedCustomer.whatsappNumber &&
                    selectedCustomer.whatsappNumber !== selectedCustomer.phone && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp / Alt:</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-800">
                          {selectedCustomer.whatsappNumber}
                        </span>
                      </div>
                    )}

                  {selectedCustomer.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Email:</span>
                      </span>
                      <span className="font-semibold text-neutral-800">{selectedCustomer.email}</span>
                    </div>
                  )}

                  {selectedCustomer.address && (
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-neutral-500 flex items-center gap-1.5 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Address:</span>
                      </span>
                      <span className="font-semibold text-right text-neutral-800 break-words">
                        {selectedCustomer.address}
                      </span>
                    </div>
                  )}

                  {selectedCustomer.notes && (
                    <div className="flex justify-between items-start gap-2 pt-1 border-t border-neutral-200/60">
                      <span className="text-neutral-500 flex items-center gap-1.5 shrink-0">
                        <FileText className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Notes:</span>
                      </span>
                      <span className="italic text-neutral-600 text-right">
                        {selectedCustomer.notes}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-neutral-200 pt-2 flex justify-between">
                    <span className="text-neutral-500">Total Visits:</span>
                    <span className="font-bold text-neutral-900">
                      {selectedCustomer.totalVisits || 0} orders
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total Spend:</span>
                    <span className="font-black text-emerald-700">
                      ₹{selectedCustomer.totalSpending?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  {selectedCustomer.lastVisit && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Last Visit:</span>
                      <span className="font-mono text-[11px] text-neutral-700">
                        {new Date(selectedCustomer.lastVisit).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Past Bills Section */}
                <div className="border-t border-neutral-200 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-neutral-900">Past Orders & Invoices</h4>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {customerBills.length} recorded
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {customerBills.map((b) => (
                      <div
                        key={b.id}
                        className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-mono font-bold text-neutral-800">
                            {b.billNumber}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            {new Date(b.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <span className="font-extrabold text-neutral-900 font-mono">
                          ₹{Number(b.grandTotal || 0).toFixed(0)}
                        </span>
                      </div>
                    ))}

                    {customerBills.length === 0 && (
                      <p className="text-[11px] text-neutral-400 italic py-2 text-center">
                        No previous bills linked yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Delete Option at Bottom of Profile */}
                <div className="pt-2 border-t border-neutral-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedCustomer)}
                    disabled={isDeleting}
                    className="text-[11px] text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Customer</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-400 text-xs">
                <Users className="w-8 h-8 text-neutral-300 mb-2" />
                <p className="font-semibold text-neutral-600">Select a customer</p>
                <p className="text-[11px] text-neutral-400">
                  Select a guest from the left to view profile or edit details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    {editingCustomer.id ? (
                      <Edit2 className="w-4 h-4 text-amber-400" />
                    ) : (
                      <UserPlus className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base text-white">
                      {editingCustomer.id ? 'Edit Customer Details' : 'Add New Customer'}
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      {editingCustomer.id
                        ? 'Update incorrect name, mobile number, address, or preferences'
                        : 'Register a guest for CRM, loyalty tracking, and billing'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form id="customer-form" onSubmit={handleSave} className="space-y-4 text-xs">
                  {/* Customer Name */}
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="customer-name-input"
                        type="text"
                        required
                        placeholder="e.g. Rohan Sonawane"
                        value={editingCustomer.name || ''}
                        onChange={(e) =>
                          setEditingCustomer({ ...editingCustomer, name: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Enter correct first and last name
                    </p>
                  </div>

                  {/* Phone & WhatsApp / Alt Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="customer-phone-input"
                          type="tel"
                          required
                          placeholder="10-digit mobile number"
                          value={editingCustomer.phone || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingCustomer({
                              ...editingCustomer,
                              phone: val,
                              // If alternate is empty or same, keep it in sync
                              whatsappNumber:
                                !editingCustomer.whatsappNumber ||
                                editingCustomer.whatsappNumber === editingCustomer.phone
                                  ? val
                                  : editingCustomer.whatsappNumber,
                            });
                          }}
                          className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">Primary contact for bills</p>
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">
                        WhatsApp / Alt Number
                      </label>
                      <input
                        id="customer-whatsapp-input"
                        type="tel"
                        placeholder="Alternate phone (optional)"
                        value={editingCustomer.whatsappNumber || ''}
                        onChange={(e) =>
                          setEditingCustomer({
                            ...editingCustomer,
                            whatsappNumber: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                      <p className="text-[10px] text-neutral-400 mt-1">Used for sharing PDF bill</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Email Address <span className="font-normal text-neutral-400">(Optional)</span>
                    </label>
                    <input
                      id="customer-email-input"
                      type="email"
                      placeholder="e.g. customer@example.com"
                      value={editingCustomer.email || ''}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, email: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Delivery / Home Address{' '}
                      <span className="font-normal text-neutral-400">(Optional)</span>
                    </label>
                    <textarea
                      id="customer-address-input"
                      rows={2}
                      placeholder="Flat/House No, Building, Street, Area landmark..."
                      value={editingCustomer.address || ''}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, address: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-none"
                    />
                  </div>

                  {/* Notes / Preferences */}
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Customer Notes / Preferences{' '}
                      <span className="font-normal text-neutral-400">(Optional)</span>
                    </label>
                    <input
                      id="customer-notes-input"
                      type="text"
                      placeholder="e.g. VIP guest, likes less spicy, regular table 4"
                      value={editingCustomer.notes || ''}
                      onChange={(e) =>
                        setEditingCustomer({ ...editingCustomer, notes: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0">
                {editingCustomer.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingCustomer.id) {
                        handleDelete(editingCustomer as Customer);
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded-xl bg-white hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="customer-form"
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-amber-400 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-amber-400" />
                        <span>{editingCustomer.id ? 'Save Changes' : 'Create Customer'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Search, UserPlus, Phone, User, Check, MapPin, Edit2, AlertCircle } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { Customer } from '../../types/index.ts';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
}) => {
  const { customers, saveCustomer } = useRestaurant();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const safeCustomers = Array.isArray(customers) ? customers : [];

  const filteredCustomers = safeCustomers.filter(
    (c) =>
      c &&
      ((c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.whatsappNumber && c.whatsappNumber.includes(searchTerm)))
  );

  const handleStartNew = () => {
    setEditingCustomerId(null);
    setName('');
    setPhone('');
    setWhatsappNumber('');
    setAddress('');
    setErrorMsg('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (cust: Customer) => {
    setEditingCustomerId(cust.id);
    setName(cust.name || '');
    setPhone(cust.phone || '');
    setWhatsappNumber(cust.whatsappNumber || cust.phone || '');
    setAddress(cust.address || '');
    setErrorMsg('');
    setIsAddingNew(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Name and Phone are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const existingCust = editingCustomerId
        ? safeCustomers.find((c) => c.id === editingCustomerId)
        : null;

      const saved = await saveCustomer({
        ...(existingCust || {}),
        id: editingCustomerId || undefined,
        name: name.trim(),
        phone: phone.trim(),
        whatsappNumber: (whatsappNumber.trim() || phone.trim()),
        address: address.trim(),
      });

      onSelectCustomer(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-base">
              {isAddingNew
                ? editingCustomerId
                  ? 'Edit Customer Details'
                  : 'Add New Customer'
                : 'Select Customer'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {!isAddingNew ? (
            <div className="space-y-4">
              {/* Search & Add New Toggle */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by name or 10-digit mobile number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>New Customer</span>
                </button>
              </div>

              {/* Customer List */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 divide-y divide-neutral-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        onSelectCustomer(cust);
                        onClose();
                      }}
                      className="w-full text-left p-3 hover:bg-amber-50/50 rounded-lg transition-colors flex items-center justify-between group cursor-pointer border border-transparent hover:border-amber-200"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-neutral-800 group-hover:text-amber-700 truncate">
                            {cust.name}
                          </span>
                          <span className="text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">
                            {cust.totalVisits || 0} visits
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-600 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 font-mono font-medium">
                            <Phone className="w-3 h-3 text-neutral-500" />
                            {cust.phone}
                          </span>
                          {cust.address && (
                            <span className="truncate max-w-[180px] text-neutral-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{cust.address}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right pr-1">
                          <span className="text-xs font-bold text-neutral-700">
                            ₹{cust.totalSpending?.toFixed(0) || '0'}
                          </span>
                          <div className="text-[10px] text-neutral-500">Spend</div>
                        </div>

                        {/* Edit Customer Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(cust);
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
                          title={`Edit ${cust.name}'s name or phone`}
                        >
                          <Edit2 className="w-3 h-3 text-amber-700" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-neutral-600 text-xs">
                    {searchTerm
                      ? `No customer found matching "${searchTerm}". Click 'New Customer' to register.`
                      : 'No customers recorded yet.'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Add / Edit Customer Form */
            <form onSubmit={handleSaveCustomer} className="space-y-3.5">
              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (!whatsappNumber) setWhatsappNumber(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Alternate Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Optional alternate phone"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Delivery / Locality Address
                </label>
                <input
                  type="text"
                  placeholder="Street, Landmark, Flat No..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingCustomerId(null);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                >
                  Back to Customer List
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-neutral-900 text-amber-400 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    'Saving...'
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingCustomerId ? 'Update & Select' : 'Save & Attach to Bill'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

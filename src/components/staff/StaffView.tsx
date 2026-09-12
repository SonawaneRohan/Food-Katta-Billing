import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  KeyRound,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Search,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Filter,
  ShieldAlert,
  ChevronRight,
  Info,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { StaffMember, UserRole } from '../../types/index.ts';

interface RoleDefinition {
  role: UserRole;
  title: string;
  description: string;
  badgeStyle: string;
  permissions: { name: string; granted: boolean; note?: string }[];
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: 'OWNER',
    title: 'Restaurant Owner',
    description: 'Master administrative access across all restaurant operations, configurations, and financial data.',
    badgeStyle: 'bg-purple-100 text-purple-900 border-purple-200',
    permissions: [
      { name: 'POS Billing & Checkout', granted: true },
      { name: 'Tables Floor Plan & Seating', granted: true },
      { name: 'Kitchen Display System (KDS)', granted: true },
      { name: 'Bills & Invoice History', granted: true },
      { name: 'Sales & Revenue Dashboard', granted: true },
      { name: 'Menu & Price Configuration', granted: true },
      { name: 'Inventory & Stock Management', granted: true },
      { name: 'Daily Expenses & Petty Cash', granted: true },
      { name: 'Cash Register Float & Drawer', granted: true },
      { name: 'Tax, GSTIN & Business Settings', granted: true },
      { name: 'Staff Management & Role Assignment', granted: true },
      { name: 'Security Audit Trail & Logs', granted: true },
    ],
  },
  {
    role: 'MANAGER',
    title: 'Operations Manager',
    description: 'Supervisory role managing shift operations, staff, tables, inventory, expenses, and reporting.',
    badgeStyle: 'bg-blue-100 text-blue-900 border-blue-200',
    permissions: [
      { name: 'POS Billing & Checkout', granted: true },
      { name: 'Tables Floor Plan & Seating', granted: true },
      { name: 'Kitchen Display System (KDS)', granted: true },
      { name: 'Bills & Invoice History', granted: true },
      { name: 'Sales & Revenue Dashboard', granted: true },
      { name: 'Menu Item Creation & Price Edits', granted: true },
      { name: 'Inventory & Stock Management', granted: true },
      { name: 'Daily Expenses & Petty Cash', granted: true },
      { name: 'Cash Register Float & Drawer', granted: true },
      { name: 'Shift Reports & End-of-Day', granted: true },
      { name: 'Staff Management (Add & Edit)', granted: true },
      { name: 'Audit Trail Activity Logs', granted: true },
      { name: 'Tax & Core System Settings', granted: false, note: 'Owner only' },
    ],
  },
  {
    role: 'CASHIER',
    title: 'POS Cashier / Billing Counter',
    description: 'Front-counter billing staff handling orders, customer checkouts, payments, and receipts.',
    badgeStyle: 'bg-amber-100 text-amber-900 border-amber-200',
    permissions: [
      { name: 'POS Billing & Order Creation', granted: true },
      { name: 'Tables Order Settlement', granted: true },
      { name: 'Thermal Receipt Printing', granted: true },
      { name: 'WhatsApp PDF Invoice Sharing', granted: true },
      { name: 'Customers CRM & History', granted: true },
      { name: 'Cash Register Opening / Closing', granted: true },
      { name: 'Menu Catalog View', granted: true },
      { name: 'Price Modification & Discounts', granted: false, note: 'Manager/Owner only' },
      { name: 'Expenses & Petty Cash Logging', granted: false, note: 'Manager only' },
      { name: 'Staff Management & PINs', granted: false, note: 'Restricted' },
    ],
  },
  {
    role: 'KITCHEN',
    title: 'Kitchen Lead / Head Chef',
    description: 'Kitchen operator managing live KOT tickets, order preparation times, and dish fulfillment.',
    badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    permissions: [
      { name: 'Kitchen Display System (KDS)', granted: true },
      { name: 'Live KOT Queue Management', granted: true },
      { name: 'Mark Orders Preparing / Ready / Served', granted: true },
      { name: 'Kitchen Station Ticket Routing', granted: true },
      { name: 'Menu Catalog & Recipe View', granted: true },
      { name: 'POS Billing & Invoicing', granted: false, note: 'Restricted' },
      { name: 'Financial Reports & Registers', granted: false, note: 'Restricted' },
      { name: 'Staff & System Settings', granted: false, note: 'Restricted' },
    ],
  },
  {
    role: 'STAFF',
    title: 'Floor Waiter / Service Staff',
    description: 'Floor staff assisting dining guests, taking table orders, and checking table availability.',
    badgeStyle: 'bg-slate-100 text-slate-900 border-slate-200',
    permissions: [
      { name: 'Floor Tables Layout & Seating', granted: true },
      { name: 'Create Table Orders & Send KOT', granted: true },
      { name: 'Menu Catalog & Availability View', granted: true },
      { name: 'Financial & Invoicing Access', granted: false, note: 'Restricted' },
      { name: 'Inventory & Register Access', granted: false, note: 'Restricted' },
      { name: 'Staff & System Settings', granted: false, note: 'Restricted' },
    ],
  },
];

export const StaffView: React.FC = () => {
  const {
    allStaff,
    currentStaff,
    hasPermission,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    updateStaffRole,
    toggleStaffStatus,
    switchStaff,
  } = useAuth();

  // Navigation tab: 'directory' or 'roles'
  const [activeTab, setActiveTab] = useState<'directory' | 'roles'>('directory');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  // Quick PIN reveal tracking
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Form State for Adding
  const [newStaff, setNewStaff] = useState<{
    name: string;
    role: UserRole;
    phone: string;
    email: string;
    pinCode: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    name: '',
    role: 'CASHIER',
    phone: '',
    email: '',
    pinCode: '1234',
    status: 'ACTIVE',
  });

  // Notification / Toast
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const canManageStaff = hasPermission('STAFF_MANAGE') || currentStaff?.role === 'OWNER';

  // Helper to show brief toast notification
  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'CASHIER':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'KITCHEN':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'STAFF':
        return 'bg-slate-100 text-slate-900 border-slate-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  // Filter staff list
  const filteredStaff = useMemo(() => {
    const list = Array.isArray(allStaff) ? allStaff : [];
    return list.filter((member) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q);

      // Role filter
      const matchesRole = selectedRoleFilter === 'ALL' || member.role === selectedRoleFilter;

      // Status filter
      const matchesStatus =
        selectedStatusFilter === 'ALL' || member.status === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allStaff, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Handle Add Staff
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.pinCode.trim()) {
      setFormError('Staff name and 4-digit PIN are required.');
      return;
    }
    try {
      setIsProcessing(true);
      setFormError('');
      await createStaffMember(newStaff);
      setIsAddModalOpen(false);
      setNewStaff({
        name: '',
        role: 'CASHIER',
        phone: '',
        email: '',
        pinCode: '1234',
        status: 'ACTIVE',
      });
      triggerNotification('success', `Staff member ${newStaff.name} added successfully.`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add staff member.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Edit Staff
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editingStaff.name.trim() || !editingStaff.pinCode?.trim()) {
      setFormError('Staff name and PIN are required.');
      return;
    }
    try {
      setIsProcessing(true);
      setFormError('');
      await updateStaffMember(editingStaff.id, {
        name: editingStaff.name,
        role: editingStaff.role,
        phone: editingStaff.phone,
        email: editingStaff.email,
        pinCode: editingStaff.pinCode,
        status: editingStaff.status,
      });
      const updatedName = editingStaff.name;
      setEditingStaff(null);
      triggerNotification('success', `Staff profile for ${updatedName} updated successfully.`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update staff member.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;
    try {
      setIsProcessing(true);
      const name = deletingStaff.name;
      await deleteStaffMember(deletingStaff.id);
      setDeletingStaff(null);
      triggerNotification('success', `Staff member "${name}" was permanently removed.`);
    } catch (err: any) {
      triggerNotification('error', err.message || 'Failed to delete staff member.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Quick Role Change
  const handleQuickRoleChange = async (staffId: string, newRole: UserRole) => {
    try {
      await updateStaffRole(staffId, newRole);
      triggerNotification('success', `Role updated to ${newRole}.`);
    } catch (err: any) {
      triggerNotification('error', err.message || 'Failed to change role.');
    }
  };

  // Count by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      OWNER: 0,
      MANAGER: 0,
      CASHIER: 0,
      KITCHEN: 0,
      STAFF: 0,
    };
    (allStaff || []).forEach((s) => {
      if (counts[s.role] !== undefined) {
        counts[s.role] += 1;
      }
    });
    return counts;
  }, [allStaff]);

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-5 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Toast / Notification Banner */}
        {notification && (
          <div
            className={`p-3 rounded-lg flex items-center justify-between gap-3 text-xs font-bold transition-all shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Staff & Roles Management
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {allStaff?.length || 0} Staff
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage accounts, delete staff, assign roles, configure quick PINs & manage permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManageStaff && (
              <button
                onClick={() => {
                  setFormError('');
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-lg text-xs font-black transition-all shadow-sm uppercase tracking-wider"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'directory'
                ? 'border-amber-500 text-slate-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4 text-amber-500" />
            <span>Staff Directory ({allStaff?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'roles'
                ? 'border-amber-500 text-slate-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Roles & Permissions Section (5 Roles)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: STAFF DIRECTORY                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'directory' && (
          <div className="space-y-3">
            {/* Search & Role Filter Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search staff by name, phone, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="INACTIVE">Inactive Only</option>
                  </select>
                </div>
              </div>

              {/* Role Filter Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Filter Role:
                </span>
                <button
                  onClick={() => setSelectedRoleFilter('ALL')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    selectedRoleFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  All ({allStaff?.length || 0})
                </button>
                {(['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'STAFF'] as UserRole[]).map((role) => {
                  const count = roleCounts[role] || 0;
                  return (
                    <button
                      key={role}
                      onClick={() => setSelectedRoleFilter(role)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border ${
                        selectedRoleFilter === role
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {role} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Staff Cards Grid */}
            {filteredStaff.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No staff members found</p>
                <p className="text-xs text-slate-400">
                  Try adjusting your search query or role filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredStaff.map((member) => {
                  const isSelf = currentStaff?.id === member.id;
                  const isOwner = member.role === 'OWNER';
                  const isOnlyOwner =
                    isOwner &&
                    allStaff.filter((s) => s.role === 'OWNER' && s.status === 'ACTIVE').length <= 1;
                  const isPinRevealed = !!revealedPins[member.id];

                  return (
                    <div
                      key={member.id}
                      className={`bg-white rounded-xl border transition-all shadow-2xs p-4 flex flex-col justify-between space-y-3 ${
                        isSelf
                          ? 'border-amber-400 ring-2 ring-amber-400/20 bg-linear-to-b from-amber-50/20 to-white'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Card Top: Name, Badges */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-black text-sm text-slate-900 leading-tight">
                                {member.name}
                              </h3>
                              {isSelf && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded uppercase tracking-wider shadow-2xs">
                                  YOU (Active)
                                </span>
                              )}
                            </div>
                            <span
                              className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase border tracking-wider ${getRoleBadge(
                                member.role
                              )}`}
                            >
                              {member.role}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              member.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {member.status === 'ACTIVE' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-slate-400" />
                                <span>Inactive</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Contact & PIN Details */}
                        <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                          {member.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-mono text-[11px] text-slate-700 font-medium">
                                {member.phone}
                              </span>
                            </div>
                          )}
                          {member.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-[11px] text-slate-700 truncate font-medium">
                                {member.email}
                              </span>
                            </div>
                          )}

                          {/* PIN info */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-[11px] text-slate-500">Quick PIN:</span>
                              <span className="font-mono font-bold text-xs text-slate-800 tracking-wider">
                                {isPinRevealed ? member.pinCode || '1234' : '••••'}
                              </span>
                            </div>

                            {canManageStaff && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedPins((prev) => ({
                                    ...prev,
                                    [member.id]: !prev[member.id],
                                  }))
                                }
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 transition-colors flex items-center gap-1"
                                title="Toggle PIN visibility"
                              >
                                {isPinRevealed ? (
                                  <>
                                    <EyeOff className="w-3 h-3" />
                                    <span>Hide</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    <span>Show</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick Role Modifier (if manager/owner) */}
                        {canManageStaff && !isSelf && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Change Role:
                            </span>
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleQuickRoleChange(member.id, e.target.value as UserRole)
                              }
                              className="text-[11px] font-bold px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="OWNER">Owner</option>
                              <option value="MANAGER">Manager</option>
                              <option value="CASHIER">Cashier</option>
                              <option value="KITCHEN">Kitchen Staff</option>
                              <option value="STAFF">Floor Waiter</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                        {/* Switch Staff button */}
                        {!isSelf ? (
                          <button
                            onClick={() => switchStaff(member.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 transition-colors active:scale-95"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                            <span>Switch</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                            <span>Current User</span>
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          {/* Toggle Active/Inactive */}
                          {canManageStaff && !isSelf && (
                            <button
                              onClick={() => toggleStaffStatus(member.id)}
                              className="px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {/* Edit Staff Button */}
                          {canManageStaff && (
                            <button
                              onClick={() => {
                                setFormError('');
                                setEditingStaff({ ...member });
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                              title="Edit Staff Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* DELETE STAFF BUTTON */}
                          {canManageStaff && (
                            <button
                              onClick={() => {
                                if (isSelf) {
                                  triggerNotification(
                                    'error',
                                    'You cannot delete your own active staff profile while logged in.'
                                  );
                                  return;
                                }
                                if (isOnlyOwner) {
                                  triggerNotification(
                                    'error',
                                    'Cannot delete the only Owner account. Designate another Owner first.'
                                  );
                                  return;
                                }
                                setDeletingStaff(member);
                              }}
                              disabled={isSelf || isOnlyOwner}
                              className={`p-1.5 rounded-lg transition-colors border ${
                                isSelf || isOnlyOwner
                                  ? 'text-slate-300 border-transparent cursor-not-allowed opacity-40'
                                  : 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 active:scale-95'
                              }`}
                              title={
                                isSelf
                                  ? 'Cannot delete your active user'
                                  : isOnlyOwner
                                  ? 'Cannot delete the sole Owner'
                                  : `Delete ${member.name}`
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ROLES & PERMISSIONS SECTION                                        */}
        {/* ========================================================================= */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Role-Based Access Control (RBAC) Architecture
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Each staff member has an assigned role that grants specific permissions across the POS, kitchen display, inventory, expenses, registers, and administrative settings.
              </p>
            </div>

            {/* Roles Matrix Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {ROLE_DEFINITIONS.map((def) => {
                const membersWithRole = (allStaff || []).filter((s) => s.role === def.role);

                return (
                  <div
                    key={def.role}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div>
                      {/* Role Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-black px-2.5 py-0.5 rounded-md uppercase border tracking-wider ${def.badgeStyle}`}
                            >
                              {def.role}
                            </span>
                            <h4 className="font-black text-sm text-slate-900">{def.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{def.description}</p>
                        </div>

                        <span className="text-[11px] font-black px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg shrink-0 border border-slate-200">
                          {membersWithRole.length} Assigned
                        </span>
                      </div>

                      {/* Staff Currently in this Role */}
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                          Assigned Staff Members:
                        </span>
                        {membersWithRole.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            No staff members currently hold this role.
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {membersWithRole.map((member) => (
                              <span
                                key={member.id}
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                  member.status === 'ACTIVE'
                                    ? 'bg-white text-slate-800 border-slate-200'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                }`}
                              >
                                <span>{member.name}</span>
                                {currentStaff?.id === member.id && (
                                  <span className="text-[9px] font-black text-amber-600">(You)</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Permissions Checklist */}
                      <div className="mt-3.5 space-y-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Role Privileges & Permissions:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {def.permissions.map((perm, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-1.5 p-1.5 rounded-md border text-[11px] ${
                                perm.granted
                                  ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900 font-medium'
                                  : 'bg-slate-50 border-slate-100 text-slate-400 line-through'
                              }`}
                            >
                              {perm.granted ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                              <span className="truncate">{perm.name}</span>
                              {perm.note && (
                                <span className="text-[9px] text-slate-400 ml-auto no-underline">
                                  ({perm.note})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Quick Button to Filter Directory */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedRoleFilter(def.role);
                          setActiveTab('directory');
                        }}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors"
                      >
                        <span>View all {def.role} accounts</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: ADD NEW STAFF MEMBER                                             */}
        {/* ========================================================================= */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                    Add New Staff Member
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                >
                  ×
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg mb-3 border border-rose-200 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kadam"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                      Role *
                    </label>
                    <select
                      value={newStaff.role}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, role: e.target.value as UserRole })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="CASHIER">Cashier (Billing)</option>
                      <option value="MANAGER">Manager (Operations)</option>
                      <option value="KITCHEN">Kitchen Staff</option>
                      <option value="STAFF">Floor Waiter</option>
                      <option value="OWNER">Owner (Admin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                      Quick PIN (4 digits) *
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      required
                      placeholder="1234"
                      value={newStaff.pinCode}
                      onChange={(e) => setNewStaff({ ...newStaff, pinCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-mono text-center tracking-widest font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="staff@foodkatta.in"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    value={newStaff.status}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, status: e.target.value as 'ACTIVE' | 'INACTIVE' })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ACTIVE">Active (Can Login & Access)</option>
                    <option value="INACTIVE">Inactive (Disabled)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-lg shadow-sm uppercase tracking-wider disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? 'Saving...' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: EDIT STAFF MEMBER                                                */}
        {/* ========================================================================= */}
        {editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Edit2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                    Edit Staff Profile: {editingStaff.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                >
                  ×
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg mb-3 border border-rose-200 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                      Role *
                    </label>
                    <select
                      value={editingStaff.role}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, role: e.target.value as UserRole })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="CASHIER">Cashier (Billing)</option>
                      <option value="MANAGER">Manager (Operations)</option>
                      <option value="KITCHEN">Kitchen Staff</option>
                      <option value="STAFF">Floor Waiter</option>
                      <option value="OWNER">Owner (Admin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                      Quick PIN (4 digits) *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={editingStaff.pinCode || '1234'}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, pinCode: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-mono text-center tracking-widest font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editingStaff.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editingStaff.email || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    value={editingStaff.status}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        status: e.target.value as 'ACTIVE' | 'INACTIVE',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive (Disabled)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-lg shadow-sm uppercase tracking-wider disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: DELETE CONFIRMATION MODAL                                        */}
        {/* ========================================================================= */}
        {deletingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                    Delete Staff Member
                  </h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3.5 space-y-2 text-xs text-rose-950">
                <p className="font-medium">
                  Are you sure you want to permanently delete{' '}
                  <strong className="font-bold text-rose-950">{deletingStaff.name}</strong>?
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${getRoleBadge(
                      deletingStaff.role
                    )}`}
                  >
                    {deletingStaff.role}
                  </span>
                  {deletingStaff.phone && (
                    <span className="font-mono text-[11px] text-slate-600">
                      {deletingStaff.phone}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-rose-700 pt-1 border-t border-rose-200/60">
                  Removing this staff account revokes all POS access, PIN logins, and permissions immediately.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setDeletingStaff(null)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-lg shadow-sm uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Deleting...' : 'Yes, Delete Staff'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

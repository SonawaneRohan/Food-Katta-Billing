import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Phone,
  Mail,
  KeyRound,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { StaffMember, UserRole } from '../../types/index.ts';

export const StaffView: React.FC = () => {
  const { allStaff, currentStaff, hasPermission, createStaffMember, toggleStaffStatus, switchStaff } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
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
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const canManageStaff = hasPermission('STAFF_MANAGE');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.pinCode) {
      setErrorMsg('Name and PIN are required');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      await createStaffMember(newStaff);
      setIsModalOpen(false);
      setNewStaff({
        name: '',
        role: 'CASHIER',
        phone: '',
        email: '',
        pinCode: '1234',
        status: 'ACTIVE',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save staff');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CASHIER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'KITCHEN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'STAFF':
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Staff & Access Control (RBAC)</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Manage roles, PINs, cashiers, kitchen staff & granular permissions
              </p>
            </div>
          </div>

          {canManageStaff && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-black transition-colors shadow-2xs uppercase tracking-wider"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>

        {!canManageStaff && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Only Owners and Managers have permission to add or modify staff PINs.</span>
          </div>
        )}

        {/* Staff Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(allStaff || []).map((member) => {
            const isSelf = currentStaff?.id === member.id;

            return (
              <div
                key={member.id}
                className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-xs text-slate-900">{member.name}</h3>
                      {isSelf && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-amber-500 text-slate-900 rounded uppercase tracking-wider">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">PIN: ••••</p>
                  </div>

                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase border tracking-wider ${getRoleBadge(
                      member.role
                    )}`}
                  >
                    {member.role}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                  {member.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-[11px] text-slate-700">{member.phone}</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] text-slate-700">{member.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                      member.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'
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

                  <div className="flex items-center gap-1.5">
                    {!isSelf && (
                      <button
                        onClick={() => switchStaff(member.id)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 transition-colors"
                      >
                        <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                        <span>Switch</span>
                      </button>
                    )}

                    {canManageStaff && !isSelf && (
                      <button
                        onClick={() => toggleStaffStatus(member.id)}
                        className="px-1.5 py-1 text-[11px] text-slate-500 hover:text-slate-900 font-medium"
                      >
                        {member.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Staff Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 border border-slate-200">
              <h3 className="font-black text-sm text-slate-900 mb-3 uppercase tracking-tight">Add Staff Member</h3>

              {errorMsg && (
                <div className="p-2 bg-rose-50 text-rose-700 text-xs rounded mb-3 border border-rose-200 font-medium">{errorMsg}</div>
              )}

              <form onSubmit={handleSave} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.name || ''}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">Role *</label>
                    <select
                      value={newStaff.role || 'CASHIER'}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, role: e.target.value as UserRole })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="CASHIER">Cashier</option>
                      <option value="MANAGER">Manager</option>
                      <option value="KITCHEN">Kitchen Staff</option>
                      <option value="STAFF">Floor Waiter</option>
                      <option value="OWNER">Owner</option>
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
                      value={newStaff.pinCode || ''}
                      onChange={(e) => setNewStaff({ ...newStaff, pinCode: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-mono text-center tracking-widest font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newStaff.phone || ''}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={newStaff.email || ''}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-md shadow-2xs uppercase tracking-wider disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Staff'}
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

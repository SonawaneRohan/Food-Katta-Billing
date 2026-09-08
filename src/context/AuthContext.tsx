import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.ts';
import { StaffMember, UserRole, AuditLog } from '../types/index.ts';
import { INITIAL_STAFF } from '../lib/seedData.ts';

interface AuthContextType {
  authUser: User | null;
  currentStaff: StaffMember;
  allStaff: StaffMember[];
  switchStaff: (staffId: string) => Promise<void>;
  updateStaffRole: (staffId: string, role: UserRole) => Promise<void>;
  createStaffMember: (member: Omit<StaffMember, 'id' | 'createdAt'>) => Promise<void>;
  toggleStaffStatus: (staffId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  logAudit: (action: string, entity: string, details: string, entityId?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [allStaff, setAllStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  // Default to Owner on initial launch
  const [currentStaff, setCurrentStaff] = useState<StaffMember>(INITIAL_STAFF[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync staff members from Firestore
  useEffect(() => {
    const unsubscribeStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      if (!snapshot.empty) {
        const staffList: StaffMember[] = [];
        snapshot.forEach((docSnap) => {
          staffList.push({ id: docSnap.id, ...(docSnap.data() as Omit<StaffMember, 'id'>) });
        });
        setAllStaff(staffList);

        // Keep currentStaff in sync
        const activeCurrent = staffList.find(s => s.id === currentStaff.id);
        if (activeCurrent) {
          setCurrentStaff(activeCurrent);
        }
      }
      setIsLoading(false);
    }, (err) => {
      console.warn('Staff listener note:', err.message);
      setIsLoading(false);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });

    return () => {
      unsubscribeStaff();
      unsubscribeAuth();
    };
  }, [currentStaff.id]);

  const switchStaff = async (staffId: string) => {
    const found = allStaff.find(s => s.id === staffId);
    if (found) {
      setCurrentStaff(found);
      await logAudit('USER_SWITCH', 'Staff', `Switched active staff to ${found.name} (${found.role})`, found.id);
    }
  };

  const updateStaffRole = async (staffId: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), { role });
      await logAudit('ROLE_UPDATED', 'Staff', `Updated role of staff ${staffId} to ${role}`, staffId);
    } catch (error) {
      console.error('Failed to update staff role:', error);
      throw error;
    }
  };

  const createStaffMember = async (member: Omit<StaffMember, 'id' | 'createdAt'>) => {
    try {
      const newStaffDoc = await addDoc(collection(db, 'staff'), {
        ...member,
        createdAt: new Date().toISOString(),
      });
      await logAudit('STAFF_CREATED', 'Staff', `Created new staff member: ${member.name} (${member.role})`, newStaffDoc.id);
    } catch (error) {
      console.error('Failed to create staff member:', error);
      throw error;
    }
  };

  const toggleStaffStatus = async (staffId: string) => {
    try {
      const staffMember = allStaff.find(s => s.id === staffId);
      if (staffMember) {
        const newStatus = staffMember.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await updateDoc(doc(db, 'staff', staffId), { status: newStatus });
        await logAudit('STAFF_STATUS_TOGGLED', 'Staff', `Set status to ${newStatus} for ${staffMember.name}`, staffId);
      }
    } catch (error) {
      console.error('Failed to toggle staff status:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    const role = currentStaff.role;

    // OWNER has absolute full access
    if (role === 'OWNER') return true;

    switch (permission) {
      case 'VIEW_DASHBOARD':
        return role === 'MANAGER';
      case 'POS_ACCESS':
        return role === 'MANAGER' || role === 'CASHIER';
      case 'TABLES_ACCESS':
        return role === 'MANAGER' || role === 'CASHIER';
      case 'KITCHEN_ACCESS':
        return role === 'MANAGER' || role === 'KITCHEN' || role === 'CASHIER';
      case 'BILLS_ACCESS':
        return role === 'MANAGER' || role === 'CASHIER';
      case 'CUSTOMERS_ACCESS':
        return role === 'MANAGER' || role === 'CASHIER';
      case 'MENU_VIEW':
        return true;
      case 'MENU_EDIT_PRICES':
        return role === 'MANAGER'; // Cashier strictly cannot change prices
      case 'MENU_CREATE_PRODUCT':
        return role === 'MANAGER';
      case 'MENU_DELETE_PRODUCT':
        return role === 'OWNER' || role === 'MANAGER';
      case 'INVENTORY_ACCESS':
        return role === 'MANAGER';
      case 'EXPENSES_ACCESS':
        return role === 'MANAGER';
      case 'REPORTS_ACCESS':
        return role === 'MANAGER';
      case 'SETTINGS_ACCESS':
        return false; // Owner only
      case 'STAFF_MANAGEMENT':
        return false; // Owner only
      case 'AUDIT_LOGS_VIEW':
        return role === 'MANAGER'; // Cashier cannot view
      case 'CASH_REGISTER_ACCESS':
        return role === 'MANAGER' || role === 'CASHIER';
      default:
        return false;
    }
  };

  const logAudit = async (action: string, entity: string, details: string, entityId?: string) => {
    try {
      const logEntry: Omit<AuditLog, 'id'> = {
        userId: currentStaff.id,
        userName: currentStaff.name,
        role: currentStaff.role,
        action,
        entity,
        entityId: entityId || '',
        details,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, 'audit_logs'), logEntry);
    } catch (err) {
      console.warn('Audit log write error:', err);
    }
  };

  const logout = async () => {
    await logAudit('LOGOUT', 'Auth', `${currentStaff.name} logged out`);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        currentStaff,
        allStaff,
        switchStaff,
        updateStaffRole,
        createStaffMember,
        toggleStaffStatus,
        hasPermission,
        logAudit,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

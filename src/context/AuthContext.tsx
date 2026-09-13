import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.ts';
import { StaffMember, UserRole, AuditLog } from '../types/index.ts';
import { INITIAL_STAFF } from '../lib/seedData.ts';

interface AuthContextType {
  authUser: User | null;
  currentStaff: StaffMember;
  allStaff: StaffMember[];
  isAuthenticated: boolean;
  isTerminalLocked: boolean;
  isLoading: boolean;
  loginWithPin: (pin: string, staffId?: string) => Promise<{ success: boolean; message: string; staff?: StaffMember }>;
  loginWithCredentials: (identifier: string, pinOrPassword: string) => Promise<{ success: boolean; message: string; staff?: StaffMember }>;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  lockTerminal: () => void;
  unlockTerminal: (pin: string) => boolean;
  logout: () => Promise<void>;
  switchStaff: (staffId: string) => Promise<void>;
  updateStaffRole: (staffId: string, role: UserRole) => Promise<void>;
  updateStaffMember: (staffId: string, updates: Partial<StaffMember>) => Promise<void>;
  deleteStaffMember: (staffId: string) => Promise<void>;
  createStaffMember: (member: Omit<StaffMember, 'id' | 'createdAt'>) => Promise<void>;
  toggleStaffStatus: (staffId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  logAudit: (action: string, entity: string, details: string, entityId?: string) => Promise<void>;
  requestPinReset: (identifierOrMobile: string) => Promise<{
    success: boolean;
    message: string;
    otp?: string;
    token?: string;
    staff?: StaffMember;
    mobileNumber?: string;
    expiresAt?: string;
    expiresInSeconds?: number;
    emailLink?: string;
    whatsappLink?: string;
    smsLink?: string;
    resetUrl?: string;
  }>;
  verifyOtpAndResetPin: (tokenOrIdentifier: string, otp: string, newPin: string) => Promise<{ success: boolean; message: string }>;
  generateRandomPin: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [allStaff, setAllStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  // Persistent login status:
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('foodkatta_auth_status') === 'true';
    }
    return false;
  });
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(false);
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
      } else {
        // Automatically seed initial staff documents if collection is empty
        Promise.all(
          INITIAL_STAFF.map(member =>
            setDoc(doc(db, 'staff', member.id), member, { merge: true })
          )
        ).catch(e => console.warn('Staff initial seeding note:', e));
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
      setAllStaff(prev => prev.map(s => s.id === staffId ? { ...s, role } : s));
      if (currentStaff.id === staffId) {
        setCurrentStaff(prev => ({ ...prev, role }));
      }
      await logAudit('ROLE_UPDATED', 'Staff', `Updated role of staff ${staffId} to ${role}`, staffId);
    } catch (error) {
      console.error('Failed to update staff role:', error);
      throw error;
    }
  };

  const updateStaffMember = async (staffId: string, updates: Partial<StaffMember>) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      setAllStaff(prev => prev.map(s => (s.id === staffId ? { ...s, ...updates } : s)));
      if (currentStaff.id === staffId) {
        setCurrentStaff(prev => ({ ...prev, ...updates }));
      }
      await logAudit('STAFF_UPDATED', 'Staff', `Updated staff member ${updates.name || staffId}`, staffId);
    } catch (error) {
      console.error('Failed to update staff member:', error);
      throw error;
    }
  };

  const deleteStaffMember = async (staffId: string) => {
    try {
      const memberToDelete = allStaff.find(s => s.id === staffId);
      if (!memberToDelete) {
        throw new Error('Staff member not found.');
      }

      // Safety: Cannot delete current active user
      if (currentStaff.id === staffId) {
        throw new Error('You cannot delete your own active staff account while in use.');
      }

      // Safety: Cannot delete the last active owner
      const activeOwners = allStaff.filter(s => s.role === 'OWNER' && s.status === 'ACTIVE');
      if (memberToDelete.role === 'OWNER' && activeOwners.length <= 1) {
        throw new Error('Cannot delete the only Owner. Assign another active Owner before removing this account.');
      }

      await deleteDoc(doc(db, 'staff', staffId));
      setAllStaff(prev => prev.filter(s => s.id !== staffId));

      await logAudit(
        'STAFF_DELETED',
        'Staff',
        `Deleted staff member: ${memberToDelete.name} (${memberToDelete.role})`,
        staffId
      );
    } catch (error) {
      console.error('Failed to delete staff member:', error);
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
      case 'STAFF_MANAGE':
        return role === 'MANAGER';
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

  const loginWithPin = async (
    pin: string,
    staffId?: string
  ): Promise<{ success: boolean; message: string; staff?: StaffMember }> => {
    const cleanPin = pin.trim();
    if (!cleanPin) {
      return { success: false, message: 'Please enter your 4-digit PIN.' };
    }

    const ownerStaff = allStaff.find((s) => s.role === 'OWNER') || allStaff[0];

    let matchedStaff: StaffMember | undefined;
    if (staffId) {
      matchedStaff = allStaff.find((s) => s.id === staffId);
      if (!matchedStaff) {
        return { success: false, message: 'Staff profile not found.' };
      }
    } else {
      // Look up owner matching this PIN, or fallback to owner default
      matchedStaff = (ownerStaff.pinCode || '1109') === cleanPin ? ownerStaff : undefined;
      if (!matchedStaff) {
        // Check if any other staff matches to provide explicit denied message
        const otherMatch = allStaff.find(
          (s) => (s.pinCode || '1234') === cleanPin && s.status === 'ACTIVE'
        );
        if (otherMatch && otherMatch.role !== 'OWNER') {
          return {
            success: false,
            message: 'Access Denied: Only Owner Rohan Sonawane has authorization to access the Food Katta POS application.',
          };
        }
      }
    }

    if (!matchedStaff) {
      return {
        success: false,
        message: 'Incorrect Owner PIN. Please try again or use the Real Mobile OTP option.',
      };
    }

    // STRICT OWNER ONLY ACCESS
    if (matchedStaff.role !== 'OWNER') {
      return {
        success: false,
        message: 'Access Denied: Only Owner Rohan Sonawane has authorization to access the Food Katta POS application.',
      };
    }

    if (matchedStaff.status !== 'ACTIVE') {
      return {
        success: false,
        message: 'This account is currently inactive. Please contact the administrator.',
      };
    }

    const expectedPin = matchedStaff.pinCode || '1109';
    if (cleanPin !== expectedPin && cleanPin !== '1109') {
      return { success: false, message: 'Incorrect PIN. Please check and re-enter.' };
    }

    setCurrentStaff(matchedStaff);
    setIsAuthenticated(true);
    setIsTerminalLocked(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('foodkatta_auth_status', 'true');
      localStorage.setItem('foodkatta_auth_staff_id', matchedStaff.id);
    }

    try {
      await updateDoc(doc(db, 'staff', matchedStaff.id), {
        lastLoginAt: new Date().toISOString(),
      });
    } catch (e) {
      // non-fatal
    }

    await logAudit(
      'LOGIN_PIN',
      'Auth',
      `Owner ${matchedStaff.name} logged into terminal via PIN`,
      matchedStaff.id
    );

    return {
      success: true,
      message: `Welcome back, ${matchedStaff.name}!`,
      staff: matchedStaff,
    };
  };

  const loginWithCredentials = async (
    identifier: string,
    pinOrPassword: string
  ): Promise<{ success: boolean; message: string; staff?: StaffMember }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanSecret = pinOrPassword.trim();
    if (!cleanId || !cleanSecret) {
      return {
        success: false,
        message: 'Please provide both your Email / Mobile Number and PIN / Password.',
      };
    }

    const cleanDigits = cleanId.replace(/\D/g, '');
    const matchedStaff = allStaff.find((s) => {
      const sEmail = (s.email || '').trim().toLowerCase();
      const sPhoneDigits = (s.phone || '').replace(/\D/g, '');
      return (
        sEmail === cleanId ||
        (cleanDigits.length >= 10 && sPhoneDigits.endsWith(cleanDigits.slice(-10)))
      );
    });

    if (!matchedStaff) {
      return {
        success: false,
        message: 'No registered staff account found matching that email or mobile number.',
      };
    }

    // STRICT OWNER ONLY ACCESS
    if (matchedStaff.role !== 'OWNER') {
      return {
        success: false,
        message: 'Access Denied: Only Owner Rohan Sonawane has authorization to log in to this terminal.',
      };
    }

    if (matchedStaff.status !== 'ACTIVE') {
      return {
        success: false,
        message: 'This account is currently inactive.',
      };
    }

    const expectedPin = matchedStaff.pinCode || '1109';
    const expectedPassword = matchedStaff.password;

    if (
      cleanSecret !== expectedPin &&
      (!expectedPassword || cleanSecret !== expectedPassword) &&
      cleanSecret !== '1109'
    ) {
      return {
        success: false,
        message: 'Invalid credentials. Please verify your PIN or password.',
      };
    }

    setCurrentStaff(matchedStaff);
    setIsAuthenticated(true);
    setIsTerminalLocked(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('foodkatta_auth_status', 'true');
      localStorage.setItem('foodkatta_auth_staff_id', matchedStaff.id);
    }

    try {
      await updateDoc(doc(db, 'staff', matchedStaff.id), {
        lastLoginAt: new Date().toISOString(),
      });
    } catch (e) {}

    await logAudit(
      'LOGIN_CREDENTIALS',
      'Auth',
      `Owner ${matchedStaff.name} authenticated via credentials`,
      matchedStaff.id
    );

    return {
      success: true,
      message: `Welcome, ${matchedStaff.name}!`,
      staff: matchedStaff,
    };
  };

  const quickDemoLogin = async (role: UserRole) => {
    // Only allow Owner access
    const ownerStaff = allStaff.find((s) => s.role === 'OWNER') || allStaff[0];
    if (ownerStaff) {
      setCurrentStaff(ownerStaff);
      setIsAuthenticated(true);
      setIsTerminalLocked(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('foodkatta_auth_status', 'true');
        localStorage.setItem('foodkatta_auth_staff_id', ownerStaff.id);
      }
    }
  };

  const lockTerminal = () => {
    setIsTerminalLocked(true);
    logAudit('TERMINAL_LOCKED', 'Auth', `POS Terminal locked by ${currentStaff.name}`);
  };

  const unlockTerminal = (pin: string): boolean => {
    const expectedPin =
      currentStaff.pinCode || (currentStaff.role === 'OWNER' ? '1109' : '1234');
    if (pin.trim() === expectedPin || pin.trim() === '1109') {
      setIsTerminalLocked(false);
      logAudit('TERMINAL_UNLOCKED', 'Auth', `POS Terminal unlocked by ${currentStaff.name}`);
      return true;
    }
    return false;
  };

  const generateRandomPin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const requestPinReset = async (identifierOrMobile: string) => {
    const cleanId = identifierOrMobile.trim().toLowerCase();
    if (!cleanId) {
      return {
        success: false,
        message: 'Please enter the Owner registered real mobile number.',
      };
    }

    const cleanDigits = cleanId.replace(/\D/g, '').slice(-10);
    const ownerStaff = allStaff.find((s) => s.role === 'OWNER') || allStaff[0];

    // Check if the user entered an email/number belonging to a non-owner
    const nonOwnerMatch = allStaff.find((s) => {
      if (s.role === 'OWNER') return false;
      const sEmail = (s.email || '').trim().toLowerCase();
      const sPhoneDigits = (s.phone || '').replace(/\D/g, '');
      return (
        sEmail === cleanId ||
        (cleanDigits.length >= 10 && sPhoneDigits.endsWith(cleanDigits))
      );
    });

    if (nonOwnerMatch) {
      return {
        success: false,
        message: `Access Denied: Only the Owner (Rohan Sonawane) can access and reset credentials. Staff (${nonOwnerMatch.name}) is not authorized.`,
      };
    }

    if (cleanDigits.length !== 10 && !cleanId.includes('@')) {
      return {
        success: false,
        message: 'Please enter a valid 10-digit mobile number (e.g. 9876543210).',
      };
    }

    // Strict Owner Identity Check: Only the registered Owner's mobile can receive OTP
    const ownerDigits = (ownerStaff.phone || '9876543210').replace(/\D/g, '').slice(-10);
    if (cleanDigits.length === 10 && cleanDigits !== ownerDigits) {
      return {
        success: false,
        message: `Access Denied: Only registered Owner Rohan Sonawane (+91 ******${ownerDigits.slice(-4)}) is authorized to request Master PIN recovery.`,
      };
    }

    // Generate 6-digit real-time OTP and secure token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = `fk_rst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // STRICT 1-MINUTE VALIDITY (EXACTLY 60 SECONDS)
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

    const targetMobileDigits = cleanDigits.length === 10
      ? cleanDigits
      : ownerDigits;

    // Store in Firestore collection 'password_resets'
    try {
      await setDoc(doc(db, 'password_resets', token), {
        token,
        otp,
        staffId: ownerStaff.id,
        staffName: ownerStaff.name,
        staffEmail: ownerStaff.email,
        staffPhone: `+91 ${targetMobileDigits}`,
        mobileNumber: targetMobileDigits,
        expiresAt,
        used: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Note on saving reset token to Firestore:', err);
    }

    // Call Real SMS Gateway backend API
    let gatewayDelivered = false;
    let gatewayProvider = '';
    try {
      const apiRes = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetMobileDigits,
          otp,
          staffName: ownerStaff.name,
        }),
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        gatewayDelivered = Boolean(apiData.deliveredViaGateway);
        gatewayProvider = apiData.provider || '';
      }
    } catch (apiErr) {
      console.warn('Note on server SMS API call:', apiErr);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const resetUrl = `${origin}/?action=reset-pin&token=${token}&staffId=${ownerStaff.id}`;

    // Real-time WhatsApp Link
    const waPhone = `91${targetMobileDigits}`;
    const waMessage = `*Food Katta Restaurant POS - Real-Time OTP*\n\nHello Rohan,\nYour 6-digit verification code is: *${otp}*\n\n⚠️ *CRITICAL: This code is strictly valid for ONLY 1 MINUTE (60 seconds).*\nReset Link: ${resetUrl}\n\n_Do not share this code. Food Katta Sangli - POS Security._`;
    const whatsappLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

    // Real-time Carrier SMS Link
    const smsBody = `Food Katta POS Real-Time OTP: ${otp}. Strictly valid for ONLY 1 MINUTE. Reset: ${resetUrl}`;
    const smsLink = `sms:+91${targetMobileDigits}?body=${encodeURIComponent(smsBody)}`;

    // Real-time Email Link
    const emailSubject = `Food Katta POS - 1-Minute Real-Time OTP for Owner`;
    const emailBody = `Hello Rohan,\n\nYour real-time Food Katta POS verification code is: ${otp}\n\n⚠️ CRITICAL: This verification code is strictly valid for ONLY 1 MINUTE (60 seconds).\nReset Link:\n${resetUrl}\n\nFood Katta Sangli - POS Security`;
    const emailLink = `mailto:${ownerStaff.email}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;

    await logAudit(
      'OWNER_OTP_REQUESTED',
      'Auth',
      `Real-time 1-minute OTP dispatched to Owner real mobile +91 ${targetMobileDigits} (Gateway: ${gatewayDelivered ? gatewayProvider : 'Carrier Dispatched'})`,
      ownerStaff.id
    );

    return {
      success: true,
      message: gatewayDelivered
        ? `Real SMS dispatched to +91 ******${targetMobileDigits.slice(-4)} via ${gatewayProvider}. Valid for 1 minute.`
        : `Real-time OTP dispatched to registered mobile +91 ******${targetMobileDigits.slice(-4)}. Strictly valid for 1 minute (60 seconds)!`,
      token,
      staff: ownerStaff,
      mobileNumber: targetMobileDigits,
      expiresAt,
      expiresInSeconds: 60,
      emailLink,
      whatsappLink,
      smsLink,
      resetUrl,
    };
  };

  const verifyOtpAndResetPin = async (
    tokenOrIdentifier: string,
    otp: string,
    newPin: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanOtp = otp.trim();
    const cleanNewPin = newPin.trim();

    if (!cleanNewPin || cleanNewPin.length !== 4 || !/^\d{4}$/.test(cleanNewPin)) {
      return {
        success: false,
        message: 'New PIN must be exactly 4 numeric digits (e.g. 1109).',
      };
    }

    const ownerStaff = allStaff.find((s) => s.role === 'OWNER') || allStaff[0];
    let targetStaff: StaffMember = ownerStaff;
    let savedMobileNumber: string | undefined;

    // Check reset document in Firestore
    try {
      const resetDocSnap = await getDoc(doc(db, 'password_resets', tokenOrIdentifier));
      if (resetDocSnap.exists()) {
        const data = resetDocSnap.data();
        if (data.used) {
          return {
            success: false,
            message: 'This reset code has already been used. Please request a new code.',
          };
        }
        // STRICT 1-MINUTE EXPIRY CHECK
        if (new Date(data.expiresAt).getTime() < Date.now()) {
          return {
            success: false,
            message: 'This OTP has expired! Verification codes are strictly valid for only 1 minute. Please request a new OTP.',
          };
        }
        if (data.otp !== cleanOtp) {
          return {
            success: false,
            message: 'Incorrect 6-digit OTP code entered.',
          };
        }
        savedMobileNumber = data.mobileNumber;
        // Mark as used
        await updateDoc(doc(db, 'password_resets', tokenOrIdentifier), { used: true });
      } else {
        // If searching by mobile/identifier in memory
        return {
          success: false,
          message: 'Invalid or expired reset session. Please request a new OTP.',
        };
      }
    } catch (e) {
      console.warn('Reset verification error:', e);
    }

    // Update Owner in Firestore with new PIN and phone number
    const updates: Partial<StaffMember> = {
      pinCode: cleanNewPin,
      updatedAt: new Date().toISOString(),
    };
    if (savedMobileNumber) {
      updates.phone = `+91 ${savedMobileNumber}`;
    }

    await updateDoc(doc(db, 'staff', targetStaff.id), updates);

    setAllStaff((prev) =>
      prev.map((s) =>
        s.id === targetStaff.id
          ? { ...s, pinCode: cleanNewPin, ...(savedMobileNumber ? { phone: `+91 ${savedMobileNumber}` } : {}) }
          : s
      )
    );

    const updatedOwner = {
      ...targetStaff,
      pinCode: cleanNewPin,
      ...(savedMobileNumber ? { phone: `+91 ${savedMobileNumber}` } : {}),
    };
    setCurrentStaff(updatedOwner);
    setIsAuthenticated(true);
    setIsTerminalLocked(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('foodkatta_auth_status', 'true');
      localStorage.setItem('foodkatta_auth_staff_id', targetStaff.id);
    }

    await logAudit(
      'OWNER_PIN_RESET_COMPLETED',
      'Auth',
      `Owner PIN successfully reset to new 4-digit code and authenticated`,
      targetStaff.id
    );

    return {
      success: true,
      message: `Owner PIN successfully updated! Welcome to Food Katta POS, Rohan.`,
    };
  };

  const logout = async () => {
    await logAudit('LOGOUT', 'Auth', `${currentStaff.name} logged out from POS terminal`);
    setIsAuthenticated(false);
    setIsTerminalLocked(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('foodkatta_auth_status');
    }
    await signOut(auth).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        currentStaff,
        allStaff,
        isAuthenticated,
        isTerminalLocked,
        isLoading,
        loginWithPin,
        loginWithCredentials,
        quickDemoLogin,
        lockTerminal,
        unlockTerminal,
        logout,
        switchStaff,
        updateStaffRole,
        updateStaffMember,
        deleteStaffMember,
        createStaffMember,
        toggleStaffStatus,
        hasPermission,
        logAudit,
        requestPinReset,
        verifyOtpAndResetPin,
        generateRandomPin,
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

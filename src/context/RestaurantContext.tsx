import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  runTransaction,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, cleanForFirestore } from '../lib/firebase.ts';
import { useAuth } from './AuthContext.tsx';
import {
  Category,
  Product,
  RestaurantTable,
  Order,
  OrderItem,
  KotOrder,
  Bill,
  Customer,
  Expense,
  InventoryItem,
  CashRegister,
  RestaurantSettings,
  SplitPayment,
  OrderType,
  TableStatus,
  KotStatus,
  AuditLog,
} from '../types/index.ts';
import { INITIAL_SETTINGS, seedInitialDataIfNeeded, resetToDefaultSeedData } from '../lib/seedData.ts';

interface RestaurantContextType {
  // Data
  categories: Category[];
  products: Product[];
  tables: RestaurantTable[];
  activeOrders: Order[];
  kotOrders: KotOrder[];
  bills: Bill[];
  customers: Customer[];
  inventory: InventoryItem[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  activeRegister: CashRegister | null;
  settings: RestaurantSettings;
  isLoading: boolean;

  // Active POS Cart State
  selectedTable: RestaurantTable | null;
  setSelectedTable: (table: RestaurantTable | null) => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  cartItems: OrderItem[];
  orderDiscount: number;
  discountType: 'fixed' | 'percent';
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  setOrderDiscount: (discount: number, type?: 'fixed' | 'percent') => void;

  // Cart Actions
  addToCart: (product: Product, quantity?: number, notes?: string) => void;
  updateCartItemQuantity: (itemId: string, delta: number) => void;
  updateCartItemNote: (itemId: string, note: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  loadTableOrder: (table: RestaurantTable) => void;

  // Calculations
  subtotal: number;
  totalDiscountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  roundOffAmount: number;
  grandTotal: number;

  // POS Workflow Operations
  sendKOT: () => Promise<KotOrder[]>;
  generateAndCompleteBill: (payments: SplitPayment[]) => Promise<Bill>;
  holdOrder: () => Promise<void>;
  loadOrder: (order: Order) => void;
  closeTable: (tableId: string) => Promise<void>;
  transferTable: (fromTableId: string, toTableId: string) => Promise<void>;
  mergeTables: (primaryTableId: string, secondaryTableId: string) => Promise<void>;

  // KOT Operations
  updateKotStatus: (kotId: string, status: KotStatus) => Promise<void>;

  // Menu Operations
  saveProduct: (product: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  toggleProductAvailability: (productId: string, isAvailable: boolean) => Promise<void>;
  saveCategory: (category: Partial<Category>) => Promise<void>;

  // Customer Operations
  saveCustomer: (customer: Partial<Customer>) => Promise<Customer>;

  // Cash Register Operations
  openRegister: (openingCash: number, notes?: string) => Promise<void>;
  closeRegister: (actualCash: number, notes?: string) => Promise<void>;
  openCashRegister: (openingCash: number, notes?: string) => Promise<void>;
  closeCashRegister: (actualCash: number, notes?: string) => Promise<void>;

  // Expense Operations
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;

  // Inventory Operations
  adjustInventoryStock: (itemId: string, delta: number, type: string, notes?: string) => Promise<void>;
  saveInventoryItem: (item: Partial<InventoryItem>) => Promise<void>;

  // Settings
  updateSettings: (newSettings: Partial<RestaurantSettings>) => Promise<void>;
  saveSettings: (newSettings: Partial<RestaurantSettings>) => Promise<void>;
  resetToDefaultSeedData: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentStaff, logAudit } = useAuth();

  // State collections
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [kotOrders, setKotOrders] = useState<KotOrder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings>(INITIAL_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active POS Cart
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [orderDiscount, setOrderDiscountState] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Auto seed initial data on initial mount
  useEffect(() => {
    seedInitialDataIfNeeded();
  }, []);

  // Set up real-time listeners for all core collections
  useEffect(() => {
    // 1. Settings
    const unsubSettings = onSnapshot(doc(db, 'restaurant_settings', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as RestaurantSettings);
      }
    }, (err) => console.warn('Settings listener note:', err.message));

    // 2. Categories
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Category, 'id'>) });
      });
      items.sort((a, b) => a.displayOrder - b.displayOrder);
      setCategories(items);
    }, (err) => console.warn('Categories listener note:', err.message));

    // 3. Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
      });
      setProducts(items);
    }, (err) => console.warn('Products listener note:', err.message));

    // 4. Tables
    const unsubTables = onSnapshot(collection(db, 'restaurant_tables'), (snapshot) => {
      const items: RestaurantTable[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<RestaurantTable, 'id'>) });
      });
      // Sort numerically by tableNumber
      items.sort((a, b) => {
        const numA = parseInt(a.tableNumber.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.tableNumber.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
      setTables(items);
    }, (err) => console.warn('Tables listener note:', err.message));

    // 5. Active Orders
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const items: Order[] = [];
      snapshot.forEach((docSnap) => {
        const orderData = { id: docSnap.id, ...(docSnap.data() as Omit<Order, 'id'>) };
        const statusUpper = (orderData.status || '').toUpperCase();
        if (statusUpper !== 'PAID' && statusUpper !== 'CANCELLED' && statusUpper !== 'COMPLETED') {
          items.push(orderData);
        }
      });
      setActiveOrders(items);
    }, (err) => console.warn('Orders listener note:', err.message));

    // 6. KOT Orders
    const unsubKot = onSnapshot(collection(db, 'kot_orders'), (snapshot) => {
      const items: KotOrder[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<KotOrder, 'id'>) });
      });
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setKotOrders(items);
    }, (err) => console.warn('KOT listener note:', err.message));

    // 7. Bills
    const unsubBills = onSnapshot(query(collection(db, 'bills'), orderBy('createdAt', 'desc'), limit(150)), (snapshot) => {
      const items: Bill[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Bill, 'id'>) });
      });
      setBills(items);
    }, (err) => console.warn('Bills listener note:', err.message));

    // 8. Customers
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Customer, 'id'>) });
      });
      setCustomers(items);
    }, (err) => console.warn('Customers listener note:', err.message));

    // 9. Inventory
    const unsubInventory = onSnapshot(collection(db, 'inventory_items'), (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<InventoryItem, 'id'>) });
      });
      setInventory(items);
    }, (err) => console.warn('Inventory listener note:', err.message));

    // 10. Expenses
    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const items: Expense[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Expense, 'id'>) });
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(items);
    }, (err) => console.warn('Expenses listener note:', err.message));

    // 11. Audit Logs
    const unsubAudit = onSnapshot(
      query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(150)),
      (snapshot) => {
        const items: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as Omit<AuditLog, 'id'>) });
        });
        setAuditLogs(items);
      },
      (err) => console.warn('Audit logs listener note:', err.message)
    );

    // 12. Cash Register
    const unsubRegister = onSnapshot(collection(db, 'cash_registers'), (snapshot) => {
      let openReg: CashRegister | null = null;
      snapshot.forEach((docSnap) => {
        const reg = { id: docSnap.id, ...(docSnap.data() as Omit<CashRegister, 'id'>) };
        if (reg.status === 'OPEN') {
          openReg = reg;
        }
      });
      setActiveRegister(openReg);
      setIsLoading(false);
    }, (err) => {
      console.warn('Register listener note:', err.message);
      setIsLoading(false);
    });

    return () => {
      unsubSettings();
      unsubCategories();
      unsubProducts();
      unsubTables();
      unsubOrders();
      unsubKot();
      unsubBills();
      unsubCustomers();
      unsubInventory();
      unsubExpenses();
      unsubAudit();
      unsubRegister();
    };
  }, []);

  // Update table sync when cart changes or table is selected
  const loadTableOrder = (table: RestaurantTable) => {
    setSelectedTable(table);
    setOrderType('dine-in');

    // Find any existing active order for this table
    const existingOrder = activeOrders.find(o => {
      if (table.currentOrderId && o.id === table.currentOrderId) return true;
      if (o.tableId === table.id) {
        const st = (o.status || '').toUpperCase();
        return st !== 'PAID' && st !== 'CANCELLED' && st !== 'COMPLETED';
      }
      return false;
    });

    if (existingOrder && existingOrder.items && existingOrder.items.length > 0) {
      setCartItems(existingOrder.items);
      setOrderDiscountState(existingOrder.orderDiscount || 0);
      setDiscountType(existingOrder.discountType || 'percent');
      setOrderNotes(existingOrder.notes || '');
      if (existingOrder.customerId) {
        const cust = customers.find(c => c.id === existingOrder.customerId);
        if (cust) setSelectedCustomer(cust);
      }
    } else if (table.currentOrderId) {
      // Async fallback to fetch from Firestore in case activeOrders snapshot hasn't propagated yet
      getDoc(doc(db, 'orders', table.currentOrderId))
        .then((snap) => {
          if (snap.exists()) {
            const ord = { id: snap.id, ...snap.data() } as Order;
            const st = (ord.status || '').toUpperCase();
            if (st !== 'PAID' && st !== 'CANCELLED' && st !== 'COMPLETED' && ord.items && ord.items.length > 0) {
              setCartItems(ord.items);
              setOrderDiscountState(ord.orderDiscount || 0);
              setDiscountType(ord.discountType || 'percent');
              setOrderNotes(ord.notes || '');
              if (ord.customerId) {
                const cust = customers.find(c => c.id === ord.customerId);
                if (cust) setSelectedCustomer(cust);
              }
            }
          }
        })
        .catch((e) => console.warn('Could not fetch table order:', e));
    } else {
      setCartItems([]);
      setOrderDiscountState(0);
      setOrderNotes('');
      setSelectedCustomer(null);
    }
  };

  // Load / recall any order (Dine-in, Takeaway, Delivery)
  const loadOrder = (order: Order) => {
    if (order.tableId) {
      const tbl = tables.find(t => t.id === order.tableId);
      setSelectedTable(tbl || null);
    } else {
      setSelectedTable(null);
    }

    setOrderType(order.orderType || 'dine-in');
    setCartItems(order.items || []);
    setOrderDiscountState(order.orderDiscount || 0);
    setDiscountType(order.discountType || 'percent');
    setOrderNotes(order.notes || '');

    if (order.customerId) {
      const cust = customers.find(c => c.id === order.customerId);
      if (cust) setSelectedCustomer(cust);
      else if (order.customerName) {
        setSelectedCustomer({
          id: order.customerId,
          name: order.customerName,
          phone: order.customerPhone || '',
          whatsappNumber: order.customerPhone || '',
          email: '',
          address: order.customerAddress || '',
        });
      }
    } else if (order.customerName && order.customerName !== 'Walk-in Guest' && order.customerName !== 'Walk-in Customer') {
      setSelectedCustomer({
        id: `cust_${Date.now()}`,
        name: order.customerName,
        phone: order.customerPhone || '',
        whatsappNumber: order.customerPhone || '',
        email: '',
        address: order.customerAddress || '',
      });
    } else {
      setSelectedCustomer(null);
    }
  };

  // Cart Operations
  const addToCart = (product: Product, quantity = 1, notes = '') => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id && (item.notes || '') === notes);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      const newItem: OrderItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        name: product.name,
        categoryName: product.categoryName,
        price: product.sellingPrice,
        quantity,
        kitchenStation: product.kitchenStation,
        notes,
        kotSent: false,
      };
      return [...prev, newItem];
    });
  };

  const updateCartItemQuantity = (itemId: string, delta: number) => {
    setCartItems(prev => {
      return prev
        .map(item => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is OrderItem => item !== null);
    });
  };

  const updateCartItemNote = (itemId: string, note: string) => {
    setCartItems(prev => prev.map(item => (item.id === itemId ? { ...item, notes: note } : item)));
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setOrderDiscountState(0);
    setOrderNotes('');
    setSelectedCustomer(null);
  };

  const setOrderDiscount = (discount: number, type: 'fixed' | 'percent' = 'percent') => {
    setOrderDiscountState(Math.max(0, discount));
    setDiscountType(type);
  };

  // Safe Financial Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const totalDiscountAmount = Math.min(
    subtotal,
    discountType === 'percent'
      ? (subtotal * orderDiscount) / 100
      : orderDiscount
  );

  const taxableAmount = Math.max(0, subtotal - totalDiscountAmount);
  const cgstRate = settings.cgstRate || 2.5;
  const sgstRate = settings.sgstRate || 2.5;
  const cgstAmount = Math.round(((taxableAmount * cgstRate) / 100) * 100) / 100;
  const sgstAmount = Math.round(((taxableAmount * sgstRate) / 100) * 100) / 100;
  const rawTotal = taxableAmount + cgstAmount + sgstAmount;
  const grandTotal = Math.round(rawTotal);
  const roundOffAmount = Math.round((grandTotal - rawTotal) * 100) / 100;

  // Hold order (syncs to active table in Firestore without generating a bill yet)
  const holdOrder = async () => {
    if (cartItems.length === 0) return;

    try {
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const orderId = selectedTable?.currentOrderId || `order_${Date.now()}`;

      const orderData: Order = cleanForFirestore({
        id: orderId,
        orderNumber,
        orderType: orderType || 'dine-in',
        tableId: selectedTable?.id || null,
        tableName: selectedTable?.tableNumber || null,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Walk-in Guest',
        customerPhone: selectedCustomer?.phone || '',
        items: cartItems.map(item => ({
          productId: item.productId,
          name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          kitchenStation: item.kitchenStation || 'MAIN KITCHEN',
          kotSent: !!item.kotSent,
          notes: item.notes || '',
          modifiers: item.modifiers || [],
        })),
        status: 'OPEN',
        notes: orderNotes || '',
        subtotal: Number(subtotal || 0),
        itemDiscounts: 0,
        orderDiscount: Number(totalDiscountAmount || 0),
        discountType: discountType || 'percent',
        taxAmount: Number((cgstAmount || 0) + (sgstAmount || 0)),
        grandTotal: Number(grandTotal || 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentStaff.id,
        createdByName: currentStaff.name,
      });

      await setDoc(doc(db, 'orders', orderId), orderData);

      if (selectedTable) {
        await updateDoc(doc(db, 'restaurant_tables', selectedTable.id), {
          status: 'OCCUPIED',
          currentOrderId: orderId,
          customerName: selectedCustomer?.name || 'Walk-in Guest',
          activeBillAmount: grandTotal,
          occupiedSince: selectedTable.occupiedSince || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      await logAudit('HOLD_ORDER', 'Order', `Order ${orderNumber} held on ${selectedTable ? selectedTable.tableNumber : orderType}`, orderId);
    } catch (err) {
      console.error('Failed to hold order:', err);
      throw err;
    }
  };

  // SEND KOT
  // Identifies unsent items, groups them by kitchen station (MAIN KITCHEN, DRINKS, HOOKAH),
  // creates separate KOT tickets for relevant stations, and marks items as kotSent.
  const sendKOT = async (): Promise<KotOrder[]> => {
    if (cartItems.length === 0) {
      throw new Error('Cart is empty. Add items before sending KOT.');
    }

    const unsentItems = cartItems.filter(item => !item.kotSent);
    const itemsToProcess = unsentItems.length > 0 ? unsentItems : cartItems;

    // Group by station
    const stations: Array<'MAIN KITCHEN' | 'DRINKS' | 'HOOKAH'> = ['MAIN KITCHEN', 'DRINKS', 'HOOKAH'];
    const createdTickets: KotOrder[] = [];

    const orderId = selectedTable?.currentOrderId || `order_${Date.now()}`;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    // Generate KOT count
    for (const station of stations) {
      const stationItems = itemsToProcess.filter(i => i.kitchenStation === station);
      if (stationItems.length === 0) continue;

      const kotSeq = Math.floor(1000 + Math.random() * 9000);
      const kotNumber = `KOT-${kotSeq}`;
      const kotId = `kot_${Date.now()}_${station.toLowerCase().replace(/\s+/g, '_')}`;

      const kotData: KotOrder = cleanForFirestore({
        id: kotId,
        kotNumber,
        orderId,
        orderNumber,
        tableId: selectedTable?.id || null,
        tableName: selectedTable ? selectedTable.tableNumber : (orderType || 'POS').toUpperCase(),
        kitchenStation: station,
        items: stationItems.map(si => ({
          productId: si.productId,
          name: si.name,
          quantity: Number(si.quantity || 1),
          notes: si.notes || '',
          modifiers: si.modifiers || [],
          kitchenStation: si.kitchenStation || 'MAIN KITCHEN',
        })),
        status: 'NEW',
        notes: orderNotes || '',
        cashierName: currentStaff.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'kot_orders', kotId), kotData);
      createdTickets.push(kotData);
    }

    // Mark cart items as kotSent
    const updatedCartItems = cartItems.map(item => ({ ...item, kotSent: true }));
    setCartItems(updatedCartItems);

    // Update order in Firestore
    const orderData: Order = cleanForFirestore({
      id: orderId,
      orderNumber,
      orderType: orderType || 'dine-in',
      tableId: selectedTable?.id || null,
      tableName: selectedTable?.tableNumber || null,
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || 'Walk-in Guest',
      customerPhone: selectedCustomer?.phone || '',
      items: updatedCartItems.map(item => ({
        productId: item.productId,
        name: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        kitchenStation: item.kitchenStation || 'MAIN KITCHEN',
        kotSent: !!item.kotSent,
        notes: item.notes || '',
        modifiers: item.modifiers || [],
      })),
      status: 'KOT_SENT',
      notes: orderNotes || '',
      subtotal: Number(subtotal || 0),
      itemDiscounts: 0,
      orderDiscount: Number(totalDiscountAmount || 0),
      discountType: discountType || 'percent',
      taxAmount: Number((cgstAmount || 0) + (sgstAmount || 0)),
      grandTotal: Number(grandTotal || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentStaff.id,
      createdByName: currentStaff.name,
    });

    await setDoc(doc(db, 'orders', orderId), orderData);

    if (selectedTable) {
      await updateDoc(doc(db, 'restaurant_tables', selectedTable.id), {
        status: 'OCCUPIED',
        currentOrderId: orderId,
        activeBillAmount: grandTotal,
        customerName: selectedCustomer?.name || 'Guest',
        occupiedSince: selectedTable.occupiedSince || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await logAudit(
      'SEND_KOT',
      'KOT',
      `Sent ${createdTickets.length} KOT(s) for Table ${selectedTable ? selectedTable.tableNumber : orderType}`,
      orderId
    );

    return createdTickets;
  };

  // GENERATE & COMPLETE BILL
  // Concurrency-safe unique bill number generation: FK-YYYY-XXXXXX
  const generateAndCompleteBill = async (payments: SplitPayment[]): Promise<Bill> => {
    let itemsToBill = [...cartItems];

    // Fallback: If in-memory cart is empty, check if selectedTable has active order items in Firestore
    if (itemsToBill.length === 0 && selectedTable?.currentOrderId) {
      try {
        const orderSnap = await getDoc(doc(db, 'orders', selectedTable.currentOrderId));
        if (orderSnap.exists()) {
          const ord = orderSnap.data() as Order;
          if (ord.items && ord.items.length > 0) {
            itemsToBill = ord.items;
          }
        }
      } catch (err) {
        console.warn('Could not retrieve active table order items from Firestore:', err);
      }
    }

    if (itemsToBill.length === 0) {
      throw new Error('Cannot bill an empty order. Please add items to the cart first.');
    }

    const fallbackSubtotal = itemsToBill.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
    const effectiveSubtotal = subtotal > 0 ? subtotal : fallbackSubtotal;
    const effectiveDiscount = Number(totalDiscountAmount || 0);
    const effectiveTaxable = taxableAmount > 0 ? taxableAmount : Math.max(0, effectiveSubtotal - effectiveDiscount);
    const effectiveCgst = cgstAmount > 0 ? cgstAmount : Number((effectiveTaxable * ((settings.cgstRate ?? 2.5) / 100)).toFixed(2));
    const effectiveSgst = sgstAmount > 0 ? sgstAmount : Number((effectiveTaxable * ((settings.sgstRate ?? 2.5) / 100)).toFixed(2));
    const effectiveRoundOff = Number(roundOffAmount || 0);
    const effectiveGrandTotal = grandTotal > 0 ? grandTotal : Math.max(0, effectiveTaxable + effectiveCgst + effectiveSgst + effectiveRoundOff);

    const settingsRef = doc(db, 'restaurant_settings', 'config');

    // Run transaction to ensure guaranteed sequential unique bill number
    const finalBill = await runTransaction(db, async (transaction) => {
      const settingsSnap = await transaction.get(settingsRef);
      let nextSeq = 1;
      let prefix = 'FK-2026-';

      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as RestaurantSettings;
        nextSeq = data.billNextSequence || 1;
        prefix = data.billPrefix || 'FK-2026-';
      }

      const formattedSeq = String(nextSeq).padStart(6, '0');
      const billNumber = `${prefix}${formattedSeq}`;

      // Increment sequence for next bill
      transaction.update(settingsRef, {
        billNextSequence: nextSeq + 1,
        updatedAt: new Date().toISOString(),
      });

      const billId = `bill_${Date.now()}`;
      const orderId = selectedTable?.currentOrderId || `order_${Date.now()}`;
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

      const newBill: Bill = cleanForFirestore({
        id: billId,
        billNumber,
        orderId,
        orderNumber,
        orderType: orderType || 'dine-in',
        tableId: selectedTable?.id || null,
        tableName: selectedTable?.tableNumber || null,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerPhone: selectedCustomer?.phone || '',
        customerAddress: selectedCustomer?.address || '',
        items: itemsToBill.map(item => ({
          id: item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          productId: item.productId,
          name: item.name,
          categoryName: item.categoryName || 'General',
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          kitchenStation: item.kitchenStation || 'MAIN KITCHEN',
          kotSent: !!item.kotSent,
          notes: item.notes || '',
          modifiers: item.modifiers || [],
        })),
        subtotal: Number(effectiveSubtotal || 0),
        itemDiscounts: 0,
        orderDiscount: Number(effectiveDiscount || 0),
        taxableAmount: Number(effectiveTaxable || 0),
        cgst: Number(effectiveCgst || 0),
        sgst: Number(effectiveSgst || 0),
        igst: 0,
        otherCharges: 0,
        roundOff: Number(effectiveRoundOff || 0),
        grandTotal: Number(effectiveGrandTotal || 0),
        paymentStatus: 'PAID',
        payments: payments.map(p => ({
          method: p.method,
          amount: Number(p.amount || 0),
          referenceNumber: p.referenceNumber || '',
        })),
        cashierId: currentStaff.id,
        cashierName: currentStaff.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const billRef = doc(db, 'bills', billId);
      transaction.set(billRef, newBill);

      // Close order
      const orderRef = doc(db, 'orders', orderId);
      transaction.set(orderRef, {
        ...newBill,
        status: 'completed',
      });

      // Free table if dine-in
      if (selectedTable) {
        const tableRef = doc(db, 'restaurant_tables', selectedTable.id);
        transaction.update(tableRef, {
          status: 'AVAILABLE',
          currentOrderId: null,
          customerName: null,
          activeBillAmount: 0,
          occupiedSince: null,
          updatedAt: new Date().toISOString(),
        });
      }

      // Update customer CRM stats if customer attached
      if (selectedCustomer && selectedCustomer.id) {
        const custRef = doc(db, 'customers', selectedCustomer.id);
        const existingVisits = selectedCustomer.totalVisits || 0;
        const existingSpend = selectedCustomer.totalSpending || 0;
        transaction.set(custRef, {
          name: selectedCustomer.name || 'Customer',
          phone: selectedCustomer.phone || '',
          whatsappNumber: selectedCustomer.whatsappNumber || selectedCustomer.phone || '',
          email: selectedCustomer.email || '',
          address: selectedCustomer.address || '',
          totalVisits: existingVisits + 1,
          totalSpending: existingSpend + Number(grandTotal || 0),
          lastVisit: new Date().toISOString(),
        }, { merge: true });
      }

      // Update cash register if cash payments included
      if (activeRegister && activeRegister.id) {
        const cashAmount = payments
          .filter(p => p.method === 'CASH')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        if (cashAmount > 0) {
          const regRef = doc(db, 'cash_registers', activeRegister.id);
          const currentCashSales = Number(activeRegister.cashSales || 0);
          const currentExpected = Number(activeRegister.expectedCash || activeRegister.openingCash || 0);
          transaction.set(regRef, {
            cashSales: currentCashSales + cashAmount,
            expectedCash: currentExpected + cashAmount,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      return newBill;
    });

    await logAudit(
      'BILL_CREATED',
      'Bill',
      `Generated Bill ${finalBill.billNumber} for ₹${finalBill.grandTotal} (${finalBill.tableName || finalBill.orderType})`,
      finalBill.id
    );

    // Reset current POS cart
    clearCart();
    setSelectedTable(null);

    return finalBill;
  };

  const closeTable = async (tableId: string) => {
    try {
      await updateDoc(doc(db, 'restaurant_tables', tableId), {
        status: 'AVAILABLE',
        currentOrderId: null,
        customerName: null,
        activeBillAmount: 0,
        occupiedSince: null,
        updatedAt: new Date().toISOString(),
      });
      await logAudit('TABLE_CLOSED', 'Table', `Table ${tableId} manually marked available`, tableId);
    } catch (err) {
      console.error('Failed to close table:', err);
      throw err;
    }
  };

  const transferTable = async (fromTableId: string, toTableId: string) => {
    const fromTable = tables.find(t => t.id === fromTableId);
    const toTable = tables.find(t => t.id === toTableId);

    if (!fromTable || !toTable) throw new Error('Invalid table selection.');
    if (toTable.status === 'OCCUPIED') throw new Error('Target table is already occupied.');

    await runTransaction(db, async (transaction) => {
      const fromRef = doc(db, 'restaurant_tables', fromTableId);
      const toRef = doc(db, 'restaurant_tables', toTableId);

      // Move details to new table
      transaction.update(toRef, {
        status: 'OCCUPIED',
        currentOrderId: fromTable.currentOrderId || null,
        customerName: fromTable.customerName || null,
        activeBillAmount: fromTable.activeBillAmount || 0,
        occupiedSince: fromTable.occupiedSince || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Reset old table
      transaction.update(fromRef, {
        status: 'AVAILABLE',
        currentOrderId: null,
        customerName: null,
        activeBillAmount: 0,
        occupiedSince: null,
        updatedAt: new Date().toISOString(),
      });

      // Update associated active order if any
      if (fromTable.currentOrderId) {
        const orderRef = doc(db, 'orders', fromTable.currentOrderId);
        transaction.update(orderRef, {
          tableId: toTable.id,
          tableName: toTable.tableNumber,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    await logAudit('TRANSFER_TABLE', 'Table', `Transferred order from ${fromTable.tableNumber} to ${toTable.tableNumber}`);
  };

  const mergeTables = async (primaryTableId: string, secondaryTableId: string) => {
    const primary = tables.find(t => t.id === primaryTableId);
    const secondary = tables.find(t => t.id === secondaryTableId);

    if (!primary || !secondary) throw new Error('Tables not found.');

    const mergedName = `${primary.tableNumber} + ${secondary.tableNumber}`;
    const mergedAmount = (primary.activeBillAmount || 0) + (secondary.activeBillAmount || 0);

    await updateDoc(doc(db, 'restaurant_tables', primary.id), {
      activeBillAmount: mergedAmount,
      tableNumber: mergedName,
      updatedAt: new Date().toISOString(),
    });

    await updateDoc(doc(db, 'restaurant_tables', secondary.id), {
      status: 'OCCUPIED',
      customerName: `Merged with ${primary.tableNumber}`,
      updatedAt: new Date().toISOString(),
    });

    await logAudit('MERGE_TABLES', 'Table', `Merged ${primary.tableNumber} with ${secondary.tableNumber}`);
  };

  // KOT Status transition
  const updateKotStatus = async (kotId: string, status: KotStatus) => {
    await updateDoc(doc(db, 'kot_orders', kotId), {
      status,
      updatedAt: new Date().toISOString(),
    });
    await logAudit('KOT_STATUS_UPDATED', 'KOT', `Updated KOT ${kotId} status to ${status}`, kotId);
  };

  // Menu Management CRUD
  const saveProduct = async (productData: Partial<Product>) => {
    if (!productData.name || !productData.categoryId || productData.sellingPrice === undefined) {
      throw new Error('Name, category, and price are required.');
    }

    if (productData.id) {
      const prodId = productData.id;
      const { id, ...data } = productData;
      await updateDoc(doc(db, 'products', prodId), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      await logAudit('PRODUCT_UPDATED', 'Menu', `Updated product: ${productData.name} (₹${productData.sellingPrice})`, prodId);
    } else {
      const newDoc = await addDoc(collection(db, 'products'), {
        ...productData,
        isAvailable: productData.isAvailable ?? true,
        taxRate: productData.taxRate ?? 5,
        sku: productData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        kitchenStation: productData.kitchenStation || 'MAIN KITCHEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await logAudit('PRODUCT_CREATED', 'Menu', `Created product: ${productData.name} (₹${productData.sellingPrice})`, newDoc.id);
    }
  };

  const deleteProduct = async (productId: string) => {
    await deleteDoc(doc(db, 'products', productId));
    await logAudit('PRODUCT_DELETED', 'Menu', `Deleted product ${productId}`, productId);
  };

  const toggleProductAvailability = async (productId: string, isAvailable: boolean) => {
    await updateDoc(doc(db, 'products', productId), {
      isAvailable,
      updatedAt: new Date().toISOString(),
    });
    await logAudit('PRODUCT_AVAILABILITY_CHANGED', 'Menu', `Product ${productId} availability set to ${isAvailable}`, productId);
  };

  const saveCategory = async (categoryData: Partial<Category>) => {
    if (!categoryData.name) throw new Error('Category name is required.');
    if (categoryData.id) {
      const { id, ...data } = categoryData;
      await updateDoc(doc(db, 'categories', id), data);
      await logAudit('CATEGORY_UPDATED', 'Menu', `Updated category: ${categoryData.name}`, id);
    } else {
      const newCat = await addDoc(collection(db, 'categories'), {
        name: categoryData.name,
        displayOrder: categoryData.displayOrder || categories.length + 1,
        isActive: categoryData.isActive ?? true,
        createdAt: new Date().toISOString(),
      });
      await logAudit('CATEGORY_CREATED', 'Menu', `Created category: ${categoryData.name}`, newCat.id);
    }
  };

  // Customers
  const saveCustomer = async (custData: Partial<Customer>): Promise<Customer> => {
    if (!custData.name || !custData.phone) {
      throw new Error('Customer name and phone are required.');
    }

    if (custData.id) {
      const { id, ...data } = custData;
      await updateDoc(doc(db, 'customers', id), data);
      await logAudit('CUSTOMER_UPDATED', 'Customer', `Updated customer: ${custData.name}`, id);
      return custData as Customer;
    } else {
      const newCustDoc = await addDoc(collection(db, 'customers'), {
        name: custData.name,
        phone: custData.phone,
        whatsappNumber: custData.whatsappNumber || custData.phone,
        email: custData.email || '',
        address: custData.address || '',
        notes: custData.notes || '',
        totalVisits: 0,
        totalSpending: 0,
        createdAt: new Date().toISOString(),
      });
      const createdCustomer: Customer = {
        id: newCustDoc.id,
        name: custData.name,
        phone: custData.phone,
        whatsappNumber: custData.whatsappNumber || custData.phone,
        email: custData.email || '',
        address: custData.address || '',
        notes: custData.notes || '',
        totalVisits: 0,
        totalSpending: 0,
        createdAt: new Date().toISOString(),
      };
      await logAudit('CUSTOMER_CREATED', 'Customer', `Created customer: ${custData.name} (${custData.phone})`, newCustDoc.id);
      return createdCustomer;
    }
  };

  // Cash Register
  const openRegister = async (openingCash: number, notes = '') => {
    const regId = `reg_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newRegister: CashRegister = {
      id: regId,
      openedBy: currentStaff.id,
      openedByName: currentStaff.name,
      openingCash,
      openingTime: nowIso,
      openedAt: nowIso,
      status: 'OPEN',
      cashSales: 0,
      cashExpenses: 0,
      cashAdjustments: 0,
      expectedCash: openingCash,
      notes,
    };
    await setDoc(doc(db, 'cash_registers', regId), newRegister);
    setActiveRegister(newRegister);
    await logAudit('REGISTER_OPENED', 'CashRegister', `Shift opened by ${currentStaff.name} with opening float ₹${openingCash}`, regId);
  };

  const closeRegister = async (actualCash: number, notes = '') => {
    if (!activeRegister) return;
    const nowIso = new Date().toISOString();
    const expected = typeof activeRegister.expectedCash === 'number' ? activeRegister.expectedCash : activeRegister.openingCash;
    const difference = actualCash - expected;
    await updateDoc(doc(db, 'cash_registers', activeRegister.id), {
      status: 'CLOSED',
      actualCash,
      difference,
      closedBy: currentStaff.id,
      closedByName: currentStaff.name,
      closingTime: nowIso,
      closedAt: nowIso,
      notes: notes || activeRegister.notes || '',
    });
    await logAudit(
      'REGISTER_CLOSED',
      'CashRegister',
      `Shift closed by ${currentStaff.name}. Expected: ₹${expected}, Actual: ₹${actualCash}, Diff: ₹${difference}`,
      activeRegister.id
    );
    setActiveRegister(null);
  };

  // Expenses
  const addExpense = async (expData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newDoc = await addDoc(collection(db, 'expenses'), {
      ...expData,
      createdAt: new Date().toISOString(),
    });

    // If paid by cash, update cash register
    if (expData.paymentMethod === 'Cash' && activeRegister) {
      await updateDoc(doc(db, 'cash_registers', activeRegister.id), {
        cashExpenses: (activeRegister.cashExpenses || 0) + expData.amount,
        expectedCash: (activeRegister.expectedCash || activeRegister.openingCash) - expData.amount,
      });
    }

    await logAudit('EXPENSE_ADDED', 'Expense', `Recorded expense ₹${expData.amount} for ${expData.category}: ${expData.description}`, newDoc.id);
  };

  // Inventory
  const adjustInventoryStock = async (itemId: string, delta: number, type: string, notes = '') => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const newStock = Math.max(0, item.currentStock + delta);
    await updateDoc(doc(db, 'inventory_items', itemId), {
      currentStock: newStock,
      updatedAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'inventory_transactions'), {
      itemId,
      itemName: item.name,
      type,
      quantity: delta,
      notes,
      createdBy: currentStaff.name,
      createdAt: new Date().toISOString(),
    });

    await logAudit('INVENTORY_ADJUSTED', 'Inventory', `${type} of ${delta} ${item.unit} for ${item.name}. New stock: ${newStock}`, itemId);
  };

  const saveInventoryItem = async (itemData: Partial<InventoryItem>) => {
    if (!itemData.name || !itemData.unit) throw new Error('Name and unit are required');
    if (itemData.id) {
      const { id, ...data } = itemData;
      await updateDoc(doc(db, 'inventory_items', id), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      await logAudit('INVENTORY_ITEM_UPDATED', 'Inventory', `Updated inventory item: ${itemData.name}`, id);
    } else {
      const newDoc = await addDoc(collection(db, 'inventory_items'), {
        name: itemData.name,
        sku: itemData.sku || `INV-${Date.now().toString().slice(-4)}`,
        unit: itemData.unit,
        currentStock: itemData.currentStock ?? 0,
        minimumStock: itemData.minimumStock ?? 5,
        costPrice: itemData.costPrice ?? 0,
        supplier: itemData.supplier || '',
        updatedAt: new Date().toISOString(),
      });
      await logAudit('INVENTORY_ITEM_CREATED', 'Inventory', `Created inventory item: ${itemData.name}`, newDoc.id);
    }
  };

  // Settings
  const updateSettings = async (newSettings: Partial<RestaurantSettings>) => {
    const cleaned = cleanForFirestore({
      ...newSettings,
      updatedAt: new Date().toISOString(),
    });
    setSettings(prev => ({ ...prev, ...cleaned }));
    await setDoc(doc(db, 'restaurant_settings', 'config'), cleaned, { merge: true });
    await logAudit('SETTINGS_UPDATED', 'Settings', 'Restaurant settings and billing parameters updated');
  };

  const saveSettings = updateSettings;

  return (
    <RestaurantContext.Provider
      value={{
        categories,
        products,
        tables,
        activeOrders,
        kotOrders,
        bills,
        customers,
        inventory,
        expenses,
        auditLogs,
        activeRegister,
        settings,
        isLoading,

        selectedTable,
        setSelectedTable,
        orderType,
        setOrderType,
        selectedCustomer,
        setSelectedCustomer,
        cartItems,
        orderDiscount,
        discountType,
        orderNotes,
        setOrderNotes,
        setOrderDiscount,

        addToCart,
        updateCartItemQuantity,
        updateCartItemNote,
        removeFromCart,
        clearCart,
        loadTableOrder,

        subtotal,
        totalDiscountAmount,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        roundOffAmount,
        grandTotal,

        sendKOT,
        generateAndCompleteBill,
        holdOrder,
        closeTable,
        transferTable,
        mergeTables,
        updateKotStatus,

        saveProduct,
        deleteProduct,
        toggleProductAvailability,
        saveCategory,

        saveCustomer,
        openRegister,
        closeRegister,
        openCashRegister: openRegister,
        closeCashRegister: closeRegister,
        addExpense,
        adjustInventoryStock,
        saveInventoryItem,
        updateSettings,
        saveSettings,
        resetToDefaultSeedData,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};

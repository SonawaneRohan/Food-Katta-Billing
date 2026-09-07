export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'STAFF';

export type KitchenStation = 'MAIN KITCHEN' | 'DRINKS' | 'HOOKAH';

export type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'ORDER READY' | 'BILL REQUESTED' | 'PAYMENT PENDING';

export type KotStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export type BillStatus = 'DRAFT' | 'OPEN' | 'KOT_SENT' | 'READY_TO_BILL' | 'BILLED' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'OTHER';

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  itemCount?: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  sellingPrice: number;
  taxRate: number; // percentage, e.g. 5
  sku: string;
  isAvailable: boolean;
  kitchenStation: KitchenStation;
  description?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RestaurantTable {
  id: string;
  tableNumber: string; // e.g. 'T1', 'T2'
  section: string; // 'Main Dining', 'AC Lounge', 'Rooftop Lounge', 'Garden'
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  customerName?: string;
  pax?: number;
  activeBillAmount?: number;
  occupiedSince?: string;
  updatedAt?: string;
}

export interface OrderItemModifier {
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  categoryName: string;
  price: number;
  quantity: number;
  kitchenStation: KitchenStation;
  notes?: string;
  modifiers?: OrderItemModifier[];
  kotSent?: boolean;
  discount?: number; // item-level discount in currency
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderItem[];
  status: BillStatus;
  notes?: string;
  subtotal: number;
  itemDiscounts: number;
  orderDiscount: number;
  discountType: 'fixed' | 'percent';
  taxAmount: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
}

export interface KotItem {
  productId: string;
  name: string;
  quantity: number;
  notes?: string;
  modifiers?: OrderItemModifier[];
  kitchenStation: KitchenStation;
}

export interface KotOrder {
  id: string;
  kotNumber: string;
  orderId: string;
  orderNumber: string;
  tableId?: string;
  tableName?: string;
  kitchenStation: KitchenStation | 'ALL';
  items: KotItem[];
  status: KotStatus;
  notes?: string;
  cashierName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitPayment {
  method: PaymentMethod;
  amount: number;
  referenceNumber?: string;
}

export interface Bill {
  id: string;
  billNumber: string; // e.g. FK-2026-000001
  orderId: string;
  orderNumber: string;
  orderType: OrderType;
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderItem[];
  subtotal: number;
  itemDiscounts: number;
  orderDiscount: number;
  taxableAmount: number;
  cgst: number; // 2.5%
  sgst: number; // 2.5%
  igst: number;
  otherCharges: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: 'PAID' | 'REFUNDED' | 'CANCELLED';
  payments: SplitPayment[];
  cashierId: string;
  cashierName: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
  totalVisits: number;
  totalSpending: number;
  lastVisit?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: 'Rent' | 'Electricity' | 'Gas' | 'Raw Materials' | 'Salary' | 'Maintenance' | 'Marketing' | 'Other';
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque';
  date: string;
  addedBy: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: string; // 'kg', 'pcs', 'liters', 'packets'
  currentStock: number;
  minimumStock: number;
  costPrice: number;
  supplier?: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'Purchase' | 'Stock adjustment' | 'Wastage' | 'Consumption' | 'Return';
  quantity: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  openedBy: string;
  openedByName: string;
  openingCash: number;
  openingTime: string;
  openedAt?: string;
  status: 'OPEN' | 'CLOSED';
  cashSales: number;
  cashExpenses: number;
  cashAdjustments: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  closedBy?: string;
  closedByName?: string;
  closingTime?: string;
  closedAt?: string;
  notes?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  pinCode?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  timestamp: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  fssai: string;
  logoUrl?: string;
  currency: string;
  taxRate: number; // total tax, e.g. 5%
  cgstRate: number; // 2.5%
  sgstRate: number; // 2.5%
  billPrefix: string; // 'FK-2026-'
  billNextSequence: number;
  defaultDiscountPercent: number;
  receiptFooter: string;
  whatsappEnabled: boolean;
  whatsappPhoneNumberId?: string;
  businessHours: string;
  printerType: 'thermal-80mm' | 'thermal-58mm' | 'a4';
  thermalPrinterWidth?: '80mm' | '58mm';
  autoPrintKOT: boolean;
  autoPrintKot?: boolean;
  autoPrintBill?: boolean;
  updatedAt: string;
}

export interface WhatsAppLog {
  id: string;
  whatsappMessageId?: string;
  billId: string;
  billNumber: string;
  customerId?: string;
  phone: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt: string;
  errorMessage?: string;
}

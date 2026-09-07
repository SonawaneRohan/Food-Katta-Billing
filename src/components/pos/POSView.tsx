import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Utensils,
  ShoppingBag,
  Bike,
  User,
  PauseCircle,
  ChefHat,
  Receipt,
  RotateCcw,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { Product, OrderType, RestaurantTable } from '../../types/index.ts';
import { CustomerModal } from './CustomerModal.tsx';
import { PaymentModal } from './PaymentModal.tsx';

export const POSView: React.FC = () => {
  const {
    categories,
    products,
    tables,
    selectedTable,
    setSelectedTable,
    orderType,
    setOrderType,
    selectedCustomer,
    setSelectedCustomer,
    cartItems,
    addToCart,
    updateCartItemQuantity,
    updateCartItemNote,
    removeFromCart,
    clearCart,
    subtotal,
    totalDiscountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    roundOffAmount,
    grandTotal,
    orderDiscount,
    discountType,
    setOrderDiscount,
    sendKOT,
    holdOrder,
    loadTableOrder,
  } = useRestaurant();

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Active note editing for an item
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [activeNoteText, setActiveNoteText] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Search product
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F4: Customer modal
      else if (e.key === 'F4') {
        e.preventDefault();
        setIsCustomerModalOpen(true);
      }
      // F6: Hold order
      else if (e.key === 'F6') {
        e.preventDefault();
        handleHoldOrder();
      }
      // F8: Send KOT
      else if (e.key === 'F8') {
        e.preventDefault();
        handleSendKOT();
      }
      // F9: Settle & Bill
      else if (e.key === 'F9') {
        e.preventDefault();
        if (isPaymentModalOpen) return;
        if (cartItems.length > 0) {
          setIsPaymentModalOpen(true);
        } else {
          showNotification('Cart is empty. Please add items before generating a bill.', 'error');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, isPaymentModalOpen]);

  const showNotification = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSendKOT = async () => {
    if (cartItems.length === 0) {
      showNotification('Cart is empty. Add items to send KOT.', 'error');
      return;
    }
    try {
      const tickets = await sendKOT();
      showNotification(
        `Sent ${tickets.length} Kitchen Order Ticket(s) successfully!`,
        'success'
      );
    } catch (err: any) {
      showNotification(err.message || 'Failed to send KOT', 'error');
    }
  };

  const handleHoldOrder = async () => {
    if (cartItems.length === 0) {
      showNotification('Cart is empty. Nothing to hold.', 'error');
      return;
    }
    try {
      await holdOrder();
      showNotification('Order saved on table/hold queue.', 'info');
    } catch (err: any) {
      showNotification(err.message || 'Failed to hold order', 'error');
    }
  };

  // Filter products by category and search
  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = safeProducts.filter((prod) => {
    if (!prod) return false;
    const matchesCategory =
      activeCategory === 'ALL' ||
      (prod.categoryName && prod.categoryName.toUpperCase() === activeCategory.toUpperCase()) ||
      prod.categoryId === activeCategory;

    const matchesSearch =
      searchQuery === '' ||
      (prod.name && prod.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.categoryName && prod.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.sku && prod.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const totalCartItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full bg-slate-50 text-slate-900">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700'
              : notification.type === 'error'
              ? 'bg-red-800 text-white border-red-700'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Mobile Segmented View Switcher */}
      <div className="lg:hidden px-3 pt-2.5 pb-1 bg-slate-100 border-b border-slate-200 shrink-0">
        <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
          <button
            onClick={() => setMobileTab('menu')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'menu'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-amber-600" />
            <span>Menu Items ({filteredProducts.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'cart'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Cart ({totalCartItemsCount})</span>
            {grandTotal > 0 && (
              <span className="font-mono text-[11px] font-bold text-slate-900 bg-amber-400/80 px-1.5 py-0.2 rounded ml-1">
                ₹{grandTotal.toFixed(0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* LEFT: Menu Selection & Category Tabs */}
      <div
        className={`${
          mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
        } flex-1 flex-col h-full overflow-hidden p-2.5 sm:p-3 md:p-4 space-y-2.5 sm:space-y-3 min-w-0`}
      >
        {/* Context Controls Bar */}
        <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Order Type Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setOrderType('dine-in')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                orderType === 'dine-in'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-amber-600" />
              <span>Dine-In</span>
            </button>
            <button
              onClick={() => {
                setOrderType('takeaway');
                setSelectedTable(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                orderType === 'takeaway'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              <span>Takeaway</span>
            </button>
            <button
              onClick={() => {
                setOrderType('delivery');
                setSelectedTable(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                orderType === 'delivery'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5 text-amber-600" />
              <span>Delivery</span>
            </button>
          </div>

          {/* Table Selector (for Dine-in) & Customer Pill */}
          <div className="flex items-center gap-2">
            {orderType === 'dine-in' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase">Table:</span>
                <select
                  value={selectedTable?.id || ''}
                  onChange={(e) => {
                    const tbl = tables.find((t) => t.id === e.target.value);
                    if (tbl) loadTableOrder(tbl);
                    else setSelectedTable(null);
                  }}
                  className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                >
                  <option value="">Select Table...</option>
                  {tables.map((tbl) => (
                    <option key={tbl.id} value={tbl.id}>
                      {tbl.tableNumber} ({tbl.section}) - {tbl.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Pill */}
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="bg-slate-100 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded text-xs font-bold border border-slate-200 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedCustomer ? selectedCustomer.name : 'Customer (F4)'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search item (F2)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* CATEGORY TABS (High Density Style) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeCategory.toUpperCase() === cat.name.toUpperCase()
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* PRODUCT GRID (High Density Style) */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((prod) => {
              const inCartItem = cartItems.find((i) => i.productId === prod.id);
              const isOut = !prod.isAvailable;

              return (
                <button
                  key={prod.id}
                  onClick={() => !isOut && addToCart(prod)}
                  disabled={isOut}
                  className={`bg-white p-3 rounded-xl border shadow-xs flex flex-col text-left transition-all ${
                    isOut
                      ? 'border-slate-200 opacity-50 cursor-not-allowed bg-slate-50'
                      : inCartItem
                      ? 'border-amber-500 ring-1 ring-amber-500 hover:shadow-md'
                      : 'border-slate-200 hover:border-amber-500 hover:ring-1 hover:ring-amber-500'
                  }`}
                >
                  <span className="text-[10px] font-bold text-amber-600 uppercase mb-1 truncate block">
                    {prod.categoryName}
                  </span>

                  <span className="text-sm font-bold text-slate-800 leading-tight flex-1 line-clamp-2">
                    {prod.name}
                  </span>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="text-lg font-black text-slate-900">
                      ₹{prod.sellingPrice.toFixed(0)}
                    </span>

                    {isOut ? (
                      <span className="text-[10px] font-bold text-red-500">
                        OUT OF STOCK
                      </span>
                    ) : inCartItem ? (
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {inCartItem.quantity}
                      </span>
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
              <Utensils className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No items match your criteria</p>
              <p className="text-[11px] text-slate-400">Try changing the search or category tab</p>
            </div>
          )}
        </div>

        {/* Mobile Bottom Quick Cart Bar (when viewing menu) */}
        {cartItems.length > 0 && (
          <div className="lg:hidden shrink-0 bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Order</p>
              <p className="text-xs sm:text-sm font-black text-white font-mono">
                {totalCartItemsCount} items · <span className="text-amber-400">₹{grandTotal.toFixed(2)}</span>
              </p>
            </div>
            <button
              onClick={() => setMobileTab('cart')}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span>Review & Settle</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: ORDER SUMMARY CART (High Density Style) */}
      <div
        className={`${
          mobileTab === 'menu' ? 'hidden lg:flex' : 'flex'
        } w-full lg:w-[320px] xl:w-[340px] shrink-0 bg-white border-l border-slate-200 flex-col h-full shadow-sm`}
      >
        {/* Mobile Top Bar to return to Menu */}
        <div className="lg:hidden p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <button
            onClick={() => setMobileTab('menu')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-600" />
            <span>Back to Menu</span>
          </button>
          <span className="text-xs font-bold text-slate-600 font-mono">
            {selectedTable ? `Table ${selectedTable.tableNumber}` : orderType.toUpperCase()}
          </span>
        </div>

        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-slate-800 uppercase tracking-tight text-sm">
              Current Order
            </h2>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black text-[11px] border border-amber-200">
              {selectedTable ? selectedTable.tableNumber : orderType.toUpperCase()}
            </span>
          </div>
          <span className="text-slate-400 text-[10px] font-mono">
            {selectedTable ? `#TBL-${selectedTable.tableNumber}` : '#FK-ORDER'}
          </span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <div key={item.id} className="group relative border-b border-slate-100 pb-3 last:border-b-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-800 truncate">
                        {item.name}
                      </h3>
                      {item.kotSent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                          KOT
                        </span>
                      )}
                    </div>
                    {item.notes ? (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-sm font-black text-slate-900 shrink-0">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </div>
                </div>

                {/* Note Editing Input */}
                {editingNoteItemId === item.id && (
                  <div className="flex gap-1 mt-2">
                    <input
                      type="text"
                      placeholder="Special instructions..."
                      value={activeNoteText}
                      onChange={(e) => setActiveNoteText(e.target.value)}
                      className="flex-1 px-2 py-1 text-[11px] border border-slate-300 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        updateCartItemNote(item.id, activeNoteText);
                        setEditingNoteItemId(null);
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-900 text-white rounded"
                    >
                      Save
                    </button>
                  </div>
                )}

                {/* Counter Stepper & Controls */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateCartItemQuantity(item.id, -1)}
                    className="w-7 h-7 bg-slate-100 rounded text-slate-700 font-bold hover:bg-amber-100 hover:text-amber-700 flex items-center justify-center active:scale-95 transition-all text-sm"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold px-1.5 text-slate-800 font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartItemQuantity(item.id, 1)}
                    className="w-7 h-7 bg-slate-100 rounded text-slate-700 font-bold hover:bg-amber-100 hover:text-amber-700 flex items-center justify-center active:scale-95 transition-all text-sm"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>

                  <button
                    onClick={() => {
                      setEditingNoteItemId(
                        editingNoteItemId === item.id ? null : item.id
                      );
                      setActiveNoteText(item.notes || '');
                    }}
                    className="ml-2 text-[10px] text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    {item.notes ? 'Edit' : '+ Note'}
                  </button>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ml-auto text-[10px] text-red-500 font-bold hover:text-red-700"
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-center">
              <ShoppingBag className="w-8 h-8 text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-600">Cart is currently empty</p>
              <p className="text-[11px] text-slate-400">Select dishes from the left to start billing</p>
            </div>
          )}
        </div>

        {/* BILL CALCULATION (High Density Style) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal</span>
            <span className="font-mono font-semibold text-slate-700">
              ₹{subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-xs text-slate-500">
            <span>Tax (GST 5%)</span>
            <span className="font-mono font-semibold text-slate-700">
              ₹{(cgstAmount + sgstAmount).toFixed(2)}
            </span>
          </div>

          {/* Discount Row */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span>Discount</span>
              <button
                onClick={() =>
                  setOrderDiscount(
                    orderDiscount,
                    discountType === 'percent' ? 'fixed' : 'percent'
                  )
                }
                className="text-[10px] font-bold px-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
              >
                {discountType === 'percent' ? '%' : '₹'}
              </button>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={orderDiscount || ''}
                onChange={(e) =>
                  setOrderDiscount(parseFloat(e.target.value) || 0, discountType)
                }
                placeholder="0"
                className="w-14 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded bg-white"
              />
              <span className="font-mono text-slate-700">
                -₹{totalDiscountAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {roundOffAmount !== 0 && (
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Round off</span>
              <span className="font-mono">
                {roundOffAmount > 0
                  ? `+₹${roundOffAmount.toFixed(2)}`
                  : `-₹${Math.abs(roundOffAmount).toFixed(2)}`}
              </span>
            </div>
          )}

          <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200 mt-2">
            <span>TOTAL</span>
            <span className="text-amber-600 font-mono font-black">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* ACTION BUTTONS (High Density Style) */}
        <div className="p-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleSendKOT}
            disabled={cartItems.length === 0}
            className="col-span-2 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
          >
            Send KOT (F8)
          </button>

          <button
            onClick={handleHoldOrder}
            disabled={cartItems.length === 0}
            className="py-2.5 bg-white border border-slate-300 text-slate-600 font-bold uppercase text-[10px] rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Hold Order (F6)
          </button>

          <button
            onClick={clearCart}
            disabled={cartItems.length === 0}
            className="py-2.5 bg-red-50 text-red-600 font-bold uppercase text-[10px] rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50"
          >
            Clear
          </button>

          <button
            onClick={() => {
              if (cartItems.length === 0) {
                showNotification('Cart is empty. Please add items before generating a bill.', 'error');
                return;
              }
              setIsPaymentModalOpen(true);
            }}
            disabled={cartItems.length === 0}
            className="col-span-2 py-3.5 bg-amber-600 text-white font-black uppercase text-sm tracking-widest rounded-lg shadow-xl shadow-amber-600/20 hover:bg-amber-700 active:scale-95 transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Bill (F9)
          </button>
        </div>
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={(cust) => setSelectedCustomer(cust)}
      />

      {/* Payment & Settlement Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          showNotification('Bill finalized successfully!', 'success');
        }}
      />
    </div>
  );
};

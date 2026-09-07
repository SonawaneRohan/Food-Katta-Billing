import React, { useState } from 'react';
import {
  MenuSquare,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  FolderPlus,
  Lock,
  Tag,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Product, Category, KitchenStation } from '../../types/index.ts';

export const MenuManagementView: React.FC = () => {
  const {
    categories,
    products,
    saveProduct,
    deleteProduct,
    toggleProductAvailability,
    saveCategory,
  } = useRestaurant();
  const { hasPermission, currentStaff } = useAuth();

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CATEGORIES'>('PRODUCTS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const canEditPrices = hasPermission('MENU_EDIT_PRICES');
  const canCreateProduct = hasPermission('MENU_CREATE_PRODUCT');
  const canDeleteProduct = hasPermission('MENU_DELETE_PRODUCT');

  // Filter products
  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = safeProducts.filter((p) => {
    if (!p) return false;
    const matchesCategory =
      selectedCategoryFilter === 'ALL' ||
      (p.categoryName && p.categoryName.toUpperCase() === selectedCategoryFilter.toUpperCase()) ||
      p.categoryId === selectedCategoryFilter;

    const matchesSearch =
      searchQuery === '' ||
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct({ ...product });
    } else {
      setEditingProduct({
        name: '',
        categoryId: categories[0]?.id || '',
        categoryName: categories[0]?.name || '',
        sellingPrice: 100,
        taxRate: 5,
        sku: `SKU-${Date.now().toString().slice(-4)}`,
        isAvailable: true,
        kitchenStation: 'MAIN KITCHEN',
        description: '',
      });
    }
    setFormError('');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      setIsSaving(true);
      setFormError('');

      // Find category name
      const categoryObj = categories.find((c) => c.id === editingProduct.categoryId);
      const productPayload = {
        ...editingProduct,
        categoryName: categoryObj ? categoryObj.name : editingProduct.categoryName,
      };

      await saveProduct(productPayload);
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      setIsSaving(true);
      setFormError('');
      await saveCategory(editingCategory);
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-100">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Bar */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <MenuSquare className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Menu & Pricing Management</h2>
              <p className="text-xs text-neutral-500">
                Organize menu items, pricing, kitchen station routing & categories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('PRODUCTS')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  activeTab === 'PRODUCTS'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Dishes & Products ({products.length})
              </button>
              <button
                onClick={() => setActiveTab('CATEGORIES')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  activeTab === 'CATEGORIES'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Categories ({categories.length})
              </button>
            </div>

            {/* Action Buttons */}
            {activeTab === 'PRODUCTS' && canCreateProduct && (
              <button
                onClick={() => handleOpenProductModal()}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add New Item</span>
              </button>
            )}

            {activeTab === 'CATEGORIES' && canCreateProduct && (
              <button
                onClick={() => {
                  setEditingCategory({
                    name: '',
                    displayOrder: categories.length + 1,
                    isActive: true,
                  });
                  setFormError('');
                  setIsCategoryModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Add Category</span>
              </button>
            )}
          </div>
        </div>

        {/* RBAC Notice if cashier */}
        {!canEditPrices && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Read-only mode:</strong> Cashiers cannot edit menu prices or archive items. Switch to Manager or Owner to make adjustments.
            </span>
          </div>
        )}

        {/* PRODUCTS VIEW */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-4">
            {/* Filter and Search */}
            <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search item by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  ALL
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryFilter(c.name)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedCategoryFilter === c.name
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 uppercase font-bold border-b border-neutral-200">
                    <tr>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Station</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Tax (GST)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-900">{product.name}</div>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {product.sku}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-700">
                          {product.categoryName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-neutral-100 border border-neutral-200 text-neutral-700">
                            {product.kitchenStation}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-sm text-neutral-900">
                          ₹{product.sellingPrice.toFixed(0)}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">
                          {product.taxRate || 5}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              toggleProductAvailability(product.id, !product.isAvailable)
                            }
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                              product.isAvailable
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {product.isAvailable ? 'AVAILABLE' : 'SOLD OUT'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canEditPrices && (
                              <button
                                onClick={() => handleOpenProductModal(product)}
                                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                                title="Edit Product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteProduct && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete ${product.name}?`)) {
                                    deleteProduct(product.id);
                                  }
                                }}
                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES VIEW */}
        {activeTab === 'CATEGORIES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-neutral-900">{cat.name}</h4>
                  <p className="text-xs text-neutral-500">Display Order: #{cat.displayOrder}</p>
                </div>
                {canEditPrices && (
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setIsCategoryModalOpen(true);
                    }}
                    className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Product Add / Edit Modal */}
        {isProductModalOpen && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto border border-neutral-200">
              <h3 className="font-bold text-base text-neutral-900 mb-4">
                {editingProduct.id ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg mb-3">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paneer Momos"
                    value={editingProduct.name || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={editingProduct.categoryId || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, categoryId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Kitchen Station
                    </label>
                    <select
                      value={editingProduct.kitchenStation || 'MAIN KITCHEN'}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          kitchenStation: e.target.value as KitchenStation,
                        })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    >
                      <option value="MAIN KITCHEN">MAIN KITCHEN</option>
                      <option value="DRINKS">DRINKS</option>
                      <option value="HOOKAH">HOOKAH</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct.sellingPrice || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          sellingPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-bold border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      value={editingProduct.sku || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, sku: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short ingredients or flavor description..."
                    value={editingProduct.description || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-3 py-2 text-neutral-600 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Add / Edit Modal */}
        {isCategoryModalOpen && editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto border border-neutral-200">
              <h3 className="font-bold text-sm text-neutral-900 mb-3">
                {editingCategory.id ? 'Edit Category' : 'New Category'}
              </h3>

              <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DESSERTS"
                    value={editingCategory.name || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, name: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Display Order (Number)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingCategory.displayOrder || 1}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        displayOrder: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-3 py-1.5 text-neutral-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-neutral-900 text-white font-bold rounded-lg"
                  >
                    Save Category
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

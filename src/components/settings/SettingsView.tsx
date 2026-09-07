import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Building,
  Printer,
  Receipt,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext.tsx';
import { RestaurantSettings } from '../../types/index.ts';

export const SettingsView: React.FC = () => {
  const { settings, saveSettings, updateSettings, resetToDefaultSeedData } = useRestaurant();

  const [formData, setFormData] = useState<RestaurantSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Track if user has modified form values so background Firestore snapshots don't overwrite user edits
  const isDirtyRef = useRef<boolean>(false);

  useEffect(() => {
    if (settings && !isDirtyRef.current) {
      setFormData({ ...settings });
    }
  }, [settings]);

  const handleFieldChange = (field: keyof RestaurantSettings, value: any) => {
    isDirtyRef.current = true;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setSaveError('');
    setSaveSuccess(false);

    // Form validation
    if (!formData.restaurantName || !formData.restaurantName.trim()) {
      setSaveError('Restaurant Name is required.');
      return;
    }

    try {
      setIsSaving(true);
      const saveFn = saveSettings || updateSettings;
      if (!saveFn) {
        throw new Error('Settings save handler is not available.');
      }

      // Compute total tax rate if CGST and SGST are modified
      const cgst = Number(formData.cgstRate ?? 2.5);
      const sgst = Number(formData.sgstRate ?? 2.5);
      const updatedConfig: RestaurantSettings = {
        ...formData,
        restaurantName: formData.restaurantName.trim(),
        tagline: formData.tagline || '',
        address: formData.address || '',
        phone: formData.phone || '',
        email: formData.email || '',
        gstin: (formData.gstin || '').trim().toUpperCase(),
        fssai: (formData.fssai || '').trim(),
        currency: formData.currency || '₹',
        businessHours: formData.businessHours || '11:00 AM - 11:30 PM (All Days)',
        cgstRate: cgst,
        sgstRate: sgst,
        taxRate: Number((cgst + sgst).toFixed(2)),
        billPrefix: formData.billPrefix || 'FK-2026-',
        receiptFooter: formData.receiptFooter || 'Thank you for visiting Food Katta. Visit Again!',
        printerType: formData.thermalPrinterWidth === '58mm' ? 'thermal-58mm' : 'thermal-80mm',
        thermalPrinterWidth: formData.thermalPrinterWidth || '80mm',
        autoPrintKOT: Boolean(formData.autoPrintKot ?? formData.autoPrintKOT ?? true),
        autoPrintKot: Boolean(formData.autoPrintKot ?? formData.autoPrintKOT ?? true),
        updatedAt: new Date().toISOString(),
      };

      await saveFn(updatedConfig);
      isDirtyRef.current = false;
      setFormData(updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setSaveError(err?.message || 'Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    isDirtyRef.current = false;
    setFormData({ ...settings });
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleResetData = async () => {
    if (
      confirm(
        'Are you sure you want to re-seed demo data? This will ensure all Food Katta menu dishes, tables, and demo records are populated.'
      )
    ) {
      try {
        setIsResetting(true);
        await resetToDefaultSeedData();
        isDirtyRef.current = false;
        alert('Database populated with full Food Katta restaurant catalog!');
      } catch (err: any) {
        alert('Seed error: ' + err.message);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Header Toolbar */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Restaurant Settings & Config</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Configure GSTIN, FSSAI, receipt print templates & invoice sequences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-seed-catalog"
              type="button"
              onClick={handleResetData}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[11px] font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Populating...' : 'Seed Catalog'}</span>
            </button>

            <button
              id="btn-save-settings-top"
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-md text-xs shadow-xs transition-all uppercase tracking-wider disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <Save className="w-3.5 h-3.5 text-slate-950" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-2xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Restaurant configuration and billing settings saved successfully!</span>
          </div>
        )}

        {saveError && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs font-bold text-red-800 flex items-center gap-2 shadow-2xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSave} noValidate className="space-y-3">
          {/* Restaurant Profile */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building className="w-3.5 h-3.5 text-amber-600" />
              <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">Restaurant Identity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Restaurant Name *
                </label>
                <input
                  id="input-restaurant-name"
                  type="text"
                  value={formData.restaurantName || ''}
                  onChange={(e) => handleFieldChange('restaurantName', e.target.value)}
                  placeholder="Food Katta"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Tagline / Catchphrase
                </label>
                <input
                  id="input-tagline"
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => handleFieldChange('tagline', e.target.value)}
                  placeholder="Authentic Taste & Good Vibes"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Physical Address
                </label>
                <input
                  id="input-address"
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="Shop 4-6, Ground Floor, Near College Corner..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  id="input-phone"
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  id="input-email"
                  type="text"
                  inputMode="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="billing@foodkatta.in"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  GSTIN Number (Tax ID)
                </label>
                <input
                  id="input-gstin"
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => handleFieldChange('gstin', e.target.value.toUpperCase())}
                  placeholder="27AABCF1234F1Z5"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  FSSAI License No.
                </label>
                <input
                  id="input-fssai"
                  type="text"
                  value={formData.fssai || ''}
                  onChange={(e) => handleFieldChange('fssai', e.target.value)}
                  placeholder="11521034000123"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Currency Symbol
                </label>
                <input
                  id="input-currency"
                  type="text"
                  value={formData.currency || '₹'}
                  onChange={(e) => handleFieldChange('currency', e.target.value)}
                  placeholder="₹"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Business Hours
                </label>
                <input
                  id="input-business-hours"
                  type="text"
                  value={formData.businessHours || ''}
                  onChange={(e) => handleFieldChange('businessHours', e.target.value)}
                  placeholder="11:00 AM - 11:30 PM (All Days)"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Tax & Invoice Rules */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">Taxation & Bill Format</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  CGST Rate (%)
                </label>
                <input
                  id="input-cgst"
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={formData.cgstRate ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    handleFieldChange('cgstRate', val);
                  }}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  SGST Rate (%)
                </label>
                <input
                  id="input-sgst"
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={formData.sgstRate ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    handleFieldChange('sgstRate', val);
                  }}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Invoice Sequence Prefix
                </label>
                <input
                  id="input-bill-prefix"
                  type="text"
                  value={formData.billPrefix || ''}
                  onChange={(e) => handleFieldChange('billPrefix', e.target.value)}
                  placeholder="FK-2026-"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                Receipt Footer Message
              </label>
              <input
                id="input-receipt-footer"
                type="text"
                value={formData.receiptFooter || ''}
                onChange={(e) => handleFieldChange('receiptFooter', e.target.value)}
                placeholder="Thank you for visiting Food Katta. Visit Again!"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Thermal Printer Settings */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">Thermal Printer Config</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Receipt Paper Width
                </label>
                <select
                  id="select-printer-width"
                  value={formData.thermalPrinterWidth || '80mm'}
                  onChange={(e) => {
                    const width = e.target.value as '80mm' | '58mm';
                    handleFieldChange('thermalPrinterWidth', width);
                    handleFieldChange('printerType', width === '58mm' ? 'thermal-58mm' : 'thermal-80mm');
                  }}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="80mm">Standard 80mm (3 Inch)</option>
                  <option value="58mm">Compact 58mm (2 Inch)</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-3">
                <input
                  type="checkbox"
                  id="autoPrintKot"
                  checked={Boolean(formData.autoPrintKot ?? formData.autoPrintKOT)}
                  onChange={(e) => {
                    handleFieldChange('autoPrintKot', e.target.checked);
                    handleFieldChange('autoPrintKOT', e.target.checked);
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="autoPrintKot" className="font-bold text-slate-700 cursor-pointer text-xs select-none">
                  Auto-trigger print dialog on sending KOT
                </label>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Configuration saved successfully!
                </span>
              )}
              {saveError && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-300 px-3 py-1.5 rounded-md">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  {saveError}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-discard-settings"
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Saved</span>
              </button>

              <button
                id="btn-save-settings"
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-md text-xs font-black shadow-xs transition-all uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-slate-950" />
                )}
                <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};


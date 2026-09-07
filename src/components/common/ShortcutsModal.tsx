import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F2', label: 'Search Item / Focus Search Bar', scope: 'POS Billing' },
    { key: 'F4', label: 'Select or Add Customer', scope: 'POS Billing' },
    { key: 'F6', label: 'Hold Current Order', scope: 'POS Billing' },
    { key: 'F8', label: 'Send Kitchen Order Ticket (KOT)', scope: 'POS Billing' },
    { key: 'F9', label: 'Proceed to Payment & Bill', scope: 'POS Billing' },
    { key: 'ESC', label: 'Close Active Modal / Cancel', scope: 'Global' },
    { key: 'Alt + T', label: 'Switch to Tables View', scope: 'Navigation' },
    { key: 'Alt + K', label: 'Switch to Kitchen Display (KDS)', scope: 'Navigation' },
    { key: 'Alt + B', label: 'Switch to Bills History', scope: 'Navigation' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in zoom-in duration-150">
        <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-neutral-600 mb-4">
            Use these keyboard shortcuts on your Windows desktop or laptop to speed up billing and order processing.
          </p>

          <div className="space-y-2">
            {shortcuts.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors border border-neutral-200/60"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-neutral-800 text-sm">{item.label}</span>
                  <span className="text-xs text-neutral-600">{item.scope}</span>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-mono font-semibold text-neutral-800 bg-white border border-neutral-300 rounded shadow-xs">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Got it (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};

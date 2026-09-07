import { doc, getDoc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase.ts';
import { Category, Product, RestaurantTable, RestaurantSettings, StaffMember } from '../types/index.ts';

export const INITIAL_SETTINGS: RestaurantSettings = {
  restaurantName: 'Food Katta',
  tagline: 'Authentic Taste & Good Vibes',
  address: 'Shop 4-6, Ground Floor, Near College Corner, Sangli, Maharashtra 416416',
  phone: '+91 98765 43210',
  email: 'billing@foodkatta.in',
  gstin: '27AABCF1234F1Z5',
  fssai: '11521034000123',
  currency: '₹',
  taxRate: 5.0,
  cgstRate: 2.5,
  sgstRate: 2.5,
  billPrefix: 'FK-2026-',
  billNextSequence: 1,
  defaultDiscountPercent: 0,
  receiptFooter: 'Thank you for visiting Food Katta. Visit Again!',
  whatsappEnabled: false,
  whatsappPhoneNumberId: '',
  businessHours: '11:00 AM - 11:30 PM (All Days)',
  printerType: 'thermal-80mm',
  autoPrintKOT: true,
  updatedAt: new Date().toISOString(),
};

export const INITIAL_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'MOMOS', displayOrder: 1, isActive: true },
  { name: 'VEG THALI', displayOrder: 2, isActive: true },
  { name: 'NON-VEG THALI', displayOrder: 3, isActive: true },
  { name: 'MAIN COURSE', displayOrder: 4, isActive: true },
  { name: 'VEG MAIN COURSE', displayOrder: 5, isActive: true },
  { name: 'NON-VEG MAIN COURSE', displayOrder: 6, isActive: true },
  { name: 'DRINKS', displayOrder: 7, isActive: true },
  { name: 'SHAKES', displayOrder: 8, isActive: true },
  { name: 'HOOKAH', displayOrder: 9, isActive: true },
  { name: 'ADD-ONS', displayOrder: 10, isActive: true },
];

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  // MOMOS
  {
    name: 'Paneer Momos',
    categoryId: 'cat_momos',
    categoryName: 'MOMOS',
    sellingPrice: 90,
    taxRate: 5,
    sku: 'MOM-01',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Steamed delicate dumplings stuffed with spiced cottage cheese and herbs, served with spicy red chutney.',
  },
  {
    name: 'Veg Steamed Momos',
    categoryId: 'cat_momos',
    categoryName: 'MOMOS',
    sellingPrice: 70,
    taxRate: 5,
    sku: 'MOM-02',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Finely minced garden vegetables encased in thin wrapper, served hot with garlic mayonnaise.',
  },
  {
    name: 'Crispy Fried Chicken Momos',
    categoryId: 'cat_momos',
    categoryName: 'MOMOS',
    sellingPrice: 110,
    taxRate: 5,
    sku: 'MOM-03',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Golden fried chicken dumplings with house special dip and mayonnaise.',
  },

  // VEG THALI
  {
    name: 'Veg Thali',
    categoryId: 'cat_veg_thali',
    categoryName: 'VEG THALI',
    sellingPrice: 140,
    taxRate: 5,
    sku: 'THL-01',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Complete wholesome meal: 2 Veg Sabzi, Dal Tadka, Jeera Rice, 3 Butter Roti, Papad, Salad & Sweet.',
  },
  {
    name: 'Special Paneer Thali',
    categoryId: 'cat_veg_thali',
    categoryName: 'VEG THALI',
    sellingPrice: 180,
    taxRate: 5,
    sku: 'THL-02',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Paneer Butter Masala, Veg Kolhapuri, Dal Fry, Jeera Rice, 3 Butter Chapati, Gulab Jamun & Curd.',
  },

  // NON-VEG THALI
  {
    name: 'Chicken Thali',
    categoryId: 'cat_non_veg_thali',
    categoryName: 'NON-VEG THALI',
    sellingPrice: 190,
    taxRate: 5,
    sku: 'THL-03',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Sukka Chicken, Rassa Curry, Tambda Rassa, Indrayani Rice, 3 Bhakri/Roti, Kanda-Limbu.',
  },
  {
    name: 'Special Mutton Thali',
    categoryId: 'cat_non_veg_thali',
    categoryName: 'NON-VEG THALI',
    sellingPrice: 280,
    taxRate: 5,
    sku: 'THL-04',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Tender mutton cooked in authentic Kolhapuri spices with Pandhra and Tambda Rassa, Bhakri & Biryani Rice.',
  },

  // MAIN COURSE / VEG MAIN COURSE
  {
    name: 'Paneer Butter Masala',
    categoryId: 'cat_veg_main',
    categoryName: 'VEG MAIN COURSE',
    sellingPrice: 170,
    taxRate: 5,
    sku: 'CUR-01',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Rich and creamy tomato-cashew gravy with melt-in-mouth cottage cheese cubes.',
  },
  {
    name: 'Dal Tadka Double Fry',
    categoryId: 'cat_veg_main',
    categoryName: 'VEG MAIN COURSE',
    sellingPrice: 120,
    taxRate: 5,
    sku: 'CUR-02',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Yellow lentils tempered with aromatic cumin, garlic, dry red chillies and pure ghee.',
  },
  {
    name: 'Veg Kolhapuri Spicy',
    categoryId: 'cat_veg_main',
    categoryName: 'VEG MAIN COURSE',
    sellingPrice: 150,
    taxRate: 5,
    sku: 'CUR-03',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Fiery mixed vegetables simmered in freshly ground Kolhapuri masala.',
  },

  // NON-VEG MAIN COURSE
  {
    name: 'Butter Chicken Handi',
    categoryId: 'cat_non_veg_main',
    categoryName: 'NON-VEG MAIN COURSE',
    sellingPrice: 240,
    taxRate: 5,
    sku: 'NVM-01',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Tandoori chicken pieces simmered in silky smooth butter and tomato sauce.',
  },
  {
    name: 'Chicken Kolhapuri Rassa',
    categoryId: 'cat_non_veg_main',
    categoryName: 'NON-VEG MAIN COURSE',
    sellingPrice: 210,
    taxRate: 5,
    sku: 'NVM-02',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Fiery and flavorful authentic Maharashtrian chicken curry with traditional spices.',
  },

  // SHAKES
  {
    name: 'Mango Shake',
    categoryId: 'cat_shakes',
    categoryName: 'SHAKES',
    sellingPrice: 70,
    taxRate: 5,
    sku: 'SHK-01',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Thick creamy Alphonso mango pulp blended with rich chilled milk and ice cream scoop.',
  },
  {
    name: 'Strawberry Shake',
    categoryId: 'cat_shakes',
    categoryName: 'SHAKES',
    sellingPrice: 70,
    taxRate: 5,
    sku: 'SHK-02',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Sweet fresh strawberry crush churned with cold milk and vanilla cream.',
  },
  {
    name: 'Pineapple Shake',
    categoryId: 'cat_shakes',
    categoryName: 'SHAKES',
    sellingPrice: 70,
    taxRate: 5,
    sku: 'SHK-03',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Zesty tropical pineapple shake with whipped froth and cherry topping.',
  },
  {
    name: 'Black Current Shake',
    categoryId: 'cat_shakes',
    categoryName: 'SHAKES',
    sellingPrice: 70,
    taxRate: 5,
    sku: 'SHK-04',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Rich purple berry indulgence blended smooth and frosty.',
  },
  {
    name: 'Oreo Shake',
    categoryId: 'cat_shakes',
    categoryName: 'SHAKES',
    sellingPrice: 80,
    taxRate: 5,
    sku: 'SHK-05',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Crunchy crushed Oreo cookies whipped into chocolate fudge and chilled milk.',
  },
  {
    name: 'KitKat Shake',
    categoryId: 'cat_shakes',
    categoryName: 'SHAKES',
    sellingPrice: 80,
    taxRate: 5,
    sku: 'SHK-06',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Crispy KitKat wafer bars blended with dairy cream and drizzled chocolate syrup.',
  },
  {
    name: 'Anjeer Shake',
    categoryId: 'cat_shakes',
    categoryName: 'SHAKES',
    sellingPrice: 80,
    taxRate: 5,
    sku: 'SHK-07',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Premium organic dried figs soaked and whipped into healthy nourishing thick shake.',
  },

  // DRINKS
  {
    name: 'Cold Coffee with Ice Cream',
    categoryId: 'cat_drinks',
    categoryName: 'DRINKS',
    sellingPrice: 60,
    taxRate: 5,
    sku: 'DRK-01',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Velvety espresso blended with ice cream and cocoa drizzle.',
  },
  {
    name: 'Fresh Mint Lime Soda',
    categoryId: 'cat_drinks',
    categoryName: 'DRINKS',
    sellingPrice: 40,
    taxRate: 5,
    sku: 'DRK-02',
    isAvailable: true,
    kitchenStation: 'DRINKS',
    description: 'Sweet and salted chilled carbonated lime soda with fresh garden mint leaves.',
  },

  // HOOKAH
  {
    name: 'Mint Blast Hookah',
    categoryId: 'cat_hookah',
    categoryName: 'HOOKAH',
    sellingPrice: 450,
    taxRate: 5,
    sku: 'HKH-01',
    isAvailable: true,
    kitchenStation: 'HOOKAH',
    description: 'Super cool herbal mint shisha cloud with ice chill base.',
  },
  {
    name: 'Brain Freezer Special Hookah',
    categoryId: 'cat_hookah',
    categoryName: 'HOOKAH',
    sellingPrice: 500,
    taxRate: 5,
    sku: 'HKH-02',
    isAvailable: true,
    kitchenStation: 'HOOKAH',
    description: 'House signature blend of watermelon, kiwi chill, and intense spearmint.',
  },
  {
    name: 'Paan Rasna Hookah',
    categoryId: 'cat_hookah',
    categoryName: 'HOOKAH',
    sellingPrice: 480,
    taxRate: 5,
    sku: 'HKH-03',
    isAvailable: true,
    kitchenStation: 'HOOKAH',
    description: 'Royal sweet Meetha Paan aroma with cooling berry twist.',
  },

  // ADD-ONS
  {
    name: 'Extra Butter Roti',
    categoryId: 'cat_addons',
    categoryName: 'ADD-ONS',
    sellingPrice: 15,
    taxRate: 5,
    sku: 'ADD-01',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Whole wheat tandoori roti brushed with golden butter.',
  },
  {
    name: 'Extra Jowar Bhakri',
    categoryId: 'cat_addons',
    categoryName: 'ADD-ONS',
    sellingPrice: 20,
    taxRate: 5,
    sku: 'ADD-02',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'Traditional hot soft sorghum flatbread.',
  },
  {
    name: 'Extra Spicy Schezwan Chutney',
    categoryId: 'cat_addons',
    categoryName: 'ADD-ONS',
    sellingPrice: 10,
    taxRate: 5,
    sku: 'ADD-03',
    isAvailable: true,
    kitchenStation: 'MAIN KITCHEN',
    description: 'In-house slow-cooked chili garlic paste dip.',
  },
  {
    name: 'Extra Coal Change (Hookah)',
    categoryId: 'cat_addons',
    categoryName: 'ADD-ONS',
    sellingPrice: 50,
    taxRate: 5,
    sku: 'ADD-04',
    isAvailable: true,
    kitchenStation: 'HOOKAH',
    description: 'Fresh coconut shell natural charcoal cubes.',
  },
];

export const INITIAL_TABLES: Omit<RestaurantTable, 'id'>[] = [
  { tableNumber: 'T1', section: 'Main Dining', capacity: 4, status: 'AVAILABLE' },
  { tableNumber: 'T2', section: 'Main Dining', capacity: 4, status: 'AVAILABLE' },
  { tableNumber: 'T3', section: 'Main Dining', capacity: 6, status: 'AVAILABLE' },
  { tableNumber: 'T4', section: 'Main Dining', capacity: 2, status: 'AVAILABLE' },
  { tableNumber: 'T5', section: 'AC Lounge', capacity: 4, status: 'AVAILABLE' },
  { tableNumber: 'T6', section: 'AC Lounge', capacity: 6, status: 'AVAILABLE' },
  { tableNumber: 'T7', section: 'AC Lounge', capacity: 8, status: 'AVAILABLE' },
  { tableNumber: 'T8', section: 'Rooftop Lounge', capacity: 4, status: 'AVAILABLE' },
  { tableNumber: 'T9', section: 'Rooftop Lounge', capacity: 6, status: 'AVAILABLE' },
  { tableNumber: 'T10', section: 'Rooftop Lounge', capacity: 8, status: 'AVAILABLE' },
  { tableNumber: 'T11', section: 'Garden Patio', capacity: 4, status: 'AVAILABLE' },
  { tableNumber: 'T12', section: 'Garden Patio', capacity: 4, status: 'AVAILABLE' },
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff_owner',
    name: 'Rohan Sonawane (Owner)',
    email: 'sonawanerohan1109@gmail.com',
    phone: '+91 98765 43210',
    role: 'OWNER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff_manager',
    name: 'Amit Patil (Manager)',
    email: 'manager@foodkatta.in',
    phone: '+91 98220 11223',
    role: 'MANAGER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff_cashier',
    name: 'Ketan Shinde (Cashier)',
    email: 'cashier@foodkatta.in',
    phone: '+91 99770 44556',
    role: 'CASHIER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff_kitchen',
    name: 'Chef Suresh (Kitchen Lead)',
    email: 'kitchen@foodkatta.in',
    phone: '+91 98900 88990',
    role: 'KITCHEN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

export async function populateDefaultCatalog(force = false): Promise<void> {
  try {
    const settingsDocRef = doc(db, 'restaurant_settings', 'config');

    if (!force) {
      const settingsDoc = await getDoc(settingsDocRef);
      if (settingsDoc.exists()) {
        return; // Already initialized
      }
    }

    console.log(`Seeding Food Katta database data (force=${force})...`);

    // 1. Settings
    await setDoc(settingsDocRef, INITIAL_SETTINGS, { merge: true });

    // 2. Categories
    const batch = writeBatch(db);
    const catMap: Record<string, string> = {
      MOMOS: 'cat_momos',
      'VEG THALI': 'cat_veg_thali',
      'NON-VEG THALI': 'cat_non_veg_thali',
      'MAIN COURSE': 'cat_main',
      'VEG MAIN COURSE': 'cat_veg_main',
      'NON-VEG MAIN COURSE': 'cat_non_veg_main',
      DRINKS: 'cat_drinks',
      SHAKES: 'cat_shakes',
      HOOKAH: 'cat_hookah',
      'ADD-ONS': 'cat_addons',
    };

    for (const cat of INITIAL_CATEGORIES) {
      const docId = catMap[cat.name] || `cat_${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      batch.set(doc(db, 'categories', docId), {
        name: cat.name,
        displayOrder: cat.displayOrder,
        isActive: cat.isActive,
        createdAt: new Date().toISOString(),
      }, { merge: true });
    }

    // 3. Products
    for (let i = 0; i < INITIAL_PRODUCTS.length; i++) {
      const prod = INITIAL_PRODUCTS[i];
      const prodId = `prod_${i + 1}_${prod.sku.toLowerCase()}`;
      batch.set(doc(db, 'products', prodId), {
        ...prod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    // 4. Tables
    for (let i = 0; i < INITIAL_TABLES.length; i++) {
      const tbl = INITIAL_TABLES[i];
      const tblId = `tbl_${tbl.tableNumber.toLowerCase()}`;
      batch.set(doc(db, 'restaurant_tables', tblId), {
        ...tbl,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    // 5. Staff
    for (const member of INITIAL_STAFF) {
      batch.set(doc(db, 'staff', member.id), member, { merge: true });
    }

    await batch.commit();
    console.log('Food Katta initialization complete!');
  } catch (error) {
    console.error('Failed to seed initial data:', error);
    throw error;
  }
}

export async function seedInitialDataIfNeeded(): Promise<void> {
  return populateDefaultCatalog(false);
}

export async function resetToDefaultSeedData(): Promise<void> {
  return populateDefaultCatalog(true);
}

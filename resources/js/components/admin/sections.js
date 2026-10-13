import { BarChart3, Boxes, ClipboardList, FolderTree, Settings } from 'lucide-react';
import DashboardSection from './DashboardSection.jsx';
import OrdersSection from './OrdersSection.jsx';
import ProductsSection from './ProductsSection.jsx';
import CategoriesSection from './CategoriesSection.jsx';
import SettingsSection from './SettingsSection.jsx';

export const ADMIN_SECTIONS = [
    { id: 'dashboard', icon: BarChart3, label: 'admin.dashboard', Component: DashboardSection },
    { id: 'orders', icon: ClipboardList, label: 'admin.orders', Component: OrdersSection },
    { id: 'products', icon: Boxes, label: 'admin.products', Component: ProductsSection },
    { id: 'categories', icon: FolderTree, label: 'admin.categories', Component: CategoriesSection },
    { id: 'settings', icon: Settings, label: 'admin.settings', Component: SettingsSection },
];

export function findAdminSection(id) {
    return ADMIN_SECTIONS.find((item) => item.id === id) || null;
}

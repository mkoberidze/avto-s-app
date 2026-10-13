export const ORDER_STATUSES = ['new', 'under_review', 'in_progress', 'completed'];

export function statusClass(status) {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
    if (status === 'in_progress') return 'bg-violet-50 text-violet-700';
    if (status === 'under_review') return 'bg-amber-50 text-amber-700';
    return 'bg-blue-50 text-blue-700';
}

export function formatAdminDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

export function formatDay(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
}

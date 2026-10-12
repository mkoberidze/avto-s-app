export function safeInternalPath(value, fallback = '/') {
    if (typeof value !== 'string') {
        return fallback;
    }
    const path = value.trim();
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
        return fallback;
    }
    if (path.includes('\\') || path.includes('://')) {
        return fallback;
    }
    return path;
}

export function loginRedirect(currentPath) {
    const path = safeInternalPath(currentPath, '/');
    return `/login?redirect=${encodeURIComponent(path)}`;
}

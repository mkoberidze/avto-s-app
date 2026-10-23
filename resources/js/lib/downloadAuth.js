export async function downloadAuthorized(url, fallbackName = 'attachment') {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        throw new Error('download_failed');
    }
    const blob = await res.blob();
    const header = res.headers.get('Content-Disposition') || '';
    const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
    const quoted = /filename="?([^"]+)"?/i.exec(header);
    let name = fallbackName;
    if (star) {
        name = decodeURIComponent(star[1]);
    } else if (quoted) {
        name = quoted[1];
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
}

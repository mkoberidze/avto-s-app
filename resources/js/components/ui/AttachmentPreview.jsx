import React from 'react';

export default function AttachmentPreview({ url, size = 'md', className = '' }) {
    if (!url) return null;
    const isImage = /\.(png|jpe?g|webp)$/i.test(url);
    const sizes = {
        sm: { img: 'h-24 w-36', box: 'h-12 w-32' },
        md: { img: 'h-40 w-64', box: 'h-16 w-48' },
        lg: { img: 'h-56 w-96', box: 'h-20 w-64' },
    }[size] || { img: 'h-40 w-64', box: 'h-16 w-48' };

    return (
        <a href={url} target="_blank" rel="noreferrer" title="Open" className={className}>
            {isImage ? (
                <div className="group relative inline-block rounded-md overflow-hidden border border-black/10">
                    <img src={url} alt="Attachment" className={`${sizes.img} object-cover`} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">Open</div>
                </div>
            ) : (
                <div className={`group inline-flex ${sizes.box} items-center justify-center rounded-md border border-black/10 bg-gray-50 relative overflow-hidden`}>
                    <span className="text-xs text-[#111827]">Open file</span>
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition" />
                </div>
            )}
        </a>
    );
}



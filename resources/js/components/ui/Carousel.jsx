import React, { useEffect, useMemo, useState } from 'react';

export default function Carousel({ slides = [], autoPlay = true, intervalMs = 4500, className = '', heightClass = 'h-56 sm:h-72 lg:h-[22rem] xl:h-[26rem] max-h-[70vh]', onSlideClick = null }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const safeSlides = useMemo(() => Array.isArray(slides) ? slides.filter(Boolean) : [], [slides]);
    const numSlides = safeSlides.length;

    useEffect(() => {
        if (!autoPlay || numSlides <= 1) return;
        const id = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % numSlides);
        }, intervalMs);
        return () => clearInterval(id);
    }, [autoPlay, intervalMs, numSlides]);

    function goTo(index) {
        if (numSlides === 0) return;
        const next = (index + numSlides) % numSlides;
        setCurrentIndex(next);
    }

    if (numSlides === 0) {
        return <div className="w-full aspect-[2/1] rounded-xl bg-[#F3F4F6] border border-black/10" />;
    }

    return (
        <div className={`relative w-full overflow-hidden rounded-xl border border-black/10 bg-gray-100 ${heightClass} ${className}`}>
            <div
                className="flex h-full transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {safeSlides.map((slide, idx) => {
                    const imageUrl = slide.imageUrl || '';
                    const isSvg = typeof imageUrl === 'string' && imageUrl.toLowerCase().endsWith('.svg');
                    const clickable = typeof onSlideClick === 'function';
                    function handleClick() {
                        if (clickable) {
                            onSlideClick(slide, idx);
                        }
                    }
                    return (
                        <div key={idx} className={`relative w-full h-full shrink-0 grow-0 basis-full ${clickable ? 'cursor-pointer' : ''}`} onClick={handleClick} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined} onKeyDown={clickable ? (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); handleClick(); } } : undefined}>
                            <img
                                src={imageUrl}
                                alt={slide.title || `Slide ${idx + 1}`}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                            {(slide.title || slide.subtitle) && (
                                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                                    {slide.title ? (
                                        <h3 className="text-white text-lg sm:text-2xl font-semibold drop-shadow">{slide.title}</h3>
                                    ) : null}
                                    {slide.subtitle ? (
                                        <p className="mt-1 text-white/90 text-sm sm:text-base max-w-2xl drop-shadow">{slide.subtitle}</p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {numSlides > 1 && (
                <>
                    <button
                        type="button"
                        aria-label="Previous slide"
                        className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#111827] shadow hover:bg-white"
                        onClick={() => goTo(currentIndex - 1)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M15.53 3.97a.75.75 0 0 1 0 1.06L9.56 11l5.97 5.97a.75.75 0 1 1-1.06 1.06l-6.5-6.5a.75.75 0 0 1 0-1.06l6.5-6.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Next slide"
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#111827] shadow hover:bg-white"
                        onClick={() => goTo(currentIndex + 1)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M8.47 20.03a.75.75 0 0 1 0-1.06L14.44 13 8.47 7.03a.75.75 0 1 1 1.06-1.06l6.5 6.5a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                        {safeSlides.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Go to slide ${i + 1}`}
                                className={`h-2 w-2 rounded-full transition ${i === currentIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`}
                                onClick={() => goTo(i)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}



'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProductGallery({
  images,
  title,
}: {
  images: Array<{ id: string; url: string; isPrimary: boolean; altText?: string | null }>;
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const current = images[activeIndex] || images[0];
  if (!current) return null;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, [zoomed]);

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div
        className="relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-3xl bg-ink-100"
        onClick={() => setZoomed(!zoomed)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setZoomed(false)}
        role="button"
        tabIndex={0}
        aria-label="Zoom image"
      >
        <img
          src={current.url}
          alt={current.altText || title}
          className={cn(
            'h-full w-full object-cover transition-transform duration-200',
            zoomed && 'scale-150',
          )}
          style={
            zoomed
              ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
              : undefined
          }
        />
        {!zoomed && (
          <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink-600 backdrop-blur">
            <ZoomIn className="h-4 w-4" />
          </span>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => Math.max(0, i - 1)); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-ink-700 opacity-0 shadow-soft backdrop-blur transition hover:bg-white hover:text-ink-900 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => Math.min(images.length - 1, i + 1)); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-ink-700 opacity-0 shadow-soft backdrop-blur transition hover:bg-white hover:text-ink-900 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 6).map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition',
                i === activeIndex ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100',
              )}
              aria-label={`View image ${i + 1}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
            aria-label="Close zoom"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={current.url}
            alt={title}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
          {images.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {images.slice(0, 6).map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                  className={`h-12 w-12 overflow-hidden rounded-lg border-2 ${
                    i === activeIndex ? 'border-white' : 'border-white/30'
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

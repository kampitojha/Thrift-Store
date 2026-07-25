import { useState, useRef, useCallback } from 'react';
import { ImagePlus, X, GripVertical, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from './progress';

export type UploadImage = {
  id: string;
  file?: File;
  url: string;
  isPrimary: boolean;
  uploading?: boolean;
  progress?: number;
  error?: string;
};

export function UploadArea({
  images,
  onChange,
  maxFiles = 12,
  disabled,
}: {
  images: UploadImage[];
  onChange: (images: UploadImage[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const updateImages = useCallback(
    (updater: (prev: UploadImage[]) => UploadImage[]) => {
      const next = updater(imagesRef.current);
      imagesRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).slice(0, maxFiles - images.length);
      if (arr.length === 0) return;

      const newImages: UploadImage[] = arr.map((f) => ({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        url: URL.createObjectURL(f),
        isPrimary: images.length === 0,
        uploading: true,
        progress: 0,
      }));

      updateImages((prev) => [...prev, ...newImages]);
      setUploading(true);

      for (const img of newImages) {
        try {
          const formData = new FormData();
          formData.append('file', img.file!);

          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              updateImages((prev) =>
                prev.map((i) => (i.id === img.id ? { ...i, progress: pct } : i)),
              );
            }
          });

          const url = await new Promise<string>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const res = JSON.parse(xhr.responseText);
                resolve(res.data?.url || res.url);
              } else {
                reject(new Error('Upload failed'));
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.open('POST', '/api/v1/uploads/file');
            const token = localStorage.getItem('reloom_access_token');
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
          });

          updateImages((prev) =>
            prev.map((i) =>
              i.id === img.id ? { ...i, url, file: undefined, uploading: false, progress: 100 } : i,
            ),
          );
        } catch {
          updateImages((prev) =>
            prev.map((i) =>
              i.id === img.id ? { ...i, error: 'Upload failed', uploading: false, progress: 0 } : i,
            ),
          );
        }
      }
      setUploading(false);
    },
    [images.length, maxFiles, updateImages],
  );

  const removeImage = (id: string) => {
    updateImages((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length > 0 && !next.some((i) => i.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const setCover = (id: string) => {
    updateImages((prev) =>
      prev.map((i) => ({ ...i, isPrimary: i.id === id })),
    );
  };

  const moveImage = (id: string, direction: -1 | 1) => {
    updateImages((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition',
          dragOver
            ? 'border-brand-400 bg-brand-50'
            : 'border-ink-200 bg-ink-50/50 hover:border-ink-300 hover:bg-ink-50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <ImagePlus className={cn('h-8 w-8', dragOver ? 'text-brand-600' : 'text-ink-400')} />
        <p className="mt-2 text-sm font-medium text-ink-700">
          {dragOver ? 'Drop images here' : 'Drag & drop images here'}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          or click to browse · up to {maxFiles} images · 10 MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {uploading && (
        <p className="text-xs text-ink-500">
          <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" />
          Uploading images...
        </p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {images.map((img) => (
            <div
              key={img.id}
              className={cn(
                'group relative aspect-[4/5] overflow-hidden rounded-xl border bg-ink-100',
                img.isPrimary && 'ring-2 ring-brand-600',
                img.error && 'ring-2 ring-red-400',
              )}
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
              />

              {img.uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                  {img.progress != null && (
                    <span className="mt-1 text-xs text-white">{img.progress}%</span>
                  )}
                </div>
              )}

              {img.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                  <div className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white">
                    <AlertCircle className="h-3 w-3" />
                    Failed
                  </div>
                </div>
              )}

              {!img.uploading && !img.error && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 transition group-hover:bg-black/30">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                    className="hidden rounded-full bg-white/90 p-1.5 text-ink-700 shadow-soft transition hover:bg-red-500 hover:text-white group-hover:block"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {img.isPrimary && !img.uploading && (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}

              {!img.uploading && !img.error && (
                <div className="absolute left-1.5 top-1.5 hidden gap-0.5 group-hover:flex">
                  <button
                    onClick={(e) => { e.stopPropagation(); setCover(img.id); }}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-ink-700 shadow hover:bg-brand-600 hover:text-white"
                  >
                    Cover
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveImage(img.id, -1); }}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-ink-700 shadow hover:bg-ink-200"
                    disabled={images.indexOf(img) === 0}
                  >
                    ←
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveImage(img.id, 1); }}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-ink-700 shadow hover:bg-ink-200"
                    disabled={images.indexOf(img) === images.length - 1}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

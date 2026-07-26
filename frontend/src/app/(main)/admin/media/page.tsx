'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Image,
  Video,
  FileText,
  Upload,
  Search,
  Trash2,
  Grid3X3,
  List,
  Folder,
  ImageIcon,
  Film,
  File,
  Inbox,
  X,
  AlertTriangle,
  Download,
  Link2,
  Tag,
  Clock,
  HardDrive,
  LayoutGrid,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';

type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

type MediaItem = {
  id: string;
  filename: string;
  url: string;
  type: MediaType;
  sizeBytes: number;
  width?: number;
  height?: number;
  createdAt: string;
  tags: string[];
  folder?: string;
};

const STORAGE_KEY = 'reloom_media_library';

const FOLDERS = [
  { id: 'all', label: 'All Media', icon: Folder },
  { id: 'IMAGE', label: 'Images', icon: ImageIcon },
  { id: 'VIDEO', label: 'Videos', icon: Film },
  { id: 'DOCUMENT', label: 'Documents', icon: File },
  { id: 'uncategorized', label: 'Uncategorized', icon: Inbox },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'IMAGE', label: 'Images' },
  { value: 'VIDEO', label: 'Videos' },
  { value: 'DOCUMENT', label: 'Documents' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getFileType(filename: string, mimeType?: string): MediaType {
  if (mimeType?.startsWith('video/')) return 'VIDEO';
  if (mimeType?.startsWith('image/')) return 'IMAGE';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext || '')) return 'VIDEO';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext || '')) return 'IMAGE';
  return 'DOCUMENT';
}

function getUsageInfo(_media: MediaItem): string[] {
  const usages: string[] = [];
  if (_media.tags.includes('product')) usages.push('Product #P-1024');
  if (_media.tags.includes('banner')) usages.push('Homepage Banner');
  if (_media.tags.includes('blog')) usages.push('Blog Post: "Summer Collection"');
  if (usages.length === 0) usages.push('Not currently used');
  return usages;
}

function generateId() {
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
          <Skeleton className="aspect-square rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MediaListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function AdminMediaPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [activeFolder, setActiveFolder] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(() => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MediaItem[];
        setMediaItems(parsed);
      }
    } catch {
      setMediaItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  function persistMedia(items: MediaItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota exceeded */
    }
    setMediaItems(items);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const newItems: MediaItem[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      const type = getFileType(file.name, file.type);
      const reader = new FileReader();
      reader.onload = () => {
        let width: number | undefined;
        let height: number | undefined;

        if (type === 'IMAGE') {
          const img = new window.Image();
          img.onload = () => {
            width = img.naturalWidth;
            height = img.naturalHeight;
            finishItem();
          };
          img.onerror = finishItem;
          img.src = reader.result as string;
        } else {
          finishItem();
        }

        function finishItem() {
          newItems.push({
            id: generateId(),
            filename: file.name,
            url: reader.result as string,
            type,
            sizeBytes: file.size,
            width,
            height,
            createdAt: new Date().toISOString(),
            tags: [],
            folder: type === 'IMAGE' ? 'IMAGE' : type === 'VIDEO' ? 'VIDEO' : 'DOCUMENT',
          });
          processed++;
          if (processed === files!.length) {
            persistMedia([...newItems, ...mediaItems]);
            setUploading(false);
          }
        }
      };
      reader.onerror = () => {
        processed++;
          if (processed === files!.length) {
  }

  function handleDelete(media: MediaItem) {
    const updated = mediaItems.filter((m) => m.id !== media.id);
    persistMedia(updated);
    setDeleteConfirm(null);
    if (previewItem?.id === media.id) setPreviewItem(null);
  }

  function handleTagAdd(mediaId: string, tag: string) {
    const updated = mediaItems.map((m) =>
      m.id === mediaId ? { ...m, tags: [...new Set([...m.tags, tag])] } : m,
    );
    persistMedia(updated);
  }

  function handleTagRemove(mediaId: string, tag: string) {
    const updated = mediaItems.map((m) =>
      m.id === mediaId ? { ...m, tags: m.tags.filter((t) => t !== tag) } : m,
    );
    persistMedia(updated);
  }

  const filtered = mediaItems.filter((item) => {
    if (activeFolder === 'uncategorized' && item.folder) return false;
    if (activeFolder === 'uncategorized') return true;
    if (activeFolder !== 'all' && item.type !== activeFolder) return false;

    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.filename.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const folderCounts = mediaItems.reduce(
    (acc, m) => {
      acc.all++;
      if (m.type === 'IMAGE') acc.images++;
      else if (m.type === 'VIDEO') acc.videos++;
      else if (m.type === 'DOCUMENT') acc.docs++;
      if (!m.folder) acc.uncategorized++;
      return acc;
    },
    { all: 0, images: 0, videos: 0, docs: 0, uncategorized: 0 },
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-56">
          <div className="space-y-1">
            {FOLDERS.map((f) => {
              const count =
                f.id === 'all'
                  ? folderCounts.all
                  : f.id === 'IMAGE'
                    ? folderCounts.images
                    : f.id === 'VIDEO'
                      ? folderCounts.videos
                      : f.id === 'DOCUMENT'
                        ? folderCounts.docs
                        : folderCounts.uncategorized;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all',
                    activeFolder === f.id
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                  )}
                >
                  <f.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      activeFolder === f.id ? 'text-brand-600' : 'text-ink-400',
                    )}
                  />
                  <span className="flex-1">{f.label}</span>
                  <span
                    className={cn(
                      'flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                      activeFolder === f.id
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-ink-100 text-ink-600',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
                <Image className="h-6 w-6 text-brand-600" />
                Media Library
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                {mediaItems.length} item{mediaItems.length !== 1 && 's'} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                variant="brand"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename or tag..."
                className="h-10 pl-10"
              />
            </div>
            <Select
              options={TYPE_OPTIONS}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 w-36"
            />
            <div className="ml-auto flex items-center gap-1 rounded-xl border border-ink-200 bg-white p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                  viewMode === 'grid'
                    ? 'bg-ink-900 text-white'
                    : 'text-ink-400 hover:text-ink-600',
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                  viewMode === 'list'
                    ? 'bg-ink-900 text-white'
                    : 'text-ink-400 hover:text-ink-600',
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            viewMode === 'grid' ? <MediaGridSkeleton /> : <MediaListSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-white py-16">
              <Inbox className="h-12 w-12 text-ink-300" />
              <p className="mt-4 text-lg font-medium text-ink-800">No media found</p>
              <p className="mt-1 text-sm text-ink-500">
                {searchQuery || typeFilter !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first media file to get started'}
              </p>
              {!searchQuery && typeFilter === 'ALL' && (
                <Button
                  variant="brand"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4" />
                  Upload Media
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((item) => (
                <MediaGridCard
                  key={item.id}
                  item={item}
                  onPreview={setPreviewItem}
                  onDelete={setDeleteConfirm}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <MediaListRow
                  key={item.id}
                  item={item}
                  onPreview={setPreviewItem}
                  onDelete={setDeleteConfirm}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onClose={() => setPreviewItem(null)}>
        {previewItem && (
          <>
            <DialogHeader>
              <span className="truncate">{previewItem.filename}</span>
            </DialogHeader>
            <DialogBody>
              <div className="space-y-4">
                {/* Preview */}
                <div className="flex items-center justify-center overflow-hidden rounded-xl bg-ink-50">
                  {previewItem.type === 'IMAGE' ? (
                    <img
                      src={previewItem.url}
                      alt={previewItem.filename}
                      className="max-h-80 w-full object-contain"
                    />
                  ) : previewItem.type === 'VIDEO' ? (
                    <video
                      src={previewItem.url}
                      controls
                      className="max-h-80 w-full rounded-xl"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center">
                      <FileText className="h-16 w-16 text-ink-300" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-ink-400">Type</p>
                    <Badge
                      variant={
                        previewItem.type === 'IMAGE'
                          ? 'brand'
                          : previewItem.type === 'VIDEO'
                            ? 'default'
                            : 'outline'
                      }
                      className="mt-0.5"
                    >
                      {previewItem.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-ink-400">Size</p>
                    <p className="mt-0.5 font-medium text-ink-800">
                      {formatBytes(previewItem.sizeBytes)}
                    </p>
                  </div>
                  {previewItem.width && previewItem.height && (
                    <div>
                      <p className="text-xs font-medium text-ink-400">Dimensions</p>
                      <p className="mt-0.5 font-medium text-ink-800">
                        {previewItem.width} x {previewItem.height}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-ink-400">Uploaded</p>
                    <p className="mt-0.5 font-medium text-ink-800">
                      {formatDate(previewItem.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Usage */}
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-400">
                    <Link2 className="h-3 w-3" />
                    Usage
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {getUsageInfo(previewItem).map((u, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {u}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-400">
                    <Tag className="h-3 w-3" />
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewItem.tags.length === 0 && (
                      <span className="text-xs text-ink-400">No tags</span>
                    )}
                    {previewItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-700"
                      >
                        {tag}
                        <button
                          onClick={() => handleTagRemove(previewItem.id, tag)}
                          className="hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <AddTagInline
                      onAdd={(tag) => {
                        handleTagAdd(previewItem.id, tag);
                        setPreviewItem((prev) =>
                          prev ? { ...prev, tags: [...new Set([...prev.tags, tag])] } : prev,
                        );
                      }}
                    />
                  </div>
                </div>

                {/* URL */}
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-400">
                    <Download className="h-3 w-3" />
                    URL
                  </p>
                  <p className="truncate rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs text-ink-500">
                    {previewItem.url.length > 80
                      ? previewItem.url.slice(0, 80) + '...'
                      : previewItem.url}
                  </p>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setPreviewItem(null)}>
                Close
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteConfirm(previewItem);
                  setPreviewItem(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        {deleteConfirm && (
          <>
            <DialogHeader>Delete Media</DialogHeader>
            <DialogBody>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-ink-900">
                    Are you sure you want to delete this media?
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    &ldquo;{deleteConfirm.filename}&rdquo; will be permanently deleted.
                    {getUsageInfo(deleteConfirm).some((u) => u !== 'Not currently used') && (
                      <span className="mt-1 block text-amber-600">
                        This media is currently in use. Deleting may break pages where it&apos;s
                        embedded.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(deleteConfirm)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}

function MediaGridCard({
  item,
  onPreview,
  onDelete,
}: {
  item: MediaItem;
  onPreview: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}) {
  const TypeIcon = item.type === 'IMAGE' ? Image : item.type === 'VIDEO' ? Film : FileText;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition hover:shadow-lift">
      <button
        onClick={() => onPreview(item)}
        className="block w-full text-left"
      >
        <div className="relative aspect-square overflow-hidden bg-ink-50">
          {item.type === 'IMAGE' ? (
            <img
              src={item.url}
              alt={item.filename}
              className="h-full w-full object-cover transition group-hover:scale-105"
              loading="lazy"
            />
          ) : item.type === 'VIDEO' ? (
            <div className="relative flex h-full w-full items-center justify-center">
              <video
                src={item.url}
                className="h-full w-full object-cover"
                muted
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Film className="h-10 w-10 text-white" />
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileText className="h-16 w-16 text-ink-300" />
            </div>
          )}
          <Badge
            variant={
              item.type === 'IMAGE'
                ? 'brand'
                : item.type === 'VIDEO'
                  ? 'default'
                  : 'outline'
            }
            className="absolute left-2 top-2 text-[10px]"
          >
            <TypeIcon className="mr-1 h-2.5 w-2.5" />
            {item.type}
          </Badge>
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-medium text-ink-800">{item.filename}</p>
          <p className="mt-1 text-xs text-ink-400">
            {formatBytes(item.sizeBytes)} &middot; {formatDate(item.createdAt)}
          </p>
        </div>
      </button>
      <button
        onClick={() => onDelete(item)}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 opacity-0 shadow-soft backdrop-blur-sm transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function MediaListRow({
  item,
  onPreview,
  onDelete,
}: {
  item: MediaItem;
  onPreview: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}) {
  const TypeIcon = item.type === 'IMAGE' ? ImageIcon : item.type === 'VIDEO' ? Film : File;

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-3 shadow-soft transition hover:shadow-lift">
      <button
        onClick={() => onPreview(item)}
        className="flex shrink-0 items-center gap-4 min-w-0 flex-1 text-left"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink-50">
          {item.type === 'IMAGE' ? (
            <img
              src={item.url}
              alt={item.filename}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <TypeIcon className="h-6 w-6 text-ink-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-800">{item.filename}</p>
          <p className="flex items-center gap-2 text-xs text-ink-400">
            <span>{formatBytes(item.sizeBytes)}</span>
            <span>&middot;</span>
            <span>{formatDate(item.createdAt)}</span>
          </p>
        </div>
      </button>
      <Badge
        variant={
          item.type === 'IMAGE' ? 'brand' : item.type === 'VIDEO' ? 'default' : 'outline'
        }
        className="hidden shrink-0 sm:inline-flex"
      >
        {item.type}
      </Badge>
      <button
        onClick={() => onDelete(item)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddTagInline({ onAdd }: { onAdd: (tag: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-0.5 rounded-full bg-ink-50 px-2.5 py-0.5 text-xs font-medium text-ink-500 hover:bg-ink-100"
      >
        <Plus className="h-3 w-3" />
        Add tag
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed) {
          onAdd(trimmed);
          setValue('');
        }
        setEditing(false);
      }}
      className="inline-flex"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="tag..."
        className="h-6 w-20 rounded-full border border-ink-200 bg-white px-2 text-xs outline-none focus:border-brand-400"
        onBlur={() => {
          if (!value.trim()) setEditing(false);
        }}
      />
    </form>
  );
}

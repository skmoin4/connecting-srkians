import { useId, useRef, useState } from 'react';
import { ImagePlus, Link2, LoaderCircle, Trash2 } from 'lucide-react';
import { uploadApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../utils/format.js';

const MAX = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Uploads to /uploads/image (Cloudinary in production) and returns { url, publicId, provider }.
 *
 * Also accepts a link to an image that is already hosted somewhere — a file committed to
 * client/public, or any other https URL — which is stored as { url, provider: 'external' }.
 * That path needs no upload backend at all, so branding images still work before Cloudinary
 * is configured. It cannot replace uploads: fan club admins have nowhere to host their own.
 *
 * Only use images you have permission to use.
 */
export function ImageUpload({ value, onChange, folder = 'misc', label = 'Image', hint, aspect = 'aspect-video', className, rounded = 'rounded-xl' }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();
  const id = useId();

  const onFile = async (file) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error('Please choose a JPG, PNG, WEBP or GIF image.');
    if (file.size > MAX) return toast.error('Image must be 5MB or smaller.');
    setBusy(true);
    try {
      const { image } = await uploadApi.image(file, folder);
      onChange(image);
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const useLink = () => {
    const entered = window.prompt('Paste the image URL', value?.url || 'https://');
    if (entered === null) return;
    const url = entered.trim();
    if (!url) return onChange(null);
    if (!/^https?:\/\/\S+$/i.test(url)) return toast.error('Enter a full image URL starting with https://');
    onChange({ url, provider: 'external' });
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-fog-200">
        {label}
      </label>
      <div className={cn('group relative overflow-hidden border border-dashed border-white/15 bg-ink-850', aspect, rounded)}>
        {value?.url ? (
          <img src={value.url} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-fog-400">
            <button type="button" onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-2 hover:text-fog-200">
              {busy ? <LoaderCircle className="size-6 animate-spin" aria-hidden /> : <ImagePlus className="size-6" aria-hidden />}
              <span className="text-xs">{busy ? 'Uploading…' : 'Upload image'}</span>
            </button>
            <button type="button" onClick={useLink} className="flex items-center gap-1.5 text-xs text-fog-500 hover:text-gold-300" disabled={busy}>
              <Link2 className="size-3.5" aria-hidden />
              or paste a link
            </button>
          </div>
        )}
        {value?.url && (
          <div className="absolute inset-x-2 bottom-2 flex justify-end gap-2">
            <button type="button" onClick={useLink} className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/85" disabled={busy}>
              Link
            </button>
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/85" disabled={busy}>
              {busy ? 'Uploading…' : 'Replace'}
            </button>
            <button type="button" onClick={() => onChange(null)} className="rounded-lg bg-black/70 p-1.5 text-crimson-400 backdrop-blur hover:bg-black/85" aria-label="Remove image">
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
        <input id={id} ref={inputRef} type="file" accept={TYPES.join(',')} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <p className="text-xs text-fog-500">{hint || 'JPG, PNG, WEBP or GIF up to 5MB. Only upload images you have permission to use.'}</p>
    </div>
  );
}

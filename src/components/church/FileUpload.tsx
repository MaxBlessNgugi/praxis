import React, { useRef, useState } from 'react';
import { filesApi, type FilePurpose, type StoredFileDto } from '../../lib/api';
import { useFileUrl } from '../../hooks/useFileUrl';
import { errorMessage } from '../../hooks/useApi';

/**
 * One control for every upload in the console.
 *
 * The church's logo, a member's photograph and a scanned minute differ in what they accept and where
 * they are stored, but not in how an operator uses them. Keeping that in one place is what stops the
 * third upload screen from quietly forgetting its size check.
 *
 * Validation is done twice on purpose. Here, so the operator is told immediately and never waits on a
 * round trip for a 9 MB photograph; and on the server, because a client-side check is a courtesy and
 * not a control.
 */

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/** Read a file as a data URL, which is base64 with a `data:` prefix the server knows to strip. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That file could not be read'));
    reader.readAsDataURL(file);
  });
}

export interface FileUploadProps {
  purpose: FilePurpose;
  label: string;
  hint?: string;
  accept?: string;
  currentFileId?: string | null;
  maxBytes?: number;
  /** Show the uploaded file as a picture rather than only naming it. */
  preview?: boolean;
  disabled?: boolean;
  onUploaded: (file: StoredFileDto) => void | Promise<void>;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  purpose,
  label,
  hint,
  accept = 'image/png,image/jpeg,image/webp',
  currentFileId,
  maxBytes = DEFAULT_MAX_BYTES,
  preview = true,
  disabled = false,
  onUploaded,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState<StoredFileDto | null>(null);

  const displayedId = justUploaded?.id ?? currentFileId ?? null;
  const { url, loading: previewLoading } = useFileUrl(preview ? displayedId : null);
  const limitMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;

  const handleChoose = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Let the same file be chosen twice in a row — otherwise a retry after a failure does nothing.
    event.target.value = '';
    if (!file) return;

    setError(null);

    if (file.size > maxBytes) {
      setError(`${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${limitMb} MB.`);
      return;
    }

    setPending(true);
    try {
      const content = await readAsDataUrl(file);
      const result = await filesApi.upload({
        purpose,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        content,
      });
      setJustUploaded(result.data);
      await onUploaded(result.data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  };

  const shownName = justUploaded?.fileName ?? (currentFileId ? 'Current file' : null);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-start gap-4">
        {preview && (
          <div className="w-16 h-16 shrink-0 rounded-[12px] border border-[#E7E5E4] bg-[#FDF8F3] flex items-center justify-center overflow-hidden">
            {previewLoading ? (
              <span aria-hidden="true" className="material-symbols-outlined animate-spin text-[20px] text-[#C2410C]">
                progress_activity
              </span>
            ) : url ? (
              <img src={url} alt="" className="w-full h-full object-contain" />
            ) : (
              <span aria-hidden="true" className="material-symbols-outlined text-[24px] text-[#A8A29E]">
                image
              </span>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#1C1917]">{label}</p>
          {hint && <p className="text-[11px] text-[#57534E] mt-0.5">{hint}</p>}
          {shownName && (
            <p className="text-[11px] text-[#57534E] mt-1 font-mono truncate">
              {shownName}
              {justUploaded ? ` · ${Math.max(1, Math.round(justUploaded.byteSize / 1024))} KB` : ''}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || pending}
              className="px-3 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-70 disabled:cursor-wait cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
            >
              {pending ? 'Uploading…' : currentFileId || justUploaded ? 'Replace' : 'Choose file'}
            </button>
            <span className="text-[11px] text-[#A8A29E]">Max {limitMb} MB</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChoose}
            disabled={disabled || pending}
            className="sr-only"
            aria-label={label}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[11px] font-semibold text-[#B91C1C] flex items-start gap-1.5">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            error
          </span>
          {error}
        </p>
      )}
    </div>
  );
};

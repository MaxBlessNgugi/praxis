import { useEffect, useState } from 'react';
import { filesApi } from '../lib/api';

/**
 * A displayable URL for an uploaded file.
 *
 * An `<img src="/api/files/...">` cannot work here, because the file endpoint sits behind the same
 * bearer token as everything else and an image tag has no way to send one. So the blob is fetched
 * through the API client and turned into an object URL, which the browser can then render.
 *
 * The object URL is revoked when the id changes or the component unmounts. That is not tidiness:
 * an object URL pins its blob in memory until it is revoked, so a register that browsed a few hundred
 * member photographs would hold every one of them for the life of the tab.
 */
export interface FileUrlState {
  url: string | null;
  loading: boolean;
  error: string | null;
}

export function useFileUrl(fileId: string | null | undefined): FileUrlState {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(fileId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);

    filesApi
      .download(fileId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'The file could not be loaded');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  return { url, loading, error };
}

import { useEffect, useState } from 'react';
import { useOrgProfile } from './useApi';
import { filesApi } from '../lib/api';
import { blobToDataUrl, type ChurchHeader } from '../lib/documents';

/**
 * The church's identity, ready to print.
 *
 * Three facts, from the one place they live — the organisation profile. Until that profile is saved
 * the fields are blank rather than guessed: a certificate printed before the church has filled in
 * its own name should stop and be filled in, not print somebody else's.
 *
 * The logo is fetched and converted to a **data URL** rather than left as an object URL. A printed
 * document is written into a hidden frame and handed to the browser's print dialog; anything it has
 * to fetch after that point may or may not arrive in time, and the letterhead is exactly the part
 * nobody notices is missing until the certificates are already printed.
 */
export interface ChurchIdentity {
  church: ChurchHeader;
  loading: boolean;
}

export function useChurchIdentity(): ChurchIdentity {
  const profile = useOrgProfile();
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoPending, setLogoPending] = useState(false);

  const record = profile.data?.data ?? null;
  const logoFileId = record?.logoFileId ?? null;

  useEffect(() => {
    if (!logoFileId) {
      setLogoSrc(null);
      setLogoPending(false);
      return;
    }

    let cancelled = false;
    setLogoPending(true);
    filesApi
      .download(logoFileId)
      .then(blobToDataUrl)
      .then((dataUrl) => {
        if (!cancelled) setLogoSrc(dataUrl);
      })
      // A logo that will not load must not block a certificate or a summary; it prints without one.
      .catch(() => {
        if (!cancelled) setLogoSrc(null);
      })
      .finally(() => {
        if (!cancelled) setLogoPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [logoFileId]);

  return {
    church: {
      name: record?.name ?? '',
      tagline: record?.tagline ?? null,
      location: record?.location ?? '',
      logoSrc,
    },
    loading: profile.loading || logoPending,
  };
}

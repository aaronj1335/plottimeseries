import React, { useEffect, useState } from 'react';
import type { ShareOutcome } from '../share.ts';

/** How long the result of a click stays on the button before it offers again. */
const RESET_MS = 2500;

type ShareStatus = 'idle' | 'working' | ShareOutcome | 'failed';

/**
 * Short enough to keep the toolbar from reflowing on every click; the `title`
 * carries the detail.
 */
const LABELS: Record<ShareStatus, string> = {
  idle: 'Share Link',
  working: 'Sharing…',
  copied: 'Copied!',
  'address-bar': 'In URL bar',
  failed: 'Failed',
};

const TITLES: Record<ShareStatus, string> = {
  idle: 'Copy a link that carries this CSV, compressed, in its fragment',
  working: 'Compressing the CSV into a link',
  copied: 'The link is on your clipboard',
  'address-bar': 'The clipboard was unavailable, so the link is in the address bar',
  failed: 'The link could not be built',
};

export function shareLabel(status: ShareStatus): string {
  return LABELS[status];
}

interface ShareButtonProps {
  onShare: () => Promise<ShareOutcome>;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ onShare }) => {
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'idle' || status === 'working') return;

    const timer = setTimeout(() => setStatus('idle'), RESET_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const handleClick = async () => {
    setStatus('working');
    setError(null);
    try {
      setStatus(await onShare());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('failed');
    }
  };

  return (
    <button
      onClick={() => void handleClick()}
      // A second click while the first is compressing would throw away the link
      // it is most of the way through building.
      disabled={status === 'working'}
      className="share-button"
      title={error ?? TITLES[status]}
    >
      {LABELS[status]}
    </button>
  );
};

import { useRef, useState } from 'react';
import { useFileParser } from '../../hooks/useFileParser';
import { parseResume } from '../../lib/api';
import type { Profile } from '../../lib/types';

interface CandidateResumeUploadProps {
  onParsed: (profile: Profile) => void | Promise<void>;
  disabled?: boolean;
  variant?: 'banner' | 'inline';
  className?: string;
}

export function CandidateResumeUpload({
  onParsed,
  disabled,
  variant = 'banner',
  className = '',
}: CandidateResumeUploadProps) {
  const { extractFileText } = useFileParser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setStatus(`Reading ${file.name}...`);

    try {
      const fileText = await extractFileText(file);
      setStatus('Parsing resume and updating your profile...');
      const { profile } = await parseResume(fileText);
      await onParsed(profile);
      setStatus('Resume parsed — match scores updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume');
      setStatus(null);
    } finally {
      setParsing(false);
    }
  };

  const isBanner = variant === 'banner';

  return (
    <div
      className={`${isBanner ? 'rounded-xl border border-dashed border-teal/40 bg-teal/5 p-4 sm:p-5' : ''} ${className}`}
    >
      <div className={isBanner ? '' : 'flex flex-wrap items-center gap-3'}>
        <div className={isBanner ? '' : 'min-w-0 flex-1'}>
          <p className={`font-medium text-fg-primary ${isBanner ? 'text-sm' : 'text-xs'}`}>
            {isBanner ? 'Upload resume to check your fit' : 'Upload resume'}
          </p>
          {isBanner && (
            <p className="mt-1 text-xs text-fg-secondary">
              PDF, DOCX, TXT, or MD — we&apos;ll extract skills and recalculate match scores for every role.
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={disabled || parsing}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-lg border border-teal font-medium text-teal hover:bg-teal/10 disabled:opacity-50 ${
            isBanner ? 'mt-4 px-4 py-2 text-sm' : 'shrink-0 px-3 py-1.5 text-xs'
          }`}
        >
          {parsing ? 'Parsing...' : 'Choose resume file'}
        </button>
      </div>
      {status && !error && (
        <p className={`text-teal ${isBanner ? 'mt-2 text-xs' : 'mt-1 text-xs'}`}>{status}</p>
      )}
      {error && (
        <p className={`text-err ${isBanner ? 'mt-2 text-xs' : 'mt-1 text-xs'}`}>{error}</p>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface GoogleSignInButtonProps {
  className?: string;
}

export function GoogleSignInButton({ className = '' }: GoogleSignInButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-coral px-6 py-3 text-sm font-medium text-white transition hover:bg-coral-dark disabled:opacity-60 ${className}`}
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

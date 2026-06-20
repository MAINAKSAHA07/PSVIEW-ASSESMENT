import { APP_NAME } from '../lib/constants';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-bg">
      <header className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-coral to-teal">
            <span className="text-xs font-bold text-white">A</span>
          </div>
          <span className="font-serif text-xl text-txt-primary">{APP_NAME}</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <h1 className="max-w-2xl font-serif text-5xl leading-tight text-txt-primary md:text-6xl">
          Build your recruiting agent
        </h1>
        <p className="mt-4 max-w-lg text-lg text-txt-secondary">
          Configure an autonomous AI agent that engages candidates with your
          company&apos;s personality.
        </p>
        <div className="mt-10">
          <GoogleSignInButton />
        </div>
      </main>
    </div>
  );
}

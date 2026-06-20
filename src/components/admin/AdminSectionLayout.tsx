import { Link } from 'react-router-dom';

interface AdminSectionLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AdminSectionLayout({
  title,
  description,
  children,
}: AdminSectionLayoutProps) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <Link
        to="/app"
        className="inline-flex items-center text-sm text-teal hover:underline"
      >
        ← Back to admin overview
      </Link>
      <h1 className="mt-4 font-serif text-2xl text-fg-primary">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-fg-secondary">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  );
}

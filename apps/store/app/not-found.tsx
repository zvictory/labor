import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-stone-50 font-sans text-stone-900">
        <div className="space-y-4 px-4 text-center">
          <h1 className="font-serif text-6xl font-semibold text-stone-800">404</h1>
          <p className="text-lg font-medium text-stone-600">Page Not Found</p>
          <p className="max-w-md text-sm text-stone-500">
            The fragrance or page you are looking for does not exist or has been moved.
          </p>
          <div className="pt-4">
            <Link
              href="/en"
              className="bg-foreground text-background inline-flex h-11 items-center justify-center px-6 text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-80"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

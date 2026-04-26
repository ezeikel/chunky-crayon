import { Suspense } from 'react';
import AdminSidebar from './_components/AdminSidebar';

// Purely structural layout for /admin/* — no auth, no awaits. With
// `cacheComponents: true`, putting `await connection()` directly in a
// layout fails the build because the layout itself isn't inside a
// Suspense boundary ("Uncached data was accessed outside of <Suspense>").
//
// AdminSidebar uses usePathname() which Cache Components treats as
// dynamic, so it needs its own Suspense boundary too — fallback is null
// because a momentary missing sidebar is fine; the main content is what
// the user is waiting for.
//
// Auth is gated per-page via `await requireAdmin('notFound')` inside
// each page's Suspense-wrapped Content component. Server actions also
// re-check via requireAdmin() so the role gate is applied at every
// request, not just the page render.
const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-paper-cream/30">
      <div className="flex max-w-7xl mx-auto">
        <Suspense fallback={null}>
          <AdminSidebar />
        </Suspense>
        <main className="flex-1 min-w-0 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;

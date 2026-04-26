import { connection } from 'next/server';
import { requireAdmin } from '@/lib/auth-guards';
import AdminSidebar from './_components/AdminSidebar';

// Single role gate for the entire /admin/* tree. Non-admins get a 404
// (silent — keeps the route's existence private). Individual admin
// pages can drop their own requireAdmin() calls; this layout handles it.
//
// `await connection()` opts the layout out of static rendering so the
// auth() call has access to cookies. Required because of
// `cacheComponents: true`.
const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  await connection();
  await requireAdmin('notFound');

  return (
    <div className="min-h-screen bg-paper-cream/30">
      <div className="flex max-w-7xl mx-auto">
        <AdminSidebar />
        <main className="flex-1 min-w-0 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;

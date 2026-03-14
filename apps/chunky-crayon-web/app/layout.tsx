import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

// This is the root layout for Next.js App Router
// The actual HTML structure and providers are in app/[locale]/layout.tsx
// This minimal layout just passes children through for the routing to work
export default function RootLayout({ children }: Props) {
  return children;
}

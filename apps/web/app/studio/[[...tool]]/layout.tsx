export const metadata = {
  title: 'Chunky Crayon Blog Studio',
  description: 'Content management for Chunky Crayon blog',
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

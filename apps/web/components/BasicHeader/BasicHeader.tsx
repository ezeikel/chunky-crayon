import Link from 'next/link';

const BasicHeader = () => (
  <header className="flex items-center justify-between p-4 shadow-perfect sticky top-0 z-50 bg-white">
    <Link href="/">
      <h1 className="font-tondo text-4xl font-bold text-crayon-orange tracking-tight">
        Chunky Crayon
      </h1>
    </Link>
  </header>
);

export default BasicHeader;

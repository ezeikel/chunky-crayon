import Link from 'next/link';
import Image from 'next/image';

const BasicHeader = () => (
  <header className="flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
    <Link
      href="/"
      aria-label="Chunky Crayon home"
      className="group flex items-center gap-2 md:gap-2.5"
    >
      <Image
        src="/logos/cc-logo-no-bg.svg"
        alt=""
        width={32}
        height={32}
        className="w-7 h-7 md:w-8 md:h-8 shrink-0"
      />
      <h1 className="font-tondo text-2xl md:text-3xl font-bold text-gradient-orange tracking-tight">
        Chunky Crayon
      </h1>
    </Link>
  </header>
);

export default BasicHeader;

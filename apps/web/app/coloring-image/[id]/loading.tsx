import Image from 'next/image';
import PageWrap from '@/components/PageWrap/PageWrap';

export default function ColoringImageLoading() {
  // Use a consistent message (Next.js 16 doesn't allow Math.random in server components)
  const message = 'Getting your crayons ready! 🖍️';

  return (
    <PageWrap className="bg-gradient-to-b from-paper-cream via-white to-paper-cream flex flex-col justify-center items-center gap-6">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-crayon-orange-light/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-20 w-40 h-40 bg-crayon-teal-light/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '-2s' }}
        />
        <div
          className="absolute top-1/2 left-1/4 w-24 h-24 bg-crayon-pink-light/20 rounded-full blur-2xl animate-float"
          style={{ animationDelay: '-1s' }}
        />
      </div>

      {/* Colo mascot with gentle floating animation */}
      <div className="relative animate-float">
        <Image
          src="/images/colo.svg"
          alt="Colo the friendly crayon mascot"
          width={180}
          height={180}
          className="drop-shadow-xl"
          priority
        />
        {/* Sparkles around Colo */}
        <span className="absolute -top-3 -right-3 text-xl animate-pulse">
          ✨
        </span>
        <span
          className="absolute -bottom-1 -left-3 text-lg animate-pulse"
          style={{ animationDelay: '-0.5s' }}
        >
          🌟
        </span>
      </div>

      {/* Loading message */}
      <div className="text-center z-10">
        <p className="font-tondo font-bold text-xl md:text-2xl text-gradient-orange mb-2">
          {message}
        </p>
      </div>
    </PageWrap>
  );
}

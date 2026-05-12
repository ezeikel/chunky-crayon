import PageWrap from '@/components/PageWrap/PageWrap';

const CharactersLoading = () => (
  <PageWrap>
    <header className="text-center pb-6">
      <div className="h-8 w-56 bg-paper-cream-dark/40 rounded-full mx-auto mb-3 animate-pulse" />
      <div className="h-4 w-72 bg-paper-cream-dark/30 rounded-full mx-auto animate-pulse" />
    </header>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="rounded-3xl border-2 border-paper-cream-dark bg-white aspect-[5/6] animate-pulse"
        />
      ))}
    </div>
  </PageWrap>
);

export default CharactersLoading;

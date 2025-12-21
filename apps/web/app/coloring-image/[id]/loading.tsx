import PageWrap from '@/components/PageWrap/PageWrap';
import Loading from '@/components/Loading/Loading';

export default function ColoringImageLoading() {
  return (
    <PageWrap className="bg-gradient-to-br from-[#FFF2E6] to-[#FFE6CC] flex justify-center items-center">
      <Loading size="lg" />
    </PageWrap>
  );
}

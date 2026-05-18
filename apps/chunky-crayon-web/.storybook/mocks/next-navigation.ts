export const useRouter = () => ({
  push: (href: string) => console.info('[storybook] router.push', href),
  replace: (href: string) => console.info('[storybook] router.replace', href),
  refresh: () => console.info('[storybook] router.refresh'),
  back: () => console.info('[storybook] router.back'),
  forward: () => console.info('[storybook] router.forward'),
  prefetch: async () => undefined,
});

export const usePathname = () => '/';
export const useParams = () => ({ locale: 'en' });
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = () => [];
export const useSearchParams = () => new URLSearchParams();
export const notFound = () => {
  throw new Error('[storybook] notFound');
};
export const redirect = (href: string) => {
  console.info('[storybook] redirect', href);
};
export const permanentRedirect = (href: string) => {
  console.info('[storybook] permanentRedirect', href);
};

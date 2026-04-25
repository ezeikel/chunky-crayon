import { getColoringImageForAdCampaign } from '@/app/data/coloring-image';
import LandingDemoClient, {
  type LandingDemoScenario,
} from './LandingDemoClient';

// Demo scenarios — paired with the polaroid/hero campaigns so a visitor
// arriving from a "T-rex" ad can watch that same page get "drawn" here.
// Each entry has a child request line + the campaign key whose row in
// coloring_images supplies the finished page art.
const SCENARIOS: Array<{
  campaignKey: string;
  request: string;
  ctaLabel: string;
}> = [
  {
    campaignKey: 'trex',
    request: 'Mum, can I color a T-rex on a skateboard?',
    ctaLabel: 'Color this one',
  },
  {
    campaignKey: 'dragon',
    request: 'Can you draw dragons having a tea party?',
    ctaLabel: 'Color this one',
  },
  {
    campaignKey: 'foxes',
    request: 'I want a fox family on a picnic.',
    ctaLabel: 'Color this one',
  },
];

type LandingDemoProps = {
  title: string;
  body: string;
  idleLabel: string;
  drawingLabel: string;
  drawingSubLabel: string;
  playLabel: string;
  pauseLabel: string;
  // Where the demo is being rendered — scopes analytics events so we
  // can compare engagement on the homepage hero vs paid-ad /start.
  page: 'homepage' | 'start';
};

// Server wrapper: pre-fetches finished coloring pages for each scenario
// from the same `purposeKey='ad:<key>'` rows the polaroid uses, so the
// "result" frame shows a real prod coloring page rather than a stock
// illustration. Falls back gracefully if a row is missing.
export default async function LandingDemo(props: LandingDemoProps) {
  const items = await Promise.all(
    SCENARIOS.map(async ({ campaignKey, request, ctaLabel }) => {
      const image = await getColoringImageForAdCampaign(campaignKey);
      if (!image?.id || !image?.url || !image?.alt) return null;
      const scenario: LandingDemoScenario = {
        campaignKey,
        request,
        ctaLabel,
        imageId: image.id,
        imageUrl: image.url,
        alt: image.alt,
        title: image.title ?? '',
      };
      return scenario;
    }),
  );

  const scenarios = items.filter(
    (item): item is LandingDemoScenario => item !== null,
  );

  if (scenarios.length === 0) return null;

  return <LandingDemoClient {...props} scenarios={scenarios} />;
}

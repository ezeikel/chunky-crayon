import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faArrowRight } from '@fortawesome/pro-duotone-svg-icons';
import { getTranslations } from 'next-intl/server';

/**
 * Cross-brand callout to Coloring Habitat (CC's adult-coloring sibling
 * brand). Surfaced on CC pages where the audience is more likely to want
 * adult content — /gallery/for-teens and /gallery/for-adults today.
 *
 * Posture: "we offer some teen/adult pages, but CH is built for this
 * audience." Acknowledges the user's intent and routes them to the right
 * destination instead of pretending CC is the better fit. The CC kids
 * audience is what we optimise for; CH owns the older/adult vertical.
 *
 * Tracking: utm tags on the outbound link so CH attribution shows the
 * referral source in PostHog.
 */
const CH_HOST = 'https://coloringhabitat.com';

type Audience = 'teens' | 'adults';

const utmFor = (audience: Audience): string =>
  `?utm_source=chunkycrayon&utm_medium=cross-brand-signpost&utm_campaign=gallery-for-${audience}`;

const ColoringHabitatCallout = async ({
  audience,
  locale,
}: {
  audience: Audience;
  locale: string;
}) => {
  const t = await getTranslations({
    locale,
    namespace: 'gallery.coloringHabitatCallout',
  });

  return (
    <section className="mb-12">
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-800/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="shrink-0 w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <FontAwesomeIcon
              icon={faLeaf}
              className="text-2xl"
              style={
                {
                  '--fa-primary-color': '#10b981',
                  '--fa-secondary-color': '#059669',
                  '--fa-secondary-opacity': '1',
                } as React.CSSProperties
              }
            />
          </div>
          <div className="flex-1">
            <p className="text-xs font-tondo font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
              {t('eyebrow')}
            </p>
            <h2 className="font-tondo font-bold text-xl sm:text-2xl text-text-primary mb-2">
              {t(`title.${audience}`)}
            </h2>
            <p className="text-text-secondary text-sm sm:text-base mb-4 max-w-xl">
              {t(`body.${audience}`)}
            </p>
            <Link
              href={`${CH_HOST}${utmFor(audience)}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-tondo font-semibold rounded-full hover:bg-emerald-700 transition-colors text-sm"
            >
              {t('cta')}
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ColoringHabitatCallout;

'use client';

import { useState, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faHistory,
  faGift,
  faCheck,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import Loading from '@/components/Loading/Loading';
import ChallengeCard from '@/components/ChallengeCard';
import {
  getMyCurrentChallenge,
  getMyChallengeHistory,
  claimMyChallengeReward,
} from '@/app/actions/challenges';
import type { ChallengeWithProgress } from '@/lib/challenges';

const ChallengesPage = () => {
  const [currentChallenge, setCurrentChallenge] =
    useState<ChallengeWithProgress | null>(null);
  const [challengeHistory, setChallengeHistory] = useState<
    ChallengeWithProgress[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showCelebration, setShowCelebration] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{
    type: 'sticker' | 'accessory';
    id: string;
  } | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      const [current, history] = await Promise.all([
        getMyCurrentChallenge(),
        getMyChallengeHistory(5),
      ]);
      setCurrentChallenge(current);
      // Filter out the current challenge from history
      setChallengeHistory(
        history.filter(
          (h) => h.weeklyChallengeId !== current?.weeklyChallengeId,
        ),
      );
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleClaimReward = () => {
    if (!currentChallenge?.weeklyChallengeId || isPending) return;

    startTransition(async () => {
      const result = await claimMyChallengeReward(
        currentChallenge.weeklyChallengeId,
      );
      if (result.success && result.rewardType && result.rewardId) {
        setClaimedReward({ type: result.rewardType, id: result.rewardId });
        setShowCelebration(true);
        // Update the current challenge state to show reward claimed
        setCurrentChallenge((prev) =>
          prev ? { ...prev, rewardClaimed: true } : null,
        );
        // Hide celebration after 3 seconds
        setTimeout(() => {
          setShowCelebration(false);
          setClaimedReward(null);
        }, 3000);
      }
    });
  };

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <PageWrap>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Account', href: '/account/settings' },
          { label: 'Challenges' },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faTrophy}
            className="text-3xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            Weekly Challenges
          </h1>
        </div>
        <p className="text-text-secondary max-w-lg mx-auto">
          Complete fun coloring challenges each week to earn special stickers
          and accessories for your Colo!
        </p>
      </div>

      {/* Current Challenge Section */}
      <section className="mb-12">
        <h2 className="font-tondo font-bold text-xl text-text-primary mb-4 flex items-center gap-2">
          <FontAwesomeIcon
            icon={faSparkles}
            className="text-crayon-orange"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
          This Week&apos;s Challenge
        </h2>

        {currentChallenge ? (
          <ChallengeCard
            challengeData={currentChallenge}
            onClaimReward={
              currentChallenge.isCompleted && !currentChallenge.rewardClaimed
                ? handleClaimReward
                : undefined
            }
            isClaimingReward={isPending}
            className="max-w-xl"
          />
        ) : (
          <div className="bg-paper-cream rounded-2xl p-8 text-center max-w-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-crayon-orange/10 flex items-center justify-center">
              <FontAwesomeIcon
                icon={faTrophy}
                className="text-2xl text-crayon-orange"
              />
            </div>
            <h3 className="font-tondo font-bold text-lg text-text-primary mb-2">
              No Active Challenge
            </h3>
            <p className="text-text-secondary text-sm">
              Check back soon for the next weekly challenge!
            </p>
          </div>
        )}
      </section>

      {/* Challenge History Section */}
      {challengeHistory.length > 0 && (
        <section>
          <h2 className="font-tondo font-bold text-xl text-text-primary mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faHistory} className="text-text-muted" />
            Past Challenges
          </h2>

          <div className="space-y-4">
            {challengeHistory.map((challenge) => (
              <div
                key={challenge.weeklyChallengeId}
                className="bg-white/60 rounded-xl p-4 border border-paper-cream-dark"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-paper-cream flex items-center justify-center text-2xl">
                    {challenge.challenge.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-tondo font-bold text-text-primary truncate">
                      {challenge.challenge.title}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {challenge.progress} / {challenge.challenge.requirement}{' '}
                      completed
                    </p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {challenge.isCompleted ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-crayon-green/10 text-crayon-green">
                        <FontAwesomeIcon icon={faCheck} className="text-sm" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-full bg-paper-cream text-text-muted text-sm">
                        Expired
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && claimedReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-6xl mb-4"
              >
                {claimedReward.type === 'sticker' ? '🌟' : '🎁'}
              </motion.div>
              <h2 className="font-tondo font-bold text-2xl text-text-primary mb-2">
                Reward Claimed!
              </h2>
              <p className="text-text-secondary mb-4">
                {claimedReward.type === 'sticker'
                  ? 'A new sticker has been added to your sticker book!'
                  : 'A new accessory has been added to your Colo!'}
              </p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <FontAwesomeIcon
                  icon={faGift}
                  className="text-4xl text-crayon-green"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrap>
  );
};

export default ChallengesPage;

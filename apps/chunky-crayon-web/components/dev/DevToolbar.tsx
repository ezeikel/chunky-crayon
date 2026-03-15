'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWrench,
  faRotateRight,
  faChevronUp,
  faChevronDown,
  faEye,
  faEyeSlash,
} from '@fortawesome/pro-duotone-svg-icons';
import useUser from '@/hooks/useUser';
import cn from '@/utils/cn';

const DevToolbar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const {
    isGuest,
    guestGenerationsUsed,
    guestGenerationsRemaining,
    maxGuestGenerations,
    resetGuestData,
    isSignedIn,
    user,
  } = useUser();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
        title="Show Dev Toolbar"
      >
        <FontAwesomeIcon icon={faEye} className="text-sm" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden min-w-[280px] font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faWrench}
            className="text-yellow-400"
            style={
              {
                '--fa-primary-color': '#facc15',
                '--fa-secondary-color': '#f59e0b',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
          <span className="font-semibold text-yellow-400">Dev Tools</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <FontAwesomeIcon
              icon={isExpanded ? faChevronDown : faChevronUp}
              className="text-gray-400"
            />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Hide Toolbar"
          >
            <FontAwesomeIcon icon={faEyeSlash} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'transition-all duration-200 overflow-hidden',
          isExpanded ? 'max-h-96' : 'max-h-0',
        )}
      >
        <div className="p-3 space-y-3">
          {/* User Status */}
          <div className="space-y-1">
            <div className="text-gray-400 uppercase tracking-wider text-[10px]">
              User Status
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isSignedIn ? 'bg-green-500' : 'bg-yellow-500',
                )}
              />
              <span>{isSignedIn ? `Signed in: ${user?.email}` : 'Guest'}</span>
            </div>
          </div>

          {/* Guest Mode Section */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <div className="text-gray-400 uppercase tracking-wider text-[10px]">
              Guest Mode
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-gray-800 rounded px-2 py-1">
                <span className="text-gray-400">Used:</span>{' '}
                <span className="text-white font-semibold">
                  {guestGenerationsUsed}/{maxGuestGenerations}
                </span>
              </div>
              <div className="bg-gray-800 rounded px-2 py-1">
                <span className="text-gray-400">Remaining:</span>{' '}
                <span
                  className={cn(
                    'font-semibold',
                    guestGenerationsRemaining === 0
                      ? 'text-red-400'
                      : 'text-green-400',
                  )}
                >
                  {guestGenerationsRemaining}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                resetGuestData();
                // Force a re-render by triggering a small state update
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded text-white font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faRotateRight} />
              Reset Guest Generations
            </button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <div className="text-gray-400 uppercase tracking-wider text-[10px]">
              Quick Actions
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-[11px] transition-colors"
              >
                Clear localStorage
              </button>
              <button
                onClick={() => {
                  console.log(
                    'Guest Data:',
                    localStorage.getItem('chunky_crayon_guest'),
                  );
                  console.log('User:', user);
                }}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[11px] transition-colors"
              >
                Log State
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed Summary */}
      {!isExpanded && (
        <div className="px-3 py-2 flex items-center gap-3 text-[11px]">
          <span
            className={cn(
              'px-2 py-0.5 rounded',
              isSignedIn ? 'bg-green-600' : 'bg-yellow-600',
            )}
          >
            {isSignedIn ? 'Auth' : 'Guest'}
          </span>
          {isGuest && (
            <span className="text-gray-400">
              Gens: {guestGenerationsUsed}/{maxGuestGenerations}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DevToolbar;

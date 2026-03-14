'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  XCircle,
  Unplug,
} from 'lucide-react';

type TokenStatus = {
  connected: boolean;
  expiresAt?: Date;
  scopes?: string[];
};

type SocialConnectionsProps = {
  initialStatus: {
    pinterest: TokenStatus;
    tiktok: TokenStatus;
  };
};

const SocialConnections = ({ initialStatus }: SocialConnectionsProps) => {
  const [status, setStatus] = useState(initialStatus);
  const [posting, setPosting] = useState<{
    tiktok: boolean;
    pinterest: boolean;
  }>({
    tiktok: false,
    pinterest: false,
  });
  const [disconnecting, setDisconnecting] = useState<{
    tiktok: boolean;
    pinterest: boolean;
  }>({
    tiktok: false,
    pinterest: false,
  });
  const [postResults, setPostResults] = useState<{
    tiktok?: { success: boolean; message: string };
    pinterest?: { success: boolean; message: string };
  }>({});

  const handleConnectPinterest = () => {
    // Redirect to Pinterest OAuth
    window.location.href = '/api/auth/pinterest';
  };

  const handleConnectTikTok = () => {
    // Redirect to TikTok OAuth
    window.location.href = '/api/auth/tiktok';
  };

  const handleDisconnect = async (provider: 'tiktok' | 'pinterest') => {
    if (
      !confirm(
        `Are you sure you want to disconnect ${provider}? You'll need to re-authorize to post again.`,
      )
    ) {
      return;
    }

    setDisconnecting((prev) => ({ ...prev, [provider]: true }));

    try {
      const response = await fetch(
        `/api/auth/disconnect?provider=${provider}`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        setStatus((prev) => ({
          ...prev,
          [provider]: { connected: false },
        }));
        setPostResults((prev) => ({ ...prev, [provider]: undefined }));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to disconnect');
      }
    } catch {
      alert('Failed to disconnect');
    } finally {
      setDisconnecting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handlePostToTikTok = async () => {
    setPosting((prev) => ({ ...prev, tiktok: true }));
    setPostResults((prev) => ({ ...prev, tiktok: undefined }));

    try {
      const response = await fetch('/api/social/tiktok/post', {
        method: 'POST',
      });
      const data = await response.json();

      setPostResults((prev) => ({
        ...prev,
        tiktok: {
          success: response.ok,
          message: response.ok
            ? `Posted successfully! ID: ${data.publishId || 'pending'}`
            : data.error || 'Failed to post',
        },
      }));
    } catch (error) {
      setPostResults((prev) => ({
        ...prev,
        tiktok: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    } finally {
      setPosting((prev) => ({ ...prev, tiktok: false }));
    }
  };

  const handlePostToPinterest = async () => {
    setPosting((prev) => ({ ...prev, pinterest: true }));
    setPostResults((prev) => ({ ...prev, pinterest: undefined }));

    try {
      const response = await fetch('/api/social/pinterest/video', {
        method: 'POST',
      });
      const data = await response.json();

      setPostResults((prev) => ({
        ...prev,
        pinterest: {
          success: response.ok,
          message: response.ok
            ? `Posted successfully! Pin ID: ${data.pinId}`
            : data.error || 'Failed to post',
        },
      }));
    } catch (error) {
      setPostResults((prev) => ({
        ...prev,
        pinterest: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    } finally {
      setPosting((prev) => ({ ...prev, pinterest: false }));
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* TikTok Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <div>
                <CardTitle>TikTok</CardTitle>
                <CardDescription>
                  Post videos to your TikTok account
                </CardDescription>
              </div>
            </div>
            {status.tiktok.connected ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status.tiktok.connected ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Token expires: {formatDate(status.tiktok.expiresAt)}</p>
                {status.tiktok.scopes && (
                  <p>Scopes: {status.tiktok.scopes.join(', ')}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleConnectTikTok}
                  variant="outline"
                  size="sm"
                >
                  Reconnect
                </Button>
                <Button
                  onClick={handlePostToTikTok}
                  disabled={posting.tiktok}
                  size="sm"
                >
                  {posting.tiktok ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Video Now'
                  )}
                </Button>
                <Button
                  onClick={() => handleDisconnect('tiktok')}
                  disabled={disconnecting.tiktok}
                  variant="destructive"
                  size="sm"
                >
                  {disconnecting.tiktok ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Unplug className="w-4 h-4 mr-2" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>
              {postResults.tiktok && (
                <div
                  className={`text-sm p-3 rounded ${
                    postResults.tiktok.success
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {postResults.tiktok.message}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your TikTok account to enable automated video posting.
                You&apos;ll be redirected to TikTok to authorize access.
              </p>
              <Button onClick={handleConnectTikTok}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect TikTok
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pinterest Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <CardTitle>Pinterest</CardTitle>
                <CardDescription>
                  Post video pins to your Pinterest board
                </CardDescription>
              </div>
            </div>
            {status.pinterest.connected ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status.pinterest.connected ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Token expires: {formatDate(status.pinterest.expiresAt)}</p>
                {status.pinterest.scopes && (
                  <p>Scopes: {status.pinterest.scopes.join(', ')}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleConnectPinterest}
                  variant="outline"
                  size="sm"
                >
                  Reconnect
                </Button>
                <Button
                  onClick={handlePostToPinterest}
                  disabled={posting.pinterest}
                  size="sm"
                >
                  {posting.pinterest ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Video Pin Now'
                  )}
                </Button>
                <Button
                  onClick={() => handleDisconnect('pinterest')}
                  disabled={disconnecting.pinterest}
                  variant="destructive"
                  size="sm"
                >
                  {disconnecting.pinterest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Unplug className="w-4 h-4 mr-2" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>
              {postResults.pinterest && (
                <div
                  className={`text-sm p-3 rounded ${
                    postResults.pinterest.success
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {postResults.pinterest.message}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Pinterest account to enable automated video pin
                posting. You&apos;ll be redirected to Pinterest to authorize
                access.
              </p>
              <Button onClick={handleConnectPinterest}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect Pinterest
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialConnections;

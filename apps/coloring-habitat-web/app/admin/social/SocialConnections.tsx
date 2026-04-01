"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faSpinner,
  faTimes,
  faUnlink,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { faTiktok, faPinterest } from "@fortawesome/free-brands-svg-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  }>({ tiktok: false, pinterest: false });
  const [disconnecting, setDisconnecting] = useState<{
    tiktok: boolean;
    pinterest: boolean;
  }>({ tiktok: false, pinterest: false });
  const [postResults, setPostResults] = useState<{
    tiktok?: { success: boolean; message: string };
    pinterest?: { success: boolean; message: string };
  }>({});

  const handleConnectPinterest = () => {
    window.location.href = "/api/auth/pinterest";
  };

  const handleConnectTikTok = () => {
    window.location.href = "/api/auth/tiktok-admin";
  };

  const handleDisconnect = async (provider: "tiktok" | "pinterest") => {
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
        { method: "DELETE" },
      );

      if (response.ok) {
        setStatus((prev) => ({ ...prev, [provider]: { connected: false } }));
        setPostResults((prev) => ({ ...prev, [provider]: undefined }));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to disconnect");
      }
    } catch {
      alert("Failed to disconnect");
    } finally {
      setDisconnecting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handlePostToTikTok = async () => {
    setPosting((prev) => ({ ...prev, tiktok: true }));
    setPostResults((prev) => ({ ...prev, tiktok: undefined }));

    try {
      const response = await fetch("/api/social/tiktok/post", {
        method: "POST",
      });
      const data = await response.json();

      setPostResults((prev) => ({
        ...prev,
        tiktok: {
          success: response.ok,
          message: response.ok
            ? `Posted successfully! ID: ${data.publishId || "pending"}`
            : data.error || "Failed to post",
        },
      }));
    } catch (error) {
      setPostResults((prev) => ({
        ...prev,
        tiktok: {
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
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
      const response = await fetch("/api/social/pinterest/video", {
        method: "POST",
      });
      const data = await response.json();

      setPostResults((prev) => ({
        ...prev,
        pinterest: {
          success: response.ok,
          message: response.ok
            ? `Posted successfully! Pin ID: ${data.pinId}`
            : data.error || "Failed to post",
        },
      }));
    } catch (error) {
      setPostResults((prev) => ({
        ...prev,
        pinterest: {
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setPosting((prev) => ({ ...prev, pinterest: false }));
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPlatformCard = (
    platform: "tiktok" | "pinterest",
    label: string,
    icon: typeof faTiktok,
    bgColor: string,
    onConnect: () => void,
    onPost: () => void,
  ) => {
    const platformStatus = status[platform];
    const isPosting = posting[platform];
    const isDisconnecting = disconnecting[platform];
    const result = postResults[platform];

    return (
      <Card key={platform}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}
              >
                <FontAwesomeIcon icon={icon} className="text-white text-lg" />
              </div>
              <div>
                <CardTitle>{label}</CardTitle>
                <CardDescription>
                  Post content to your {label} account
                </CardDescription>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                platformStatus.connected
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <FontAwesomeIcon
                icon={platformStatus.connected ? faCheck : faTimes}
                className="text-[10px]"
              />
              {platformStatus.connected ? "Connected" : "Not Connected"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {platformStatus.connected ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Token expires: {formatDate(platformStatus.expiresAt)}</p>
                {platformStatus.scopes && (
                  <p>Scopes: {platformStatus.scopes.join(", ")}</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={onConnect} variant="outline" size="sm">
                  Reconnect
                </Button>
                <Button onClick={onPost} disabled={isPosting} size="sm">
                  {isPosting ? (
                    <>
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="mr-2 animate-spin"
                      />
                      Posting...
                    </>
                  ) : (
                    "Post Now"
                  )}
                </Button>
                <Button
                  onClick={() => handleDisconnect(platform)}
                  disabled={isDisconnecting}
                  variant="destructive"
                  size="sm"
                >
                  {isDisconnecting ? (
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin"
                    />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUnlink} className="mr-2" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>
              {result && (
                <div
                  className={`text-sm p-3 rounded ${
                    result.success
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {result.message}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your {label} account to enable automated posting.
                You&apos;ll be redirected to {label} to authorize access.
              </p>
              <Button onClick={onConnect}>
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  className="mr-2"
                />
                Connect {label}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {renderPlatformCard(
        "tiktok",
        "TikTok",
        faTiktok,
        "bg-black",
        handleConnectTikTok,
        handlePostToTikTok,
      )}
      {renderPlatformCard(
        "pinterest",
        "Pinterest",
        faPinterest,
        "bg-red-600",
        handleConnectPinterest,
        handlePostToPinterest,
      )}
    </div>
  );
};

export default SocialConnections;

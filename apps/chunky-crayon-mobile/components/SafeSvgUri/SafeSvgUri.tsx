import { Component, type ReactNode } from "react";
import { View, type DimensionValue } from "react-native";
import { useEffect, useState } from "react";
import { SvgXml } from "react-native-svg";
import * as Sentry from "@sentry/react-native";

/**
 * Failing silently here cost a debugging session: when the Android emulator's
 * DNS died, every remote SVG fetch failed and this component rendered blank
 * white boxes that looked exactly like a RENDERING bug (clipping? R2? CORS?)
 * instead of a NETWORK one. Make every failure observable: a console.warn in
 * dev (shows in Metro logs) and a Sentry breadcrumb always (attached to any
 * later event, so prod sessions with image problems carry the evidence).
 * Breadcrumbs are cheap and don't create Sentry issues by themselves.
 */
const reportSvgFailure = (uri: string, reason: string, detail?: unknown) => {
  if (__DEV__) {
    console.warn(`[SafeSvgUri] ${reason}: ${uri}`, detail ?? "");
  }
  Sentry.addBreadcrumb({
    category: "svg",
    level: "warning",
    message: `SafeSvgUri ${reason}`,
    data: { uri },
  });
};

/**
 * Crash-safe replacement for react-native-svg's `SvgUri`.
 *
 * WHY THIS EXISTS — `SvgUri` fetches a remote SVG and hands its raw text to the
 * NATIVE parser (`RNSVGPath setD:`). If the fetched body is truncated or
 * malformed — which happens intermittently when the JS thread is briefly
 * blocked mid-fetch (e.g. by the autosave's synchronous makeImageSnapshot +
 * encodeToBase64) — the native path parser throws `InvalidNumber` on the
 * partial `d` string DURING the mount transaction. That redboxes the whole
 * screen ("flash" → recover) even though the SVG is well-formed at rest on the
 * server. The line-art thumbnails under the coloring canvas (More Coloring
 * Pages / My Recent Creations / Feed) are the trigger.
 *
 * The fix is two layers, both here:
 *   1. Fetch the SVG in JS ourselves and VALIDATE it's complete (`</svg>`
 *      present, non-trivial length) before rendering. A truncated body never
 *      reaches the native parser — we render the fallback instead and the next
 *      mount/retry can succeed.
 *   2. An error boundary around SvgXml so that even a parse throw we didn't
 *      anticipate degrades to the fallback (blank) rather than crashing the
 *      tree. The boundary RESETS on a new uri/xml so a transient bad fetch on
 *      one item doesn't permanently blank it.
 *
 * Drop-in for the SvgUri call sites: same uri/width/height/viewBox props.
 */

class SvgErrorBoundary extends Component<
  { resetKey: string; fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // The boundary exists to swallow native SVG parse crashes — but swallowing
    // silently hides real problems (bad asset, truncation we didn't catch).
    reportSvgFailure(this.props.resetKey, "native SVG parse crash", error);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    // New source → clear a prior failure so a fresh (hopefully complete) SVG
    // gets a chance to render.
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const isCompleteSvg = (text: string | null): text is string =>
  !!text &&
  text.length > 32 &&
  text.includes("<svg") &&
  text.includes("</svg>");

/**
 * Normalize the root <svg> so the content SCALES to its container instead of
 * rendering at intrinsic pixel size and getting clipped.
 *
 * Our coloring SVGs ship as `<svg width="1024" height="1024" ...>` with NO
 * viewBox. With a fixed width/height and no viewBox, react-native-svg renders
 * the paths at 1024px and a smaller (e.g. square card) container just CLIPS them
 * — that's why the Today thumbnail showed only the bottom-left of the page while
 * the same art rendered full elsewhere. preserveAspectRatio can't help because
 * there's no viewBox to map.
 *
 * Fix: if the root <svg> has width/height but no viewBox, synthesize a
 * `viewBox="0 0 W H"` from them, then strip the fixed width/height so the
 * SvgXml-supplied width="100%"/height="100%" + preserveAspectRatio take over and
 * the whole page fits. Already-correct SVGs (viewBox present) pass through
 * untouched.
 */
const normalizeSvgRoot = (xml: string): string => {
  const open = xml.match(/<svg\b[^>]*>/i);
  if (!open) return xml;
  const tag = open[0];
  if (/\bviewBox\s*=/.test(tag)) return xml; // already scalable

  const w = tag.match(/\bwidth\s*=\s*["']?([\d.]+)/i)?.[1];
  const h = tag.match(/\bheight\s*=\s*["']?([\d.]+)/i)?.[1];
  if (!w || !h) return xml; // nothing to derive a viewBox from

  const newTag = tag
    .replace(/\swidth\s*=\s*["'][^"']*["']/i, "")
    .replace(/\sheight\s*=\s*["'][^"']*["']/i, "")
    .replace(/<svg\b/i, `<svg viewBox="0 0 ${w} ${h}"`);
  return xml.replace(tag, newTag);
};

type SafeSvgUriProps = {
  uri: string | null | undefined;
  width?: number | string;
  height?: number | string;
  // Optional viewBox OVERRIDE. Leave undefined (default) so the xml's own
  // viewBox drives scaling — normalizeSvgRoot guarantees one, derived from the
  // asset's real width/height, so a NON-square SVG isn't squashed. Passing a
  // hardcoded "0 0 1024 1024" here would override that and squash non-square
  // art (the latent bug), so don't unless you truly mean to.
  viewBox?: string;
  // How the viewBox maps into a non-square container. Default "xMidYMid meet"
  // = CONTAIN (whole page visible, letterboxed) so a coloring page is never
  // cropped — matches the detail view. Pass "xMidYMid slice" for cover/crop.
  preserveAspectRatio?: string;
};

const SafeSvgUri = ({
  uri,
  width = "100%",
  height = "100%",
  viewBox,
  preserveAspectRatio = "xMidYMid meet",
}: SafeSvgUriProps) => {
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setXml(null);
    if (!uri) return;
    (async () => {
      try {
        const res = await fetch(uri);
        if (!res.ok) {
          reportSvgFailure(uri, `HTTP ${res.status}`);
          return;
        }
        const text = await res.text();
        // Only accept a COMPLETE document — a truncated body would crash the
        // native path parser. A partial fetch fails this and renders nothing.
        // normalizeSvgRoot ensures a viewBox so the page scales (not clips).
        if (cancelled) return;
        if (isCompleteSvg(text)) {
          setXml(normalizeSvgRoot(text));
        } else {
          reportSvgFailure(uri, "incomplete/truncated SVG body");
        }
      } catch (error) {
        // Network/DNS error → leave xml null (blank). Non-fatal, but LOUD —
        // a silent blank here masquerades as a rendering bug.
        if (!cancelled) reportSvgFailure(uri, "fetch failed", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const fallback = (
    <View
      style={{
        width: width as DimensionValue,
        height: height as DimensionValue,
      }}
    />
  );
  if (!xml) return fallback;

  return (
    <SvgErrorBoundary resetKey={uri ?? ""} fallback={fallback}>
      {/* Only pass viewBox when explicitly overridden — otherwise let the xml's
          own (normalized, per-asset) viewBox drive scaling. SvgXml spreads xml
          attrs then props last, so an explicit viewBox={undefined} would clobber
          the xml's; the conditional spread avoids that. */}
      <SvgXml
        xml={xml}
        width={width}
        height={height}
        preserveAspectRatio={preserveAspectRatio}
        {...(viewBox ? { viewBox } : {})}
      />
    </SvgErrorBoundary>
  );
};

export default SafeSvgUri;

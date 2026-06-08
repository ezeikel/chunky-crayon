import { Component, type ReactNode } from "react";
import { View, type DimensionValue } from "react-native";
import { useEffect, useState } from "react";
import { SvgXml } from "react-native-svg";

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

type SafeSvgUriProps = {
  uri: string | null | undefined;
  width?: number | string;
  height?: number | string;
  viewBox?: string;
  // How the 1:1 viewBox maps into a non-square container. Default "xMidYMid meet"
  // = CONTAIN (whole page visible, letterboxed) so a coloring page is never
  // cropped — matches the detail view. Pass "xMidYMid slice" for cover/crop.
  preserveAspectRatio?: string;
};

const SafeSvgUri = ({
  uri,
  width = "100%",
  height = "100%",
  viewBox = "0 0 1024 1024",
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
        if (!res.ok) return;
        const text = await res.text();
        // Only accept a COMPLETE document — a truncated body would crash the
        // native path parser. A partial fetch fails this and renders nothing.
        if (!cancelled && isCompleteSvg(text)) setXml(text);
      } catch {
        // Network/parse error → leave xml null (blank). Non-fatal.
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
      <SvgXml
        xml={xml}
        width={width}
        height={height}
        viewBox={viewBox}
        preserveAspectRatio={preserveAspectRatio}
      />
    </SvgErrorBoundary>
  );
};

export default SafeSvgUri;

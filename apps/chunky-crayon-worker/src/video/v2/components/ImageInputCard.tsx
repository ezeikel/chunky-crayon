/**
 * Demo Reel V2 — presentational image upload card.
 *
 * Visual mirror of the live `<ImageInput>` (apps/chunky-crayon-web/
 * components/forms/CreateColoringPageForm/inputs/ImageInput.tsx).
 * Two states the reel renders:
 *   - 'idle'   — empty drop zone with prompt + photo icon
 *   - 'preview' — the photo loaded in, with a filename strip
 *
 * The reel's choreography sequences:
 *   idle (1s) → photo "drops in" via spring (0.5s) → preview holds (1s).
 */
import { Img } from "remotion";
import { COLORS, RADII, FONTS, FONT_WEIGHTS } from "../tokens/brand";

type ImageInputCardProps = {
  /** Photo URL to render in the preview state. */
  photoUrl?: string;
  /** Filename label under the preview. Falls back to a generic name. */
  filename?: string;
  /**
   * 0..1 — preview state opacity / scale. 0 = idle (empty drop zone),
   * 1 = preview fully visible. Reel passes interpolated frame value.
   */
  previewProgress: number;
};

export const ImageInputCard = ({
  photoUrl,
  filename = "photo.jpg",
  previewProgress,
}: ImageInputCardProps) => {
  const showPreview = previewProgress > 0 && Boolean(photoUrl);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 32,
        borderRadius: RADII.card,
        background: COLORS.textInverted,
        border: `2px solid ${COLORS.borderLight}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: RADII.card,
          background: showPreview ? COLORS.textInverted : COLORS.bgCream,
          border: `3px ${showPreview ? "solid" : "dashed"} ${
            showPreview ? COLORS.orange : COLORS.bgCreamDark
          }`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Empty state — fades out as previewProgress climbs */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 32,
            opacity: 1 - previewProgress,
            color: COLORS.textMuted,
            fontFamily: FONTS.body,
            fontWeight: FONT_WEIGHTS.body,
            fontSize: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              lineHeight: 1,
              color: COLORS.bgCreamDark,
            }}
          >
            +
          </div>
          <div>Drop a photo to color</div>
        </div>

        {/* Preview state — scales in via previewProgress */}
        {photoUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: previewProgress,
              transform: `scale(${0.85 + 0.15 * previewProgress})`,
              transformOrigin: "center center",
            }}
          >
            <Img
              src={photoUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}
      </div>

      {showPreview && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderRadius: RADII.pill,
            background: COLORS.bgCream,
            border: `1px solid ${COLORS.borderLight}`,
            fontFamily: FONTS.body,
            fontWeight: FONT_WEIGHTS.body,
            fontSize: 22,
            color: COLORS.textSecondary,
            opacity: previewProgress,
          }}
        >
          <span>{filename}</span>
        </div>
      )}
    </div>
  );
};

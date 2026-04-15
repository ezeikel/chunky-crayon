export type BrushType =
  | "crayon"
  | "marker"
  | "pencil"
  | "paintbrush"
  | "eraser"
  | "glitter"
  // Legacy types — rendering code exists but hidden from UI
  | "sparkle"
  | "rainbow"
  | "glow"
  | "neon";

export type FillPattern =
  | "solid"
  | "dots"
  | "stripes"
  | "stripes-diagonal"
  | "checkerboard"
  | "hearts"
  | "stars"
  | "zigzag";

export type PointerInputType = "mouse" | "touch" | "pen";

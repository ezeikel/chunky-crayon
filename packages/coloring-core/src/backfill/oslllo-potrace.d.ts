// Minimal type shim for `oslllo-potrace`. Package ships JS only.
// Mirrored from apps/chunky-crayon-worker/src/types/oslllo-potrace.d.ts —
// keep them in sync if either surface grows.
declare module "oslllo-potrace" {
  type PotraceOptions = {
    threshold?: number;
    optimizeImage?: boolean;
    turnPolicy?: "black" | "white" | "left" | "right" | "minority" | "majority";
  };

  type Potrace = {
    trace(): Promise<string>;
  };

  function potrace(buffer: Buffer, options?: PotraceOptions): Potrace;

  export default potrace;
}

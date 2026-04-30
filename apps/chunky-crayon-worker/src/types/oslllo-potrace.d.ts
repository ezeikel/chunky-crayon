// Minimal type shim for `oslllo-potrace`. The package ships JS only, so
// without this `import potrace from 'oslllo-potrace'` errors with ts7016.
//
// Surface kept narrow on purpose: only the call shape we actually use in
// `coloring-image/persist.ts`. If we ever start using more of the API,
// extend this rather than reaching for `any` at the call site.
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

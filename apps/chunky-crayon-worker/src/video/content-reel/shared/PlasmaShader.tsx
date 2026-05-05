/**
 * PlasmaShader — frame-deterministic GLSL plasma background for Stat Reels.
 *
 * Why a real shader and not CSS:
 *   - CSS radial-gradients produce three discrete blobs orbiting on a spline.
 *     Reads as "designed."
 *   - A fragment shader running 4D noise produces an organic, never-repeating
 *     fluid surface that reads as "alive." Big delta on a background that's
 *     on screen the whole 8 seconds.
 *
 * Determinism:
 *   - All animation comes from `useCurrentFrame() / fps` passed as a uniform.
 *     Same frame → same pixels every render. Required so worker reruns
 *     reproduce identical mp4s.
 *
 * Production rendering:
 *   - Studio runs WebGL natively in Chrome — works out of the box.
 *   - Worker `renderMedia` MUST pass `chromiumOptions: { gl: 'angle' }` in the
 *     content-reel render config (Phase 2). Without that, headless Chrome runs
 *     SwiftShader which does not support enough GLSL to render this. We handle
 *     this in `apps/chunky-crayon-worker/src/video/render.ts` when content-reel
 *     rendering ships.
 */

import { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

/**
 * Fragment shader: animated 4D simplex-style noise mapped to brand
 * colours. The 4th dimension is time, so the noise field never repeats —
 * cleanly avoids the "tiled / looping" giveaway of cheaper noise.
 *
 * Two noise samples at different frequencies are blended:
 *   - low frequency: drives the broad colour zones (where pink/teal pool)
 *   - high frequency: drives the fine cloud-like detail
 *
 * The colour stops use the brand palette (cream → pink → teal) so the
 * surface always reads as Chunky Crayon, never generic plasma.
 */
const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_colorBg;
  uniform vec3 u_colorWarm;
  uniform vec3 u_colorCool;
  uniform vec3 u_colorTint;

  // Simplex noise (Ashima/IQ port). Public domain.
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vec2 uv = v_uv;
    vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

    float t = u_time * 0.18;

    // Low-freq broad colour pools
    float low = snoise(vec3(p * 1.4, t)) * 0.5 + 0.5;
    // Mid-freq cloud detail
    float mid = snoise(vec3(p * 3.2 + vec2(13.0, 7.0), t * 1.3)) * 0.5 + 0.5;
    // High-freq subtle texture
    float hi = snoise(vec3(p * 6.5 + vec2(31.0, 19.0), t * 0.7)) * 0.5 + 0.5;

    float warmMix = smoothstep(0.35, 0.75, low + mid * 0.25);
    float coolMix = smoothstep(0.30, 0.70, mid * 0.7 + hi * 0.3);

    vec3 col = u_colorBg;
    col = mix(col, u_colorWarm, warmMix * 0.85);
    col = mix(col, u_colorCool, coolMix * 0.55);
    // Subtle global tint to keep it cohesive
    col = mix(col, u_colorTint, 0.06);

    // Vignette toward edges
    float vig = smoothstep(1.0, 0.55, length(p));
    col *= mix(0.92, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${info}`);
  }
  return shader;
};

const linkProgram = (
  gl: WebGLRenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram => {
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${info}`);
  }
  return program;
};

const hexToRgbVec3 = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b];
};

/**
 * Convert "hsl(H S% L%)" string (CC brand-token format) to an [r,g,b] vec3.
 * Falls back to mid-grey if parsing fails — won't crash the render.
 */
const hslStringToRgbVec3 = (hsl: string): [number, number, number] => {
  // Extract numbers from "hsl(38 55% 97%)" pattern
  const m = hsl.match(
    /hsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*\)/,
  );
  if (!m) return [0.5, 0.5, 0.5];
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
};

const colorToVec3 = (input: string): [number, number, number] => {
  if (input.startsWith("#")) return hexToRgbVec3(input);
  if (input.startsWith("hsl(")) return hslStringToRgbVec3(input);
  return [0.5, 0.5, 0.5];
};

export type PlasmaShaderProps = {
  /** Background base colour, rendered where noise is low. */
  colorBg: string;
  /** Warm pool colour (e.g. pink). */
  colorWarm: string;
  /** Cool pool colour (e.g. teal). */
  colorCool: string;
  /** Subtle global tint (e.g. cream highlight). */
  colorTint: string;
};

export const PlasmaShader: React.FC<PlasmaShaderProps> = ({
  colorBg,
  colorWarm,
  colorCool,
  colorTint,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const programRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    locTime: WebGLUniformLocation | null;
    locRes: WebGLUniformLocation | null;
    locBg: WebGLUniformLocation | null;
    locWarm: WebGLUniformLocation | null;
    locCool: WebGLUniformLocation | null;
    locTint: WebGLUniformLocation | null;
  } | null>(null);

  // Init once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      antialias: false,
    });
    if (!gl) {
      // Fall back silently — render is just blank canvas, host AbsoluteFill
      // can have a CSS background fallback if needed.
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = linkProgram(gl, vs, fs);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    programRef.current = {
      gl,
      program,
      locTime: gl.getUniformLocation(program, "u_time"),
      locRes: gl.getUniformLocation(program, "u_resolution"),
      locBg: gl.getUniformLocation(program, "u_colorBg"),
      locWarm: gl.getUniformLocation(program, "u_colorWarm"),
      locCool: gl.getUniformLocation(program, "u_colorCool"),
      locTint: gl.getUniformLocation(program, "u_colorTint"),
    };
  }, []);

  // Draw each frame
  useEffect(() => {
    const ctx = programRef.current;
    if (!ctx) return;
    const { gl, program, locTime, locRes, locBg, locWarm, locCool, locTint } =
      ctx;

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);

    if (locTime) gl.uniform1f(locTime, frame / fps);
    if (locRes) gl.uniform2f(locRes, width, height);
    if (locBg) gl.uniform3fv(locBg, colorToVec3(colorBg));
    if (locWarm) gl.uniform3fv(locWarm, colorToVec3(colorWarm));
    if (locCool) gl.uniform3fv(locCool, colorToVec3(colorCool));
    if (locTint) gl.uniform3fv(locTint, colorToVec3(colorTint));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [frame, fps, width, height, colorBg, colorWarm, colorCool, colorTint]);

  return (
    <AbsoluteFill style={{ backgroundColor: colorBg }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </AbsoluteFill>
  );
};

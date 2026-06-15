// src/gl/shaders.js — WebGL1 / GLSL ES 1.00

export const QUAD_VERT = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_uv;
void main() {
  v_uv = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

// Pass 1 — color grade. Source -> graded color (FBO-A).
export const GRADE_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_warmth;        // -1..1
uniform float u_fade;          // 0..1
uniform float u_contrast;      // ~0.9..1.2
uniform float u_saturation;    // ~0.9..1.1
uniform vec3  u_shadowTint;
uniform vec3  u_highlightTint;
uniform float u_rolloff;       // 0..1

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 sat(vec3 c, float s) {
  float l = dot(c, LUMA);
  return mix(vec3(l), c, s);
}

void main() {
  vec3 c = texture2D(u_image, v_uv).rgb;

  // warmth: warm pushes red up, blue down
  c.r += u_warmth * 0.12;
  c.b -= u_warmth * 0.12;

  // contrast around mid grey
  c = (c - 0.5) * u_contrast + 0.5;

  // saturation
  c = sat(c, u_saturation);

  // highlight roll-off (soft "blown" film highlights)
  vec3 soft = 1.0 - (1.0 - clamp(c, 0.0, 1.0)) * (1.0 - clamp(c, 0.0, 1.0));
  c = mix(c, soft, u_rolloff);

  // split-tone by luminance
  float l = clamp(dot(c, LUMA), 0.0, 1.0);
  c += u_shadowTint * (1.0 - l);
  c += u_highlightTint * l;

  // fade: lift the blacks (affects darks more than brights)
  c += u_fade * 0.12 * (1.0 - c);

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`

// Pass 2a — bright pass, weighted toward red/orange for halation glow.
export const BRIGHT_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;     // graded (FBO-A)
uniform float u_threshold;     // ~0.6
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec3 c = texture2D(u_image, v_uv).rgb;
  float l = dot(c, LUMA);
  float b = max(l - u_threshold, 0.0) / max(1.0 - u_threshold, 0.0001);
  vec3 glow = c * b;
  glow.g *= 0.6;
  glow.b *= 0.35;
  gl_FragColor = vec4(glow, 1.0);
}`

// Pass 2b — separable 9-tap gaussian blur. u_dir already includes texel + spread.
export const BLUR_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_dir;            // (texelX*spread, 0) or (0, texelY*spread)
void main() {
  vec3 sum = vec3(0.0);
  sum += texture2D(u_image, v_uv).rgb * 0.227027;
  sum += texture2D(u_image, v_uv + u_dir * 1.3846).rgb * 0.316216;
  sum += texture2D(u_image, v_uv - u_dir * 1.3846).rgb * 0.316216;
  sum += texture2D(u_image, v_uv + u_dir * 3.2308).rgb * 0.070270;
  sum += texture2D(u_image, v_uv - u_dir * 3.2308).rgb * 0.070270;
  gl_FragColor = vec4(sum, 1.0);
}`

// Pass 3 — composite: graded + halation(screen) + grain + vignette, then intensity mix.
export const COMPOSITE_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_graded;    // FBO-A
uniform sampler2D u_halation;  // FBO-C
uniform sampler2D u_source;    // original (for intensity mix)
uniform float u_halationAmt;   // 0..1
uniform float u_grain;         // 0..1
uniform float u_vignette;      // 0..1
uniform float u_intensity;     // 0..1
uniform vec2  u_resolution;
uniform float u_seed;
const vec3 LUMA = vec3(0.299, 0.587, 0.114);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 graded = texture2D(u_graded, v_uv).rgb;
  vec3 glow = texture2D(u_halation, v_uv).rgb;

  // screen-blend the halation glow
  vec3 col = 1.0 - (1.0 - graded) * (1.0 - glow * u_halationAmt);

  // film grain, strongest in midtones
  float l = dot(col, LUMA);
  float n = hash(v_uv * u_resolution + u_seed) - 0.5;
  float midMask = 1.0 - abs(l - 0.5) * 2.0;
  col += n * u_grain * 0.18 * mix(0.5, 1.0, midMask);

  // vignette
  float dist = length(v_uv - 0.5);
  float vig = smoothstep(0.85, 0.25, dist * 1.4);
  col *= mix(1.0, vig, u_vignette);

  col = clamp(col, 0.0, 1.0);

  // intensity: blend original <-> processed
  vec3 orig = texture2D(u_source, v_uv).rgb;
  gl_FragColor = vec4(mix(orig, col, u_intensity), 1.0);
}`

"use client";

import React, { useEffect, useRef, useState } from "react";

const METABALL_COUNT = 6;
/** Как в CodePen: порог 0.99 + мягкое затухание `(sum - 0.99) * EDGE_SOFTNESS`. */
const FIELD_THRESHOLD = 0.99;
const EDGE_SOFTNESS = 88.0;
/** Светлая бирюза (не тёмная #00B596): ядро и мягкий край. */
const TEAL_CORE = { r: 0.42, g: 0.93, b: 0.84 };
const TEAL_EDGE = { r: 0.9, g: 0.98, b: 0.96 };

type MetaballKind = "teal" | "white";

type Metaball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: MetaballKind;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type MoveBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type MetaballScene = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  metaballsHandle: WebGLUniformLocation;
  metaballs: Metaball[];
  width: number;
  height: number;
  animate: boolean;
};

/**
 * Metaball-фон в духе CodePen: мягкие «капли», быстрее движение, светлая бирюза.
 */
export function MetaballBackground(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useCssFallback, setUseCssFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    let scene: MetaballScene | null = null;
    try {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scene = createMetaballScene(canvas, !reducedMotion);
    } catch {
      setUseCssFallback(true);
      return;
    }

    if (scene === null) {
      setUseCssFallback(true);
      return;
    }

    const activeCanvas = canvas;
    const activeScene = scene;
    let frameId = 0;

    function onResize(): void {
      resizeMetaballScene(activeCanvas, activeScene);
    }

    function tick(): void {
      drawMetaballFrame(activeScene);
      if (activeScene.animate) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    window.addEventListener("resize", onResize);
    tick();

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(frameId);
      destroyMetaballScene(activeScene);
    };
  }, []);

  if (useCssFallback) {
    return <MetaballCssFallback />;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}

function MetaballCssFallback(): React.ReactElement {
  return (
    <>
      <div className="pointer-events-none absolute right-[-90px] bottom-[-100px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,_rgba(120,230,205,0.75)_0%,_rgba(120,230,205,0.28)_55%,_rgba(120,230,205,0)_78%)] blur-[28px]" />
      <div className="pointer-events-none absolute left-[10px] top-[20px] h-[260px] w-[480px] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.8)_0%,_rgba(255,255,255,0.28)_58%,_rgba(255,255,255,0)_78%)] blur-[44px]" />
    </>
  );
}

function createMetaballScene(
  canvas: HTMLCanvasElement,
  animate: boolean
): MetaballScene | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  if (gl === null) {
    return null;
  }

  const { width, height } = applyCanvasSize(canvas);
  const vertexShader = compileShader(
    gl,
    `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    gl.VERTEX_SHADER
  );
  const fragmentShader = compileShader(
    gl,
    buildFragmentShaderSource(),
    gl.FRAGMENT_SHADER
  );

  const program = linkProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const vertexData = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  const positionHandle = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionHandle);
  gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, false, 8, 0);

  return {
    gl,
    program,
    metaballsHandle: getRequiredUniformLocation(gl, program, "uMetaballs[0]"),
    metaballs: createMetaballField(width, height),
    width,
    height,
    animate,
  };
}

function buildFragmentShaderSource(): string {
  const cr = TEAL_CORE.r.toFixed(6);
  const cg = TEAL_CORE.g.toFixed(6);
  const cb = TEAL_CORE.b.toFixed(6);
  const er = TEAL_EDGE.r.toFixed(6);
  const eg = TEAL_EDGE.g.toFixed(6);
  const eb = TEAL_EDGE.b.toFixed(6);

  return `
    precision highp float;

    uniform vec4 uMetaballs[${String(METABALL_COUNT)}];

    float metaballField(vec2 point, vec4 ball) {
      float dx = ball.x - point.x;
      float dy = ball.y - point.y;
      float radius = ball.z;
      return (radius * radius) / (dx * dx + dy * dy);
    }

    float sumKind(vec2 point, float kindMarker) {
      float sum = 0.0;
      for (int i = 0; i < ${String(METABALL_COUNT)}; i++) {
        vec4 ball = uMetaballs[i];
        if (abs(ball.w - kindMarker) > 0.25) {
          continue;
        }
        sum += metaballField(point, ball);
      }
      return sum;
    }

    float codepenSoftness(float sum) {
      return max(0.0, 1.0 - (sum - ${String(FIELD_THRESHOLD)}) * ${String(EDGE_SOFTNESS)});
    }

    void main() {
      vec2 point = gl_FragCoord.xy;
      float sumTeal = sumKind(point, 0.0);
      float sumWhite = sumKind(point, 1.0);
      vec4 color = vec4(0.0);

      if (sumTeal >= ${String(FIELD_THRESHOLD)}) {
        float soft = codepenSoftness(sumTeal);
        vec3 core = vec3(${cr}, ${cg}, ${cb});
        vec3 edge = vec3(${er}, ${eg}, ${eb});
        vec3 fill = mix(edge, core, soft);
        color = vec4(fill, soft * 0.7);
      }

      if (sumWhite >= ${String(FIELD_THRESHOLD)}) {
        float soft = codepenSoftness(sumWhite);
        vec3 core = vec3(1.0, 1.0, 1.0);
        vec3 edge = vec3(0.94, 0.97, 0.97);
        vec3 fill = mix(edge, core, soft);
        vec4 whiteBlob = vec4(fill, soft * 0.48);
        color.rgb = mix(color.rgb, whiteBlob.rgb, whiteBlob.a);
        color.a = max(color.a, whiteBlob.a);
      }

      gl_FragColor = color;
    }
  `;
}

function resizeMetaballScene(canvas: HTMLCanvasElement, scene: MetaballScene): void {
  const { width, height } = applyCanvasSize(canvas);
  scene.width = width;
  scene.height = height;
  scene.metaballs = createMetaballField(width, height);
}

function drawMetaballFrame(scene: MetaballScene): void {
  const { gl, width, height } = scene;

  if (scene.animate) {
    stepMetaballs(scene.metaballs);
  }

  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform4fv(scene.metaballsHandle, packMetaballUniform(scene.metaballs));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function destroyMetaballScene(scene: MetaballScene): void {
  scene.gl.deleteProgram(scene.program);
}

function applyCanvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  const width = Math.max(1, Math.floor(cssWidth * dpr));
  const height = Math.max(1, Math.floor(cssHeight * dpr));
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${String(cssWidth)}px`;
  canvas.style.height = `${String(cssHeight)}px`;
  return { width, height };
}

function createMetaballField(width: number, height: number): Metaball[] {
  const tealZone: MoveBounds = {
    minX: width * 0.48,
    maxX: width * 1.12,
    minY: height * 0.42,
    maxY: height * 1.08,
  };
  const whiteZone: MoveBounds = {
    minX: width * -0.08,
    maxX: width * 0.46,
    minY: height * -0.02,
    maxY: height * 0.38,
  };

  return [
    spawnMetaball(tealZone, randomRadius(width, 0.12, 0.18), "teal"),
    spawnMetaball(tealZone, randomRadius(width, 0.09, 0.14), "teal"),
    spawnMetaball(tealZone, randomRadius(width, 0.1, 0.15), "teal"),
    spawnMetaball(whiteZone, randomRadius(width, 0.08, 0.13), "white"),
    spawnMetaball(whiteZone, randomRadius(width, 0.06, 0.1), "white"),
    spawnMetaball(whiteZone, randomRadius(width, 0.05, 0.09), "white"),
  ];
}

/** Радиус как в CodePen: случайный размер × 0.75 для поля. */
function randomRadius(width: number, minFactor: number, maxFactor: number): number {
  const raw = width * randomBetween(minFactor, maxFactor);
  return raw * 0.75;
}

function spawnMetaball(zone: MoveBounds, radius: number, kind: MetaballKind): Metaball {
  const padding = radius * 0.9;
  const minX = zone.minX + padding;
  const maxX = zone.maxX - padding;
  const minY = zone.minY + padding;
  const maxY = zone.maxY - padding;

  return {
    x: randomBetween(minX, maxX),
    y: randomBetween(minY, maxY),
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 3,
    radius,
    kind,
    minX,
    maxX,
    minY,
    maxY,
  };
}

function stepMetaballs(metaballs: Metaball[]): void {
  for (const ball of metaballs) {
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x < ball.minX || ball.x > ball.maxX) {
      ball.vx *= -1;
      ball.x = clamp(ball.x, ball.minX, ball.maxX);
    }
    if (ball.y < ball.minY || ball.y > ball.maxY) {
      ball.vy *= -1;
      ball.y = clamp(ball.y, ball.minY, ball.maxY);
    }
  }
}

function packMetaballUniform(metaballs: Metaball[]): Float32Array {
  const data = new Float32Array(METABALL_COUNT * 4);
  for (let i = 0; i < metaballs.length; i += 1) {
    const ball = metaballs[i]!;
    const base = i * 4;
    data[base] = ball.x;
    data[base + 1] = ball.y;
    data[base + 2] = ball.radius;
    data[base + 3] = ball.kind === "teal" ? 0 : 1;
  }
  return data;
}

function compileShader(
  gl: WebGLRenderingContext,
  source: string,
  type: number
): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) {
    throw new Error("WebGL shader creation failed.");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown";
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

function linkProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (program === null) {
    throw new Error("WebGL program creation failed.");
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown";
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log}`);
  }
  return program;
}

function getRequiredUniformLocation(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (location === null) {
    throw new Error(`Uniform not found: ${name}`);
  }
  return location;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

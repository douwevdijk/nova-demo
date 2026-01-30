"use client";

import { useEffect, useRef, useCallback } from "react";

interface NovaVisualizerProps {
  audioLevel: number;
}

export function NovaVisualizer({ audioLevel }: NovaVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number>(0);
  const audioLevelRef = useRef<number>(0);
  const uniformsRef = useRef<{
    resolution: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    audio: WebGLUniformLocation | null;
    effectStrength: WebGLUniformLocation | null;
    particleIntensity: WebGLUniformLocation | null;
    cloudIntensity: WebGLUniformLocation | null;
    glowIntensity: WebGLUniformLocation | null;
  }>({
    resolution: null,
    time: null,
    audio: null,
    effectStrength: null,
    particleIntensity: null,
    cloudIntensity: null,
    glowIntensity: null,
  });

  // Update audio level ref
  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_audio;
    uniform float u_effectStrength;
    uniform float u_particleIntensity;
    uniform float u_cloudIntensity;
    uniform float u_glowIntensity;

    vec3 getSiriColor(float index) {
      if (index < 1.0) return vec3(0.3, 0.6, 1.0);
      if (index < 2.0) return vec3(0.5, 0.3, 1.0);
      if (index < 3.0) return vec3(1.0, 0.4, 0.7);
      if (index < 4.0) return vec3(0.4, 0.9, 1.0);
      return vec3(0.6, 0.3, 0.9);
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }

      return value;
    }

    float circleEdgeParticles(vec2 uv, float time, float audio) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);

      float radius = 0.35;
      float edgeDist = abs(d - radius);

      float onEdge = smoothstep(0.015, 0.005, edgeDist);

      float particleCount = 24.0 + audio * 40.0;

      float angleStep = 6.28318 / particleCount;
      float particleAngle = mod(angle + 3.14159, angleStep);

      float particle = smoothstep(angleStep * 0.4, angleStep * 0.1, abs(particleAngle - angleStep * 0.5));

      float rotation = time * 0.5;
      float animParticle = sin((angle + rotation) * particleCount * 0.5) * 0.5 + 0.5;
      animParticle = pow(animParticle, 4.0);

      float particles = max(particle, animParticle * 0.5);

      float intensity = 0.3 + audio * 0.7;

      return particles * onEdge * intensity;
    }

    vec3 oracleOrb(vec2 uv, float time, float audio) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);

      float radius = 0.35;
      float edgeMove = 0.0;
      float edgeDist = abs(d - (radius + edgeMove));

      float edge = smoothstep(0.012, 0.002, edgeDist);

      float energyFlow1 = sin(angle * 3.0 + time * 0.6) * 0.5 + 0.5;
      float energyFlow2 = sin(angle * 5.0 - time * 0.8) * 0.5 + 0.5;
      float energyFlow3 = sin(angle * 7.0 + time * 0.5) * 0.5 + 0.5;

      float energyPattern = energyFlow1 * 0.4 + energyFlow2 * 0.3 + energyFlow3 * 0.3;
      energyPattern = pow(energyPattern, 2.0);

      float energyMask = smoothstep(0.02, 0.005, edgeDist);

      return vec3(edge, energyPattern, energyMask);
    }

    float puffingParticles(vec2 uv, float time, float audio) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);

      float particles = 0.0;

      float rotationSpeed = 0.5 + audio * 1.0;

      for (float i = 0.0; i < 6.0; i += 1.0) {
        float particleAngle = i * 1.047 + time * rotationSpeed;

        float spiralRadius = 0.42;
        if (audio > 0.05) {
          spiralRadius += sin(time * 2.0 + i) * 0.08 * audio;
        } else {
          spiralRadius += sin(time * 0.8 + i) * 0.05;
        }

        vec2 particlePos = vec2(cos(particleAngle), sin(particleAngle)) * spiralRadius;

        float dist = length(uv - particlePos);

        float puff = sin(time * 1.2 + i * 0.8) * 0.5 + 0.5;
        puff = smoothstep(0.2, 0.8, puff);

        float glowStrength = audio > 0.05 ? 20.0 : 15.0;
        float particleGlow = exp(-dist * glowStrength) * puff;
        particles += particleGlow;
      }

      particles *= (0.3 + audio * 0.8);

      return particles;
    }

    float mysticClouds(vec2 uv, float time, float audio) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);

      float swirlSpeed = 0.15;
      float swirl = time * swirlSpeed;
      vec2 swirlOffset = vec2(cos(swirl), sin(swirl)) * 0.3;

      float timeMultiplier = 1.0;

      vec2 cloudPos1 = uv * 4.0 + swirlOffset + vec2(sin(time * 0.06 * timeMultiplier) * 0.2, cos(time * 0.07 * timeMultiplier) * 0.2);
      vec2 cloudPos2 = uv * 5.5 - swirlOffset * 0.7 + vec2(cos(time * 0.05 * timeMultiplier) * 0.25, sin(time * 0.08 * timeMultiplier) * 0.15);
      vec2 cloudPos3 = uv * 3.5 + vec2(sin(time * 0.09 * timeMultiplier) * 0.3, -cos(time * 0.06 * timeMultiplier) * 0.25);
      vec2 cloudPos4 = uv * 6.0 + swirlOffset * 0.5 + vec2(-sin(time * 0.07 * timeMultiplier) * 0.15, cos(time * 0.05 * timeMultiplier) * 0.2);
      vec2 cloudPos5 = uv * 4.8 - vec2(cos(time * 0.08 * timeMultiplier) * 0.2, sin(time * 0.06 * timeMultiplier) * 0.25);

      float clouds = fbm(cloudPos1) * 0.3;
      clouds += fbm(cloudPos2) * 0.25;
      clouds += fbm(cloudPos3) * 0.2;
      clouds += fbm(cloudPos4) * 0.15;
      clouds += fbm(cloudPos5) * 0.1;

      float swirlPattern = sin(angle * 2.0 + d * 8.0 - time * 0.3) * 0.5 + 0.5;
      clouds *= 0.7 + swirlPattern * 0.3;

      float cloudMask = smoothstep(0.15, 0.30, d) * smoothstep(0.85, 0.40, d);

      float intensity = 0.75;

      return clouds * cloudMask * intensity;
    }

    float shimmerEdge(vec2 uv, float time, float audio) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);

      float radius = 0.35;
      float edgeDist = abs(d - radius);

      float shimmer1 = sin(time * 0.8 + angle * 3.0) * 0.5 + 0.5;
      float shimmer2 = sin(time * 1.2 - angle * 5.0) * 0.5 + 0.5;
      float shimmer3 = sin(time * 0.6 + angle * 7.0) * 0.5 + 0.5;

      float shimmer = shimmer1 * 0.4 + shimmer2 * 0.3 + shimmer3 * 0.3;
      shimmer = pow(shimmer, 2.0);

      float baseIntensity = 0.5;
      float audioSmooth = sqrt(audio) * 0.8;
      float intensity = baseIntensity + audioSmooth;
      intensity = min(intensity, 1.3);

      float edgeGlow = exp(-edgeDist * 25.0) * shimmer * intensity;
      edgeGlow += exp(-edgeDist * 15.0) * shimmer * 0.5 * intensity;
      edgeGlow += exp(-edgeDist * 8.0) * shimmer * 0.3 * intensity;

      return edgeGlow;
    }

    vec3 oracleGlow(vec2 uv, float time, float audio) {
      float d = length(uv);

      float breath = sin(time * 0.8) * 0.08 + 0.92;
      float glowIntensity = exp(-d * 3.0) * breath;

      vec2 colorFlow1 = uv * 2.0 + vec2(time * 0.08, sin(time * 0.1) * 0.5);
      vec2 colorFlow2 = uv * 1.5 - vec2(cos(time * 0.09) * 0.4, time * 0.07);

      float flow1 = fbm(colorFlow1);
      float flow2 = fbm(colorFlow2);

      vec3 purple1 = vec3(0.45, 0.25, 0.95);
      vec3 purple2 = vec3(0.4, 0.3, 1.0);
      vec3 purple3 = vec3(0.5, 0.2, 0.9);

      vec3 glowColor = purple1 * smoothstep(0.3, 0.7, flow1) * 0.5;
      glowColor += purple2 * smoothstep(0.3, 0.7, flow2) * 0.3;
      glowColor += purple3 * 0.2;

      return glowColor * glowIntensity;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / min(u_resolution.x, u_resolution.y);
      vec2 uvClouds = uv;

      float rotationAngle = u_time * 0.3;
      float cosA = cos(rotationAngle);
      float sinA = sin(rotationAngle);
      mat2 rotationMatrix = mat2(cosA, -sinA, sinA, cosA);
      uv = rotationMatrix * uv;

      vec3 color = vec3(0.0);

      float GOD_VOICE_STRENGTH = u_effectStrength;

      // Shimmer edge
      float shimmer = shimmerEdge(uv, u_time, u_audio);
      vec3 shimmerColor = vec3(0.5, 0.35, 1.0);
      shimmerColor = mix(shimmerColor, vec3(0.4, 0.6, 1.0), 0.3);
      float finalStrength = GOD_VOICE_STRENGTH * 0.85;
      color += shimmerColor * shimmer * finalStrength;

      // Spiraling particles
      float particles = puffingParticles(uv, u_time, u_audio);
      vec3 particleColor = vec3(0.5, 0.3, 1.0);
      float particleBoost = 1.0 + u_audio * 0.5;
      color += particleColor * particles * particleBoost * u_particleIntensity;

      // Mystic clouds
      float clouds = mysticClouds(uvClouds, u_time, u_audio);
      vec3 cloudColor = vec3(0.4, 0.35, 0.95);
      color += cloudColor * clouds * u_cloudIntensity;

      // Oracle orb edge
      vec3 orbData = oracleOrb(uv, u_time, u_audio);
      float orb = orbData.x;
      float energyPattern = orbData.y;
      float energyMask = orbData.z;

      vec3 edgeColor = getSiriColor(0.0) * 0.5;
      edgeColor += getSiriColor(1.0) * 0.35;
      edgeColor += getSiriColor(2.0) * 0.25;
      color += edgeColor * orb * 1.5;

      // Energy layer
      vec3 energyColor = vec3(0.55, 0.35, 1.0);
      energyColor = mix(energyColor, vec3(0.4, 0.5, 1.0), energyPattern * 0.3);
      color += energyColor * energyPattern * energyMask * 0.6;

      // Edge particles
      float edgeParticles = circleEdgeParticles(uv, u_time, u_audio);
      vec3 edgeParticleColor = vec3(0.7, 0.5, 1.0);
      color += edgeParticleColor * edgeParticles * 2.5;

      // Inner glow
      vec3 glowColor = oracleGlow(uv, u_time, u_audio);
      color += glowColor * u_glowIntensity;

      // Core
      float d = length(uv);
      float corePulse = sin(u_time * 1.0) * 0.08 + 0.92;

      float lightOrb = exp(-d * 15.0) * 0.25 * corePulse;
      vec3 orbColor = vec3(0.6, 0.5, 1.0);
      color += orbColor * lightOrb;

      float outerCore = exp(-d * 8.0) * 0.2 * corePulse;
      vec3 outerCoreColor = vec3(0.35, 0.2, 0.85);
      color += outerCoreColor * outerCore;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const createShader = useCallback((gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }, []);

  const createProgram = useCallback((gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }, []);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext;
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    glRef.current = gl;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    programRef.current = program;

    // Get uniform locations
    uniformsRef.current = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      audio: gl.getUniformLocation(program, "u_audio"),
      effectStrength: gl.getUniformLocation(program, "u_effectStrength"),
      particleIntensity: gl.getUniformLocation(program, "u_particleIntensity"),
      cloudIntensity: gl.getUniformLocation(program, "u_cloudIntensity"),
      glowIntensity: gl.getUniformLocation(program, "u_glowIntensity"),
    };

    // Setup geometry
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      const time = (Date.now() - startTimeRef.current) * 0.001;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      gl.uniform2f(uniformsRef.current.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniformsRef.current.time, time);
      gl.uniform1f(uniformsRef.current.audio, audioLevelRef.current);
      gl.uniform1f(uniformsRef.current.effectStrength, 1.5);
      gl.uniform1f(uniformsRef.current.particleIntensity, 0.7);
      gl.uniform1f(uniformsRef.current.cloudIntensity, 2.5);
      gl.uniform1f(uniformsRef.current.glowIntensity, 1.2);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [createShader, createProgram, vertexShaderSource, fragmentShaderSource]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: "#000" }}
    />
  );
}

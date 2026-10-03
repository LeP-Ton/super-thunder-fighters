import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadShipAsset } from "../render/modelLibrary";
import { createParkedDisplay } from "../render/parkedDisplay";
import {
  createHangarEnvironment,
  frameHangarCamera,
} from "../render/hangarEnvironment";
import { modelPreviews, ShipKind } from "../render/modelManifest";

interface ShipShowcaseProps {
  kind: ShipKind;
  label: string;
  paused?: boolean;
  interactive?: boolean;
  className?: string;
  home?: boolean;
}

export const ShipShowcase: React.FC<ShipShowcaseProps> = ({
  kind,
  label,
  paused = false,
  interactive = true,
  className = "",
  home = false,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const loadRef = useRef<((kind: ShipKind) => void) | null>(null);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setReady(false);
    setUnavailable(false);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setUnavailable(true);
      return;
    }
    let disposed = false;
    let frame = 0;
    let needsRender = true;
    let parkedDisplay: ReturnType<typeof createParkedDisplay> | undefined;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#16202a", 0.009);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
    renderer.setClearColor("#090f17", 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const environmentScene = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(renderer);
    const environment = generator.fromScene(environmentScene, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.38;
    environmentScene.dispose();
    generator.dispose();

    const hangar = createHangarEnvironment(() => {
      needsRender = true;
    });
    scene.add(hangar.group);
    const turntable = new THREE.Group();
    scene.add(turntable);
    let rotation = 0;
    let targetRotation = 0;
    let pointer: { id: number; x: number } | undefined;
    const canvas = renderer.domElement;
    canvas.style.cursor = interactive ? "grab" : "default";
    const pointerDown = (event: PointerEvent) => {
      if (
        !interactive ||
        pointer ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      pointer = { id: event.pointerId, x: event.clientX };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const pointerMove = (event: PointerEvent) => {
      if (pointer?.id !== event.pointerId) return;
      targetRotation +=
        ((event.clientX - pointer.x) / Math.max(host.clientWidth, 1)) *
        Math.PI *
        2;
      pointer.x = event.clientX;
    };
    const pointerUp = (event: PointerEvent) => {
      if (pointer?.id !== event.pointerId) return;
      pointer = undefined;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("lostpointercapture", pointerUp);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      // 取景不依赖模型是否到达，冷启动与切机都保持同一地面和舱口。
      frameHangarCamera(camera, width, height, home);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      needsRender = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener("resize", resize);
    resize();

    // 新模型就绪后原位替换；加载时保留当前 3D 场景，不插入另一机位的缩略图。
    let generation = 0;
    loadRef.current = (nextKind) => {
      const request = ++generation;
      setReady(false);
      setUnavailable(false);
      loadShipAsset(nextKind)
        .then((asset) => {
          if (disposed || request !== generation) return;
          const next = createParkedDisplay(asset);
          if (parkedDisplay) {
            turntable.remove(parkedDisplay.aircraft);
            scene.remove(parkedDisplay.markings);
            parkedDisplay.dispose();
          }
          parkedDisplay = next;
          turntable.add(next.aircraft);
          scene.add(next.markings);
          rotation = targetRotation = 0;
          turntable.rotation.y = 0;
          renderer.render(scene, camera);
          needsRender = false;
          setReady(true);
        })
        .catch(() => {
          if (!disposed && request === generation) setUnavailable(true);
        });
    };
    renderer.render(scene, camera);

    let previous = performance.now();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      if (pausedRef.current || document.hidden) {
        previous = now;
        return;
      }
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (
        renderer.getPixelRatio() !==
        Math.min(window.devicePixelRatio || 1, 1.75)
      )
        resize();
      if (Math.abs(targetRotation - rotation) > 0.0001) {
        rotation = THREE.MathUtils.lerp(
          rotation,
          targetRotation,
          1 - Math.exp(-12 * delta),
        );
        if (Math.abs(targetRotation - rotation) < 0.0001)
          rotation = targetRotation;
        turntable.rotation.y = rotation;
        needsRender = true;
      }
      if (needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("lostpointercapture", pointerUp);
      loadRef.current = null;
      parkedDisplay?.dispose();
      hangar.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [interactive, home]);

  useEffect(() => {
    loadRef.current?.(kind);
  }, [kind, interactive, home]);

  return (
    <div
      className={`ship-showcase ${className} ${ready ? "is-ready" : ""} ${unavailable ? "is-unavailable" : ""}`}
      role="img"
      aria-label={label}
    >
      {unavailable && (
        <img className="showcase-fallback" src={modelPreviews[kind]} alt="" />
      )}
      <div className="showcase-canvas" ref={hostRef} />
    </div>
  );
};

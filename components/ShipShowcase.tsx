import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { loadShipAsset } from "../render/modelLibrary";
import { HangarTransfer } from "../render/hangarTransfer";
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
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#16202a", 0.009);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
    renderer.setClearColor("#090f17", 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    // 合成链会多次绘制场景；阴影每个展示帧只更新一次。
    renderer.shadowMap.autoUpdate = false;
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
    scene.environmentIntensity = 0.52;
    environmentScene.dispose();
    generator.dispose();

    const hangar = createHangarEnvironment(() => {
      needsRender = true;
    });
    scene.add(hangar.group);
    const transfer = new HangarTransfer(() => {
      host.dataset.phase = transfer.phase;
      host.dataset.shipKind = transfer.currentKind ?? "";
      setReady(transfer.ready);
      needsRender = true;
    });
    scene.add(transfer.group);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChanged = () => {
      if (reducedMotion.matches) transfer.finishImmediately();
      needsRender = true;
    };
    reducedMotion.addEventListener("change", motionChanged);
    // 环境遮蔽只用于展示；环境动作限帧，切机与拖动保持完整刷新率。
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 2,
    });
    const composer = new EffectComposer(renderer, target);
    const renderPass = new RenderPass(scene, camera);
    const ao = new GTAOPass(scene, camera, 1, 1);
    ao.updateGtaoMaterial({
      radius: 0.65,
      thickness: 0.8,
      distanceFallOff: 0.8,
      samples: 8,
      scale: 1,
    });
    ao.updatePdMaterial({ radius: 5, samples: 8 });
    ao.blendIntensity = 0.65;
    const output = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(ao);
    composer.addPass(output);
    const draw = () => {
      renderer.shadowMap.needsUpdate = true;
      composer.render();
    };
    let pointer: { id: number; x: number } | undefined;
    const canvas = renderer.domElement;
    canvas.style.cursor = interactive ? "grab" : "default";
    const pointerDown = (event: PointerEvent) => {
      if (
        !interactive ||
        !transfer.ready ||
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
      transfer.rotateBy(
        ((event.clientX - pointer.x) / Math.max(host.clientWidth, 1)) *
          Math.PI *
          2,
      );
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
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      // 遮蔽为柔和接缝效果，使用较低分辨率；机体轮廓与材质保持完整高分屏像素。
      ao.setSize(
        Math.max(1, Math.round(width * 0.65)),
        Math.max(1, Math.round(height * 0.65)),
      );
      needsRender = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener("resize", resize);
    resize();

    // 等待目标资源就绪再交接；代次保护防止较慢请求覆盖最后一次选择。
    let generation = 0;
    loadRef.current = (nextKind) => {
      const request = ++generation;
      transfer.request(nextKind);
      setReady(false);
      setUnavailable(false);
      delete host.dataset.loadError;
      loadShipAsset(nextKind)
        .then((asset) => {
          if (disposed || request !== generation) return;
          transfer.prepare(nextKind, asset, reducedMotion.matches);
        })
        .catch(() => {
          if (!disposed && request === generation) {
            // 已有机体时保持原机位，失败的加载不能触发离场或清空机库。
            if (!transfer.currentKind) setUnavailable(true);
            host.dataset.loadError = nextKind;
          }
        });
    };
    draw();

    let previous = performance.now();
    let elapsed = 0;
    let lastRender = 0;
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      if (pausedRef.current || document.hidden) {
        previous = now;
        return;
      }
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      elapsed += delta;
      if (
        renderer.getPixelRatio() !==
        Math.min(window.devicePixelRatio || 1, 1.75)
      )
        resize();
      const moving = transfer.update(delta);
      const ambient = hangar.update(
        elapsed,
        delta,
        transfer.busy,
        reducedMotion.matches,
      );
      needsRender ||= moving || ambient;
      if (
        needsRender &&
        (moving || pointer || now - lastRender >= 1000 / 30 - 1)
      ) {
        draw();
        lastRender = now;
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
      reducedMotion.removeEventListener("change", motionChanged);
      transfer.dispose();
      hangar.dispose();
      environment.dispose();
      renderPass.dispose();
      ao.dispose();
      // 当前 Three.js 的 GTAOPass.dispose 尚未覆盖这两个合成材质。
      ao.gtaoMaterial.dispose();
      ao.blendMaterial.dispose();
      output.dispose();
      composer.dispose();
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

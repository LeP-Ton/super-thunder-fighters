import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadShipAsset } from "../render/modelLibrary";
import {
  createParkedDisplay,
  frameParkedDisplay,
} from "../render/parkedDisplay";
import { modelPreviews, ShipKind } from "../render/modelManifest";

interface ShipShowcaseProps {
  kind: ShipKind;
  label: string;
  paused?: boolean;
  interactive?: boolean;
  className?: string;
}

export const ShipShowcase: React.FC<ShipShowcaseProps> = ({
  kind,
  label,
  paused = false,
  interactive = true,
  className = "",
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setReady(false);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }
    let disposed = false;
    let frame = 0;
    let needsRender = true;
    let parkedDisplay: ReturnType<typeof createParkedDisplay> | undefined;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(7.6, 4.8, -9.4);
    renderer.setClearColor(0x000000, 0);
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
    scene.environmentIntensity = 0.48;
    environmentScene.dispose();
    generator.dispose();

    const main = new THREE.DirectionalLight("#e8f2ff", 2.4);
    main.position.set(-3, 8, -4);
    main.castShadow = true;
    main.shadow.mapSize.set(2048, 2048);
    Object.assign(main.shadow.camera, {
      left: -6,
      right: 6,
      top: 6,
      bottom: -6,
      near: 0.1,
      far: 30,
    });
    main.shadow.normalBias = 0.012;
    main.shadow.bias = -0.0001;
    scene.add(main);
    const edge = new THREE.DirectionalLight("#ffb273", 1.6);
    edge.position.set(-6, 3, 7);
    scene.add(edge);
    const fill = new THREE.DirectionalLight("#aecae5", 1.1);
    fill.position.set(6, 1, -3);
    scene.add(fill);

    const floorGeometry = new THREE.PlaneGeometry(32, 32);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.32 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    const turntable = new THREE.Group();
    scene.add(turntable);
    const target = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
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

    const fitCamera = () => {
      if (!parkedDisplay) return;
      // 背景为固定机库透视，只转动战机，地面、标线与光照保持同一方向。
      rotationMatrix.makeRotationY(rotation);
      const points = parkedDisplay.framePoints.map((point) =>
        point.clone().applyMatrix4(rotationMatrix),
      );
      const bounds = new THREE.Box3().setFromPoints(points);
      frameParkedDisplay(camera, bounds, points, target, interactive);
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      camera.aspect = width / height;
      fitCamera();
      camera.updateProjectionMatrix();
      // setSize(false) 只更新渲染缓冲区；CSS 尺寸必须独立，否则 Retina 会放大并裁切。
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      needsRender = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener("resize", resize);
    resize();

    loadShipAsset(kind)
      .then((asset) => {
        if (disposed) return;
        parkedDisplay = createParkedDisplay(asset);
        turntable.add(parkedDisplay.aircraft);
        scene.add(parkedDisplay.markings);
        main.target.position.copy(
          parkedDisplay.bounds.getCenter(new THREE.Vector3()),
        );
        scene.add(main.target);
        resize();
        renderer.render(scene, camera);
        needsRender = false;
        setReady(true);
      })
      .catch(() => {
        /* 保留同源静态预览，避免设备不支持 WebGL 时出现空白。 */
      });

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
        fitCamera();
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
      parkedDisplay?.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      main.shadow.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [kind, interactive]);

  return (
    <div
      className={`ship-showcase ${className} ${ready ? "is-ready" : ""}`}
      role="img"
      aria-label={label}
    >
      <img className="showcase-fallback" src={modelPreviews[kind]} alt="" />
      <div className="showcase-canvas" ref={hostRef} />
    </div>
  );
};

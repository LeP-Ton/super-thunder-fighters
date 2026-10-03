import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { instantiateShip, loadShipAsset } from "../render/modelLibrary";
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
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(7.6, 5.8, -9.4);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
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
    main.shadow.mapSize.set(1024, 1024);
    Object.assign(main.shadow.camera, {
      left: -6,
      right: 6,
      top: 6,
      bottom: -6,
      near: 0.1,
      far: 30,
    });
    main.shadow.normalBias = 0.025;
    scene.add(main);
    const edge = new THREE.DirectionalLight("#ffb273", 1.6);
    edge.position.set(-6, 3, 7);
    scene.add(edge);
    const fill = new THREE.DirectionalLight("#aecae5", 1.1);
    fill.position.set(6, 1, -3);
    scene.add(fill);

    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enabled = interactive;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    controls.autoRotateSpeed = 0.18;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.44;
    controls.target.set(0, 0, 0);
    controls.update();
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    loadShipAsset(kind)
      .then((asset) => {
        if (disposed) return;
        const ship = instantiateShip(asset, 8.6);
        ship.rotation.y = -0.13;
        scene.add(ship);
        floor.position.y =
          (-asset.size.y * (8.6 / Math.max(asset.size.x, asset.size.z))) / 2 -
          0.09;
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
      controls.update(delta);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
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

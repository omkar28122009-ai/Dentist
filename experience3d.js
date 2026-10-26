/* Lightweight Three.js hero sculpture. Gracefully falls back to the SVG tooth when WebGL/CDN is unavailable. */
(function () {
  'use strict';
  let THREE = null;
  let active = null;
  let importPromise = null;
  let frame = 0;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = () => window.matchMedia('(pointer: fine)').matches;

  function loadThree() {
    if (!importPromise) {
      importPromise = import('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js')
        .then(module => (THREE = module))
        .catch(error => { console.warn('3D engine unavailable; using the built-in illustration.', error); return null; });
    }
    return importPromise;
  }
  function makeToothShape() {
    const shape = new THREE.Shape();
    shape.moveTo(-0.62, 0.72);
    shape.bezierCurveTo(-0.98, 0.82, -1.12, 0.48, -1.03, 0.12);
    shape.bezierCurveTo(-0.99, -0.12, -0.80, -0.30, -0.73, -0.62);
    shape.bezierCurveTo(-0.66, -0.94, -0.56, -1.08, -0.40, -1.00);
    shape.bezierCurveTo(-0.21, -0.91, -0.23, -0.48, 0.00, -0.48);
    shape.bezierCurveTo(0.22, -0.48, 0.22, -0.92, 0.42, -1.00);
    shape.bezierCurveTo(0.58, -1.07, 0.67, -0.91, 0.74, -0.60);
    shape.bezierCurveTo(0.82, -0.29, 1.00, -0.11, 1.04, 0.13);
    shape.bezierCurveTo(1.13, 0.49, 0.98, 0.82, 0.62, 0.72);
    shape.bezierCurveTo(0.39, 0.66, 0.22, 0.82, 0.00, 0.82);
    shape.bezierCurveTo(-0.22, 0.82, -0.40, 0.66, -0.62, 0.72);
    return shape;
  }
  function disposeScene() {
    if (!active) return;
    cancelAnimationFrame(frame);
    try { active.resizeObserver?.disconnect(); } catch (_) {}
    try { active.cleanupPointer?.(); } catch (_) {}
    try { active.cleanupResize?.(); } catch (_) {}
    try { active.cleanupScroll?.(); } catch (_) {}
    try { active.host?.classList.remove('is-3d'); } catch (_) {}
    try { active.renderer?.dispose(); } catch (_) {}
    try { active.scene?.traverse(object => { object.geometry?.dispose?.(); if (Array.isArray(object.material)) object.material.forEach(m => m.dispose?.()); else object.material?.dispose?.(); }); } catch (_) {}
    active = null;
  }
  function mount(canvas) {
    if (!THREE || !canvas || !canvas.isConnected) return;
    if (active?.canvas === canvas) return;
    disposeScene();
    const host = canvas.closest('.hero-art');
    if (!host) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (error) {
      console.warn('WebGL renderer unavailable; using the built-in illustration.', error);
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.05, 7.5);
    const rig = new THREE.Group();
    const sculpture = new THREE.Group();
    scene.add(rig);
    rig.add(sculpture);

    const pearl = new THREE.MeshPhysicalMaterial({
      color: 0xf7f3ed, metalness: 0.10, roughness: 0.16, clearcoat: 1,
      clearcoatRoughness: 0.12, sheen: 0.72, sheenColor: new THREE.Color(0xdab9c0),
      emissive: new THREE.Color(0x231820), emissiveIntensity: 0.045
    });
    const toothGeometry = new THREE.ExtrudeGeometry(makeToothShape(), {
      depth: 0.34, steps: 1, bevelEnabled: true, bevelSegments: 5,
      bevelSize: 0.09, bevelThickness: 0.10, curveSegments: 24
    });
    toothGeometry.center();
    const tooth = new THREE.Mesh(toothGeometry, pearl);
    tooth.scale.set(1.06, 1.06, 1.06);
    tooth.rotation.set(-0.12, 0.08, -0.04);
    sculpture.add(tooth);

    const backMaterial = new THREE.MeshPhysicalMaterial({ color: 0xbccfd0, metalness: 0.32, roughness: 0.19, transparent: true, opacity: 0.32, transmission: 0.28, thickness: 0.5, clearcoat: 1 });
    const glassShape = new THREE.Shape();
    glassShape.moveTo(-0.62, 0.68); glassShape.bezierCurveTo(-1.0, 0.75, -1.02, 0.2, -0.76, -0.54);
    glassShape.bezierCurveTo(-0.53, -1.1, -0.23, -0.45, 0, -0.45);
    glassShape.bezierCurveTo(0.22, -0.45, 0.48, -1.12, 0.75, -0.54);
    glassShape.bezierCurveTo(1.01, 0.18, 1.0, 0.76, 0.62, 0.68);
    glassShape.bezierCurveTo(0.36, 0.60, 0.18, 0.74, 0, 0.74);
    glassShape.bezierCurveTo(-0.18, 0.74, -0.37, 0.60, -0.62, 0.68);
    const glassGeom = new THREE.ExtrudeGeometry(glassShape, { depth: 0.13, bevelEnabled: true, bevelSegments: 3, bevelThickness: 0.035, bevelSize: 0.035, curveSegments: 22 });
    glassGeom.center();
    const glassTooth = new THREE.Mesh(glassGeom, backMaterial);
    glassTooth.position.set(0.07, -0.01, -0.22);
    glassTooth.scale.set(1.12, 1.1, 0.82);
    glassTooth.rotation.set(-0.10, 0.23, 0.10);
    sculpture.add(glassTooth);

    const gold = new THREE.MeshStandardMaterial({ color: 0xc9aa78, metalness: 0.92, roughness: 0.18 });
    const teal = new THREE.MeshStandardMaterial({ color: 0x82b0a7, metalness: 0.76, roughness: 0.20 });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.012, 8, 180), gold);
    ringA.rotation.set(1.12, 0.25, -0.34); ringA.scale.set(1.14, 0.88, 1); rig.add(ringA);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.007, 6, 180), teal);
    ringB.rotation.set(0.27, -0.8, 0.36); ringB.scale.set(0.94, 1.03, 1); rig.add(ringB);
    const ringC = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.006, 6, 160), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.16, transparent: true, opacity: 0.64 }));
    ringC.rotation.set(1.48, 0.48, 0.23); rig.add(ringC);
    const ringD = new THREE.Mesh(new THREE.TorusGeometry(2.04, 0.0045, 6, 200), new THREE.MeshStandardMaterial({ color: 0xf4dfc5, metalness: 0.74, roughness: 0.24, transparent: true, opacity: 0.46 }));
    ringD.rotation.set(0.84, -0.35, 0.62); rig.add(ringD);

    // A faint opalescent halo gives the sculpture depth without becoming a solid background.
    const halo = new THREE.Mesh(new THREE.CircleGeometry(2.18, 64), new THREE.MeshBasicMaterial({ color: 0xd9d1ef, transparent: true, opacity: 0.105, depthWrite: false }));
    halo.position.set(0, 0, -0.72); halo.scale.set(1, 1.03, 1); rig.add(halo);

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 32), new THREE.MeshPhysicalMaterial({ color: 0xf6d9ca, roughness: 0.1, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.94 }));
    sphere.position.set(1.48, 0.84, 0.3); rig.add(sphere);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 2), new THREE.MeshPhysicalMaterial({ color: 0xd9d1f0, roughness: 0.12, metalness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08 }));
    orb.position.set(-1.48, -0.78, 0.42); rig.add(orb);

    // Tiny floating gemstone accents make the scene feel designed, not cluttered.
    const crystalGeometry = new THREE.OctahedronGeometry(0.075, 1);
    const crystalMaterials = [
      new THREE.MeshPhysicalMaterial({ color: 0xdac9b0, metalness: 0.62, roughness: 0.18, clearcoat: 1 }),
      new THREE.MeshPhysicalMaterial({ color: 0xb9d7d0, metalness: 0.48, roughness: 0.17, clearcoat: 1 }),
      new THREE.MeshPhysicalMaterial({ color: 0xe7dff4, metalness: 0.36, roughness: 0.16, clearcoat: 1 })
    ];
    const crystalSeeds = [
      { x: 1.63, y: -0.16, z: 0.18, phase: 0.2, scale: 0.88 },
      { x: -1.68, y: 0.54, z: 0.06, phase: 2.1, scale: 0.7 },
      { x: 0.86, y: 1.28, z: -0.02, phase: 4.0, scale: 0.62 }
    ];
    const crystals = crystalSeeds.map((seed, i) => {
      const mesh = new THREE.Mesh(crystalGeometry, crystalMaterials[i]);
      mesh.position.set(seed.x, seed.y, seed.z); mesh.scale.setScalar(seed.scale); rig.add(mesh);
      return { mesh, seed };
    });

    // A secondary orbital path of tiny cut-glass accents adds more cinematic depth,
    // while keeping the geometry light enough for mobile devices.
    const accentGeometry = new THREE.OctahedronGeometry(0.046, 0);
    const accentMaterials = [
      new THREE.MeshPhysicalMaterial({ color: 0xf3d5b6, metalness: 0.78, roughness: 0.17, clearcoat: 1 }),
      new THREE.MeshPhysicalMaterial({ color: 0xc5deda, metalness: 0.66, roughness: 0.17, clearcoat: 1 }),
      new THREE.MeshPhysicalMaterial({ color: 0xe2d8f7, metalness: 0.5, roughness: 0.16, clearcoat: 1 })
    ];
    const orbitingAccents = Array.from({ length: window.innerWidth < 650 ? 6 : 10 }, (_, i) => {
      const seed = { angle: (i / (window.innerWidth < 650 ? 6 : 10)) * Math.PI * 2, radius: 2.02 + (i % 3) * 0.13, phase: i * 0.83, speed: i % 2 ? 0.11 : -0.085 };
      const mesh = new THREE.Mesh(accentGeometry, accentMaterials[i % accentMaterials.length]);
      mesh.scale.setScalar(i % 3 === 0 ? 1.15 : 0.8);
      rig.add(mesh);
      return { mesh, seed };
    });

    const particleCount = window.innerWidth < 650 ? 100 : 210;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 2.25 + Math.random() * 1.65;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = radius * Math.cos(phi) * 0.42;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: window.innerWidth < 650 ? 0.022 : 0.019, transparent: true, opacity: 0.68, sizeAttenuation: true, depthWrite: false }));
    rig.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 1.45));
    const key = new THREE.DirectionalLight(0xffeee0, 3.1); key.position.set(-3, 4, 5); scene.add(key);
    const lavender = new THREE.PointLight(0xb8a7ea, 17, 9); lavender.position.set(3, 1, 1); scene.add(lavender);
    const mint = new THREE.PointLight(0x94ccc0, 10, 8); mint.position.set(-3, -2, 2); scene.add(mint);
    const warmRim = new THREE.PointLight(0xe9c8a6, 7, 8); warmRim.position.set(0, 2.6, -2); scene.add(warmRim);
    // Moving studio spots create a slow sweep of warm/cool highlights over the pearl surface.
    const keySpot = new THREE.SpotLight(0xffd5bd, 16, 12, Math.PI / 5, 0.78, 1.35);
    keySpot.position.set(-3.4, 4.2, 3.6); keySpot.target.position.set(0, 0, 0);
    scene.add(keySpot, keySpot.target);
    const coolSpot = new THREE.SpotLight(0xc8d6ff, 8, 11, Math.PI / 4.4, 0.82, 1.55);
    coolSpot.position.set(3.6, 2.5, 2.4); coolSpot.target.position.set(0, 0, 0);
    scene.add(coolSpot, coolSpot.target);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 650 ? 1.22 : 1.65));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const state = { canvas, host, renderer, scene, camera, rig, sculpture, ringA, ringB, ringC, ringD, particles, sphere, orb, crystals, orbitingAccents, lavender, mint, warmRim, keySpot, coolSpot, resizeObserver: null, pointerX: 0, pointerY: 0, scrollProgress: 0, started: performance.now(), motion: !reducedMotion() };
    active = state;
    host.classList.add('is-3d');
    const resize = () => {
      if (!active || active.canvas !== canvas) return;
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 520 ? 7.9 : width < 800 ? 7.3 : 6.8;
      camera.updateProjectionMatrix();
    };
    if ('ResizeObserver' in window) { state.resizeObserver = new ResizeObserver(resize); state.resizeObserver.observe(host); }
    else { window.addEventListener('resize', resize, { passive: true }); state.cleanupResize = () => window.removeEventListener('resize', resize); }
    const scroll = () => { state.scrollProgress = Math.max(0, Math.min(1, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))); };
    window.addEventListener('scroll', scroll, { passive: true });
    state.cleanupScroll = () => window.removeEventListener('scroll', scroll);
    scroll();
    const pointer = event => {
      if (!finePointer() || reducedMotion()) return;
      const rect = host.getBoundingClientRect();
      state.pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 0.42;
      state.pointerY = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 0.32;
    };
    host.addEventListener('pointermove', pointer, { passive: true });
    state.cleanupPointer = () => host.removeEventListener('pointermove', pointer);
    resize();
    let renderCount = 0;
    const animate = now => {
      if (!active || active.canvas !== canvas || !canvas.isConnected) return;
      frame = requestAnimationFrame(animate);
      renderCount++;
      if (document.hidden && renderCount % 3) return;
      const t = (now - state.started) / 1000;
      const motion = state.motion;
      sculpture.rotation.y += motion ? 0.0018 : 0;
      sculpture.rotation.z = motion ? Math.sin(t * 0.16) * 0.018 : 0;
      sculpture.position.y = motion ? Math.sin(t * 0.48) * 0.026 : 0;
      sculpture.rotation.y += ((state.pointerX * 0.28) - sculpture.rotation.y * 0.025) * (finePointer() ? 0.018 : 0.01);
      sculpture.rotation.x += ((state.pointerY * 0.18) - sculpture.rotation.x * 0.025) * 0.018;
      rig.rotation.y = motion ? Math.sin(t * 0.18) * 0.105 : 0;
      rig.rotation.x = (motion ? Math.cos(t * 0.2) * 0.035 : 0) + state.scrollProgress * 0.035;
      rig.position.y = -state.scrollProgress * 0.11;
      ringA.rotation.z = -0.34 + (motion ? t * 0.064 : 0);
      ringA.rotation.x = 1.12 + (motion ? Math.sin(t * 0.21) * 0.035 : 0);
      ringB.rotation.y = -0.8 + (motion ? Math.sin(t * 0.14) * 0.1 : 0);
      ringC.rotation.z = 0.23 + (motion ? t * -0.035 : 0);
      ringD.rotation.z = 0.62 + (motion ? t * 0.022 : 0);
      ringD.rotation.x = 0.84 + (motion ? Math.sin(t * 0.12) * 0.045 : 0);
      orbitingAccents.forEach(({ mesh, seed }) => {
        const angle = seed.angle + (motion ? t * seed.speed : 0);
        mesh.position.set(Math.cos(angle) * seed.radius, Math.sin(angle) * seed.radius * 0.62 + (motion ? Math.sin(t * 0.5 + seed.phase) * 0.045 : 0), Math.sin(angle * 1.55) * 0.42);
        mesh.rotation.set(motion ? t * 0.22 + seed.phase : 0, motion ? -t * 0.3 + seed.phase : 0, motion ? Math.sin(t * 0.4 + seed.phase) * 0.18 : 0);
      });
      if (motion) {
        keySpot.position.x = -3.4 + Math.sin(t * 0.21) * 0.68;
        keySpot.position.y = 4.2 + Math.cos(t * 0.17) * 0.28;
        coolSpot.position.x = 3.6 + Math.cos(t * 0.18) * 0.72;
        coolSpot.position.y = 2.5 + Math.sin(t * 0.22) * 0.42;
        lavender.position.x = 3 + Math.sin(t * 0.24) * 0.38;
        mint.position.y = -2 + Math.cos(t * 0.27) * 0.32;
        warmRim.position.x = Math.sin(t * 0.2) * 0.45;
      }
      particles.rotation.y = motion ? t * 0.018 : 0;
      sphere.position.y = 0.84 + (motion ? Math.sin(t * 0.8) * 0.08 : 0);
      orb.position.y = -0.78 + (motion ? Math.cos(t * 0.75) * 0.07 : 0);
      crystals.forEach(({ mesh, seed }) => {
        mesh.position.y = seed.y + (motion ? Math.sin(t * 0.62 + seed.phase) * 0.07 : 0);
        mesh.position.x = seed.x + (motion ? Math.cos(t * 0.38 + seed.phase) * 0.035 : 0);
        mesh.rotation.x = motion ? t * 0.18 + seed.phase : 0;
        mesh.rotation.y = motion ? -t * 0.24 + seed.phase : 0;
      });
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    canvas.dataset.ready = 'true';
  }

  async function mountHero() {
    const canvas = document.getElementById('aurelle-hero-canvas');
    if (!canvas) { if (active) disposeScene(); return; }
    if (active?.canvas === canvas) return;
    const module = await loadThree();
    if (module) mount(canvas);
  }
  window.Aurelle3D = { mountHero, dispose: disposeScene };
})();

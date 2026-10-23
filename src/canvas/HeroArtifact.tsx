import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, IcosahedronGeometry, Mesh, PointLight, ShaderMaterial, Vector3, Color } from 'three'
import { useUI } from '../store/store'
import { playCue } from '../audio/engine'
import { scrollStore, damp } from '../store/scrollStore'
import { SIMPLEX_3D_GLSL } from './glsl/noise'

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
varying vec3 vNormalView;
varying vec3 vViewDir;
varying float vDisplacement;

${SIMPLEX_3D_GLSL}

void main() {
  float lowFreq = snoise(position * 0.9 + vec3(0.0, uTime * 0.18, 0.0));
  float midFreq = snoise(position * 2.1 + vec3(uTime * 0.26, 0.0, 0.0));
  float ripple  = snoise(position * 5.4 + vec3(0.0, 0.0, uTime * 1.4));

  float d = lowFreq * 0.24 + midFreq * 0.11 + ripple * uAmp;
  vec3 displaced = position + normal * d;

  vDisplacement = d;
  vNormalView = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

const fragmentShader = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uFade;
uniform vec3 uAccent;
uniform vec3 uBase;
uniform vec3 uHiColor;
varying vec3 vNormalView;
varying vec3 vViewDir;
varying float vDisplacement;

${SIMPLEX_3D_GLSL}

void main() {
  vec3 n = normalize(vNormalView);
  vec3 v = normalize(vViewDir);

  float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.6);

  /* iridescent banding along surface curvature */
  float band = dot(n, normalize(vec3(0.4, 0.9, 0.2))) * 0.5 + 0.5;
  vec3 iri = iridescent(band * 0.35 + vDisplacement * 2.2 + uTime * 0.05);

  /* studio spec highlight */
  vec3 lightDir = normalize(vec3(-0.6, 1.0, 0.7));
  float spec = pow(clamp(dot(reflect(-lightDir, n), v), 0.0, 1.0), 34.0);

  vec3 col = mix(uBase, iri * 0.5 + uBase * 0.8, fresnel * 0.85);
  col = mix(col, uAccent, fresnel * 0.55);
  col += uHiColor * spec * 0.85;
  col += uAccent * max(vDisplacement, 0.0) * 1.35;

  gl_FragColor = vec4(col, clamp(uFade, 0.0, 1.0));
}
`

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * The hero centerpiece â€” a living shader sculpture:
 * vertex-displaced icosahedron with an iridescent fresnel skin, a thin
 * spinning accent ring and orbiting satellite spheres.
 *
 * Reacts to pointer velocity (ripple amplitude + tilt) and to the scroll
 * store (choreographed drift + fade as the user travels the page).
 */
export function HeroArtifact() {
  const groupRef = useRef<Group>(null)
  const ringRef = useRef<Mesh>(null)
  const satRefs = useRef<Array<Mesh | null>>([null, null, null, null])
  const orbRef = useRef<Mesh>(null)
  const orbLightRef = useRef<PointLight>(null)
  const zeroVec = useMemo(() => new Vector3(), [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAmp: { value: 0.02 },
          uFade: { value: 0 },
          uAccent: { value: new Color('#1A2FFB') },
          uBase: { value: new Color('#101024') },
          uHiColor: { value: new Color('#F0F1FA') },
        },
        transparent: true,
        depthWrite: false,
      }),
    [],
  )

  const geometry = useMemo(() => new IcosahedronGeometry(1.5, 40), [])

  const smooth = useRef({ amp: 0, fade: 0, tiltX: 0, tiltY: 0, scale: 0.001 })
  const lastBlobCue = useRef(0)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const { pointerLerped, pointerVelocity, activeSection, entrance } = scrollStore
    const ready = useUI.getState().ready
    const s = smooth.current
    /* phones / portrait tablets: keep the sculpture out of the reading
       column in About, and make it a quieter backdrop under the hero copy */
    const compact = state.size.width < 900

    /* entrance ramp, pushed by the preloader completion */
    const ease = easeOutExpo(entrance)

    /* ripple amplitude rises with pointer speed */
    s.amp = damp(s.amp, ready ? 0.028 + Math.min(pointerVelocity * 0.16, 0.34) : 0, 3.2, dt)
    s.fade = damp(
      s.fade,
      activeSection >= 2 || (activeSection === 1 && compact)
        ? 0
        : ready
          ? compact
            ? 0.52
            : 1
          : 0,
      2.6,
      dt,
    )

    /* the shader blob gets visibly agitated by pointer speed; give that
       excitement a soft, heavily throttled voice of its own */
    if (
      ready &&
      activeSection < 2 &&
      s.fade > 0.45 &&
      pointerVelocity > 1.45 &&
      t - lastBlobCue.current > 1.7
    ) {
      lastBlobCue.current = t
      playCue('blob', { intensity: Math.min(1, pointerVelocity / 3.2) })
    }

    material.uniforms.uTime.value = t
    material.uniforms.uAmp.value = s.amp
    material.uniforms.uFade.value = s.fade
    material.visible = s.fade > 0.012

    /* work / lab / contact: release the artifact entirely. The old
       scale/drift math kept a shrunken remnant floating over the project
       carousel; skipping the loop and hiding the group removes it for good. */
    if (activeSection >= 2) {
      const g = groupRef.current
      if (g) g.visible = false
      return
    }

    /* choreographed drift per section */
    const driftX = activeSection === 1 ? -2.4 : 0
    const driftY = activeSection === 1 ? 0.35 : Math.sin(t * 0.55) * 0.12

    /* tilt toward pointer + slow autonomous spin */
    s.tiltX = damp(s.tiltX, pointerLerped.y * -0.42, 3, dt)
    s.tiltY = damp(s.tiltY, pointerLerped.x * 0.52, 3, dt)

    s.scale = damp(s.scale, (activeSection === 1 ? 0.78 : 1.08) * (0.6 + 0.4 * ease), 2.4, dt)

    const group = groupRef.current
    if (group) {
      group.visible = true
      group.position.x = damp(group.position.x, driftX + pointerLerped.x * 0.25, 2.4, dt)
      group.position.y = damp(group.position.y, driftY + pointerLerped.y * 0.2, 2.4, dt)
      group.rotation.x = damp(group.rotation.x, s.tiltX, 2.6, dt)
      group.rotation.y = damp(group.rotation.y, s.tiltY + t * 0.07, 2.6, dt)
      group.scale.setScalar(Math.max(s.scale, 0.001) * Math.max(s.fade, 0.001))
    }

    /* oblique ring spin */
    const ring = ringRef.current
    if (ring) ring.rotation.set(t * 0.31, t * 0.22, t * 0.14)

    /* orbiting satellites on elliptical paths */
    satRefs.current.forEach((sat, i) => {
      if (!sat) return
      const a = t * (0.5 + i * 0.23) + i * 2.2
      const radius = 2.5 + i * 0.55
      sat.position.set(Math.cos(a) * radius, Math.sin(a * 0.8) * 0.7, Math.sin(a) * radius)
    })

    /* glowing cobalt orb on its sweep path */
    const orb = orbRef.current
    if (orb) {
      const a = t * 0.36
      orb.position.set(Math.cos(a) * -3.4, 1.15 + Math.sin(a * 1.3) * 0.5, Math.sin(a) * -2.6)
      const light = orbLightRef.current
      if (light) light.position.copy(orb.position).add(zeroVec.set(0, 0, 0.6))
    }
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} />

      <mesh ref={ringRef} rotation={[0.6, 0.2, -0.3]}>
        <torusGeometry args={[2.55, 0.012, 12, 220]} />
        <meshStandardMaterial
          color="#1A2FFB"
          emissive="#1A2FFB"
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(m) => { satRefs.current[i] = m ?? null }}>
          <sphereGeometry args={[0.07 + i * 0.022, 24, 24]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#1A2FFB' : '#17172A'}
            roughness={0.18}
            metalness={0.65}
            emissive={i % 2 === 0 ? '#1A2FFB' : '#000000'}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      <mesh ref={orbRef}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#1A2FFB" emissive="#1A2FFB" emissiveIntensity={2.4} roughness={0.2} />
      </mesh>
      <pointLight ref={orbLightRef} color="#4B5BFF" intensity={7} distance={9} decay={2} />
    </group>
  )
}

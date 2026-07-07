import { Suspense, useLayoutEffect, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import { BUILDING_MODEL, ROOM_MODEL_DEFAULT } from '../config/models'

// --- Coordinate mapping constants ---
// These map backend node coordinates (router.py MOCK_GRAPH) into the Three.js
// scene space. Tune these values by inspecting the loaded model's bounding box
// and adjusting until the path overlay aligns with the physical building.

// Scale factor: one backend coordinate unit → N Three.js units.
const SCENE_SCALE = 2.0

// Offset to re-center the backend coordinate space over the model's origin.
const SCENE_OFFSET = { x: -3.0, y: -1.0, z: 0.0 }

// Floor height mapping: floor number → Three.js y-position.
const FLOOR_HEIGHT = {
  1: 0.1,  // Ground floor (just above the base plane)
  2: 1.8,  // Second floor (one storey up)
}

// Convert a backend node's {x, y, floor} into a THREE.Vector3 in scene space.
function nodeToVector3(node) {
  const floorY = FLOOR_HEIGHT[node.floor] ?? 0.0
  return new THREE.Vector3(
    (node.x * SCENE_SCALE) + SCENE_OFFSET.x,
    floorY,
    (node.y * SCENE_SCALE) + SCENE_OFFSET.z,
  )
}

// RouteOverlay — renders the route path as a bright line and node waypoints
// as small glowing spheres. Rebuilt via useMemo whenever routePath changes.
function RouteOverlay({ routePath }) {
  // routePath is the detailed_path array from /api/navigate:
  //   [{ id, name, floor, x, y, comfort_score }, ...]

  const line = useMemo(() => {
    console.log('[ALVIN:RouteOverlay] line useMemo — routePath length:', routePath?.length, routePath)
    if (!routePath || routePath.length < 2) {
      console.warn('[ALVIN:RouteOverlay] line skipped — need at least 2 nodes, got:', routePath?.length ?? 0)
      return null
    }

    // Convert each node into a Vector3.
    const points = routePath.map(nodeToVector3)
    console.log('[ALVIN:RouteOverlay] Three.js points for line:', points.map(p => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`))

    // Build a BufferGeometry line connecting all waypoints.
    const geometry = new THREE.BufferGeometry().setFromPoints(points)

    return (
      <line geometry={geometry}>
        <lineBasicMaterial
          color="#00d4ff"      // Bright cyan for high visibility
          linewidth={3}         // Note: linewidth > 1 only works on some renderers
          transparent
          opacity={0.9}
        />
      </line>
    )
  }, [routePath])

  const spheres = useMemo(() => {
    console.log('[ALVIN:RouteOverlay] spheres useMemo — routePath length:', routePath?.length)
    if (!routePath || routePath.length === 0) {
      console.warn('[ALVIN:RouteOverlay] spheres skipped — empty routePath')
      return null
    }

    // Render a small sphere at each waypoint node.
    return routePath.map((node, i) => {
      const pos = nodeToVector3(node)
      return (
        <mesh key={node.id || i} position={pos}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#00d4ff"
            emissive="#00d4ff"
            emissiveIntensity={1.2}
            transparent
            opacity={0.85}
          />
        </mesh>
      )
    })
  }, [routePath])

  return (
    <group>
      {line}
      {spheres}
    </group>
  )
}

// Loads a GLB and re-centers it on the origin so any model frames nicely
// regardless of how it was exported.
function Model({ url }) {
  const { scene } = useGLTF(url)
  const ref = useRef()

  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    scene.position.sub(center)
  }, [scene])

  return <primitive ref={ref} object={scene} />
}

function Loader() {
  return (
    <Html center>
      <div style={{ color: '#8ca0bd', fontSize: 13 }}>Loading 3D model…</div>
    </Html>
  )
}

export default function BuildingViewer({ url, routePath = [] }) {
  console.log('[ALVIN:BuildingViewer] routePath prop — length:', routePath.length, routePath)
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8, 6, 10], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0b1220']} />
      <Suspense fallback={<Loader />}>
        <Stage environment="city" intensity={0.5} adjustCamera={1.1}>
          <Model url={url} />
          {/* Route overlay is rendered inside Stage so it shares the same
              lighting and transform context as the building model. */}
          <RouteOverlay routePath={routePath} />
        </Stage>
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan
        minDistance={2}
        maxDistance={40}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </Canvas>
  )
}

// Preload the default building + generic room models.
useGLTF.preload(BUILDING_MODEL)
useGLTF.preload(ROOM_MODEL_DEFAULT)

import { Suspense, useLayoutEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import { BUILDING_MODEL, ROOM_MODEL_DEFAULT } from '../config/models'

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

export default function BuildingViewer({ url }) {
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

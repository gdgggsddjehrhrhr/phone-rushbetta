import * as THREE from 'three'
import { GameLoop } from './engine'
import { AudioSystem } from './audio'

export type SceneMode = 'idle' | 'opening' | 'reward' | 'upgrade-win' | 'upgrade-lose'
let command: ((mode: SceneMode, color?: string, accent?: string) => void) | null = null
export function sceneEvent(mode: SceneMode, color?: string, accent?: string) { command?.(mode, color, accent) }
export const audio = new AudioSystem()

declare global { interface Window { __GAME_READY__?: boolean } }
let session: { dispose: () => void } | null = null

export function startGame(canvas: HTMLCanvasElement): void {
  stopGame()
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100)
  camera.position.set(0, .3, 9)
  scene.add(new THREE.AmbientLight(0x93c5fd, 1.3))
  const key = new THREE.DirectionalLight(0xffffff, 4); key.position.set(-4, 6, 5); scene.add(key)
  const rim = new THREE.PointLight(0x8b5cf6, 45, 20); rim.position.set(4, 1, 2); scene.add(rim)
  const cyan = new THREE.PointLight(0x22d3ee, 28, 15); cyan.position.set(-4, -2, 2); scene.add(cyan)

  const root = new THREE.Group(); scene.add(root)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: .82, roughness: .22 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.25, 4.45, .26, 4, 4, 1), bodyMat)
  body.geometry.translate(0, 0, 0); root.add(body)
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.06, 4.24), new THREE.MeshPhysicalMaterial({ color: 0x07111f, metalness: .2, roughness: .08, clearcoat: 1 }))
  glass.position.z = .141; root.add(glass)
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: .75 })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 3.4), screenMat); screen.position.set(0, -.15, .147); root.add(screen)
  const island = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .38, 4, 10), new THREE.MeshBasicMaterial({ color: 0x020617 }))
  island.rotation.z = Math.PI / 2; island.position.set(0, 1.72, .16); root.add(island)
  const cameraMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: .9, roughness: .15 })
  for (const [x,y] of [[-.66,1.55],[-.25,1.55],[-.66,1.12]]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.12,20), cameraMat)
    lens.rotation.x = Math.PI / 2; lens.position.set(x,y,-.19); root.add(lens)
  }
  root.rotation.set(-.12,-.52,-.08)
  root.position.set(4,0,-1.5)

  const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: .16, side: THREE.DoubleSide })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1,.018,6,120), ringMat); ring.position.copy(root.position); ring.rotation.x = 1.1; scene.add(ring)
  const particlesGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(180 * 3)
  for (let i=0;i<180;i++) { positions[i*3]=(Math.random()-.5)*18; positions[i*3+1]=(Math.random()-.5)*10; positions[i*3+2]=-2-Math.random()*8 }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions,3))
  const particles = new THREE.Points(particlesGeo,new THREE.PointsMaterial({color:0x93c5fd,size:.022,transparent:true,opacity:.55})); scene.add(particles)

  let mode: SceneMode = 'idle', modeTime = 0, burst = 0
  command = (next, color, accent) => {
    mode = next; modeTime = 0; burst = 1
    if (color) bodyMat.color.set(color)
    if (accent) { screenMat.color.set(accent); ringMat.color.set(accent) }
  }
  const loop = new GameLoop({ update: dt => {
    modeTime += dt
    const mobile = innerWidth < 800
    root.position.x += ((mobile ? 2.5 : 4) - root.position.x) * .04
    root.position.y = Math.sin(modeTime * .8) * .13
    if (mode === 'opening') { root.rotation.y += dt * 7; root.rotation.z = Math.sin(modeTime*18)*.08 }
    else { root.rotation.y += dt * (mode === 'reward' ? 1.5 : .18); root.rotation.z += (-.08-root.rotation.z)*.08 }
    ring.rotation.z += dt*.12
    particles.rotation.y += dt*.006
    burst = Math.max(0,burst-dt*.45)
    root.scale.setScalar(.58 * (1 + Math.sin(burst*Math.PI)*.16))
    screenMat.opacity = mode === 'upgrade-lose' ? .18 : .7 + Math.sin(modeTime*1.4)*.08
  }, render: () => { renderer.render(scene,camera); window.__GAME_READY__ = true } })
  loop.start()
  const resize = () => { camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight,false) }
  addEventListener('resize',resize)
  session = { dispose: () => {
    loop.stop(); removeEventListener('resize',resize); command=null
    scene.traverse(o=>{ if(o instanceof THREE.Mesh || o instanceof THREE.Points){o.geometry.dispose(); const m=o.material; (Array.isArray(m)?m:[m]).forEach(x=>x.dispose())} })
    renderer.dispose(); window.__GAME_READY__=false
  } }
}
export function stopGame(){ session?.dispose(); session=null }

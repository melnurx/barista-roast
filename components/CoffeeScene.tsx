'use client';
import { Suspense, useEffect, useMemo, useRef, useState, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { CAPACITY, INGREDIENTS, type IngredientId, type Poured, type Recipe } from '@/lib/contracts';

type Props = { recipe: Recipe; poured: Poured; active: IngredientId | null; preview: boolean; stirred: boolean; onReady?: () => void };
const BASE = .48, HEIGHT = 2.95;
const radiusAt = (height: number) => .91 + Math.min(HEIGHT, height) / HEIGHT * .19;
class SceneBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-fallback"><span>☕</span><p>The coffee is still brewing.</p><small>3D is unavailable on this device. Your recipe and roast still work.</small></div> : this.props.children; }
}
function Liquid({ bottom, height, color, mixed, coffee }: {bottom: number; height: number; color: string; mixed: boolean; coffee: boolean}) {
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: .23, metalness: .03 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uMixed = { value: mixed ? 1 : 0 };
      shader.vertexShader = 'varying vec3 vCoffeePos;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoffeePos = position;');
      shader.fragmentShader = 'varying vec3 vCoffeePos; uniform float uTime; uniform float uMixed;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float marbling = sin(vCoffeePos.y * 16.0 + sin(vCoffeePos.x * 9.0 + uTime * .25) * 1.8 + cos(vCoffeePos.z * 8.0) * 2.0);
        float cream = smoothstep(.2, 1.0, marbling) * ${coffee ? '.18' : '.055'};
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.83,.58,.33), cream * (1.0-uMixed*.7));
      `);
      m.userData.shader = shader;
    };
    return m;
  }, [color, coffee, mixed]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({clock}) => { if (material.userData.shader) material.userData.shader.uniforms.uTime.value = clock.elapsedTime; });
  if (height < .002) return null;
  return <mesh position={[0, BASE + bottom + height/2, 0]} material={material} castShadow receiveShadow><cylinderGeometry args={[radiusAt(bottom+height)-.03, radiusAt(bottom)-.03, height, 80, 1]} /></mesh>;
}
function Whipped({y, amount}: {y: number; amount: number}) {
  const geometry = useMemo(() => {
    const points = Array.from({length: 180}, (_,i) => { const t=i/179; const a=t*Math.PI*8; const r=.79*(1-t); return new THREE.Vector3(Math.cos(a)*r,t*.64,Math.sin(a)*r); });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),180,.105,10,false);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[0,y,0]} scale={[1,Math.min(1,amount/25),1]} castShadow><meshStandardMaterial color="#fff0d6" roughness={.65} /></mesh>;
}
function Ice({quantity, level, animate}: {quantity: number; level:number; animate:boolean}) {
  const group=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(group.current && animate) group.current.rotation.y = Math.sin(clock.elapsedTime*.35)*.08;});
  const placements = [[-.46,.12,.3],[.34,.03,.43],[.36,.15,-.32],[-.36,.09,-.31],[0,.35,.02],[.03,-.32,.46],[.52,-.32,-.08],[-.54,-.3,-.1]];
  return <group ref={group} position={[0,Math.min(BASE+HEIGHT-.2,Math.max(BASE+.33,level-.02)),0]}>{placements.slice(0,Math.ceil(Math.min(8,quantity))).map((p,i)=><RoundedBox key={i} args={[.53,.5,.5]} radius={.065} smoothness={3} position={p as [number,number,number]} rotation={[i*.43,.4+i*.65,i*.25]} scale={Math.min(1,Math.max(.05,quantity-i))}><meshPhysicalMaterial color="#f3f2e8" transmission={.55} transparent opacity={.72} roughness={.08} thickness={.5} ior={1.31} envMapIntensity={1.2} /></RoundedBox>)}</group>;
}
function Pour({active, level}: {active: IngredientId;level:number}) {
  const stream=useRef<THREE.Mesh>(null), drops=useRef<THREE.Group>(null), ripple=useRef<THREE.Mesh>(null);
  const color = INGREDIENTS[active].color;
  const top=4.3, bottom=Math.max(BASE+.05,level), length=top-bottom;
  useFrame(({clock})=>{
    const t=clock.elapsedTime;
    if(stream.current) stream.current.scale.x = .9+Math.sin(t*15)*.08;
    if(drops.current) drops.current.children.forEach((c,i)=>{const p=(t*1.9+i*.18)%1;c.position.set(-.29+Math.sin(i*3.2)*p*.32,bottom+Math.sin(p*Math.PI)*.24,Math.cos(i*5.1)*p*.3); c.scale.setScalar((1-p)*.8);});
    if(ripple.current){ripple.current.scale.setScalar(.2+(t*1.8)%1*.8);(ripple.current.material as THREE.MeshStandardMaterial).opacity=1-(t*1.8)%1;}
  });
  if(active==='ice') return null;
  return <group><group position={[-.9,4.38,0]} rotation={[0,0,-.95]}>
    <mesh castShadow><cylinderGeometry args={[.38,.31,.7,48,1,true]}/><meshStandardMaterial color="#b69b79" metalness={.8} roughness={.24} side={THREE.DoubleSide}/></mesh>
    <mesh position={[.31,.28,0]} rotation={[0,0,-.46]}><coneGeometry args={[.15,.35,3]}/><meshStandardMaterial color="#b69b79" metalness={.75} roughness={.25}/></mesh>
    <mesh position={[-.46,0,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.23,.045,10,24]}/><meshStandardMaterial color="#b69b79" metalness={.8} roughness={.24}/></mesh>
    </group><mesh ref={stream} position={[-.29,bottom+length/2,0]}><cylinderGeometry args={[.063,.085,length,12]}/><meshStandardMaterial color={color} roughness={.23}/></mesh>
    <group ref={drops}>{Array.from({length:8},(_,i)=><mesh key={i}><sphereGeometry args={[.045,8,8]}/><meshStandardMaterial color={color} roughness={.3}/></mesh>)}</group>
    <mesh ref={ripple} position={[-.29,bottom+.025,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.5,.015,6,48]}/><meshStandardMaterial color={color} transparent opacity={.5}/></mesh>
  </group>;
}
function Cup({recipe,poured,active,preview,stirred,onReady}: Props) {
  const root=useRef<THREE.Group>(null);
  const quantities=useMemo(()=>preview ? Object.fromEntries(recipe.ingredients.map(i=>[i.id,i.quantity])) as Poured : poured,[preview,recipe.ingredients,poured]);
  const layers = useMemo(()=>{
    let bottom=0;
    return (Object.keys(INGREDIENTS) as IngredientId[]).filter(id=>id!=='ice'&&id!=='whipped').sort((a,b)=>{
      const order=['caramel','vanilla','chocolate','water','oat','milk','almond','soy','matcha','espresso','foam','strawberry'];return order.indexOf(a)-order.indexOf(b);
    }).map(id=>{const height=(quantities[id]??0)*INGREDIENTS[id].ml/CAPACITY[recipe.size]*HEIGHT;const entry={id,bottom,height};bottom+=height;return entry;});
  },[quantities,recipe.size]);
  const fillHeight=layers.reduce((sum,i)=>sum+i.height,0);
  const glassGeometry=useMemo(()=>new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.86,0),new THREE.Vector2(.94,.07),new THREE.Vector2(1.145,3.14),new THREE.Vector2(1.11,3.16),new THREE.Vector2(.9,.15),new THREE.Vector2(0,.15)],96),[]);
  const logo=useMemo(()=>{
    const c=document.createElement('canvas'); c.width=512;c.height=512;const ctx=c.getContext('2d')!;
    ctx.fillStyle='#f5e8ca';ctx.beginPath();ctx.arc(256,256,201,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#4b3929';ctx.lineWidth=4;ctx.beginPath();ctx.arc(256,256,185,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#4b3929';ctx.textAlign='center';ctx.font='bold 32px Georgia';ctx.fillText('BARISTA',256,153);ctx.font='italic 120px Georgia';ctx.fillText('br.',248,287);ctx.font='24px monospace';ctx.fillText('FRESHLY JUDGED',256,354);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[]);
  useEffect(()=>{onReady?.();return()=>{glassGeometry.dispose();logo.dispose();};},[glassGeometry,logo,onReady]);
  useFrame(({clock},dt)=>{if(root.current)root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y,stirred ? clock.elapsedTime*.55 : -.15,3,dt);});
  return <><group ref={root}>
    {layers.map(l=><Liquid key={l.id} bottom={l.bottom} height={l.height} color={stirred&&INGREDIENTS[l.id].kind!=='foam'?'#b78352':INGREDIENTS[l.id].color} mixed={stirred} coffee={l.id==='espresso'||l.id==='matcha'}/>)}
    <Ice quantity={quantities.ice??0} level={BASE+fillHeight} animate={!preview}/>
    {((quantities.whipped??0)>0)&&<Whipped y={BASE+fillHeight+.015} amount={quantities.whipped!}/>}
    <mesh geometry={glassGeometry} position={[0,.33,0]} renderOrder={4}><meshPhysicalMaterial color="#faf2df" transparent opacity={.17} roughness={.13} metalness={.08} clearcoat={1} envMapIntensity={1.8} side={THREE.DoubleSide} depthWrite={false}/></mesh>
    {[.42,3.48].map((y,i)=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]} renderOrder={5}><torusGeometry args={[i?1.125:.906,i?.028:.035,12,96]}/><meshPhysicalMaterial color="#fff4da" transparent opacity={.65} roughness={.1} metalness={.15} depthWrite={false}/></mesh>)}
    {Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return <mesh key={i} position={[Math.sin(a)*1.015,1.88,Math.cos(a)*1.015]} rotation={[Math.cos(a)*.066,0,-Math.sin(a)*.066]} renderOrder={5}><cylinderGeometry args={[.013,.019,2.99,6]}/><meshPhysicalMaterial color="#fff2cf" transparent opacity={.12} roughness={.13} depthWrite={false}/></mesh>;})}
    <mesh position={[.58,1.68,.9]} rotation={[0,.57,0]} renderOrder={6}><planeGeometry args={[1.04,1.04]}/><meshBasicMaterial map={logo} transparent depthWrite={false}/></mesh>
    </group>{active&&<Pour active={active} level={BASE+fillHeight}/>}
    <mesh position={[0,.16,0]} receiveShadow castShadow><cylinderGeometry args={[1.73,1.79,.28,96]}/><meshStandardMaterial color="#c9ae87" roughness={.85}/></mesh>
    <mesh position={[0,.306,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.47,1.49,96]}/><meshStandardMaterial color="#a98b64" roughness={1}/></mesh>
    {[[-1.95,.07,.8],[-2.22,.065,.59],[1.91,.07,.71],[2.17,.07,.41]].map((p,i)=><group key={i} position={p as [number,number,number]} rotation={[.15,i*2,.15]}><mesh scale={[.1,.065,.18]} castShadow><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#684330" roughness={.8}/></mesh><mesh position={[0,.059,0]} scale={[.009,.008,.12]}><sphereGeometry args={[1,8,8]}/><meshStandardMaterial color="#302118"/></mesh></group>)}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.005,0]} receiveShadow><planeGeometry args={[200,200]}/><meshBasicMaterial color="#e9dcc6" toneMapped={false}/></mesh>
    <ContactShadows position={[0,.005,0]} opacity={.35} scale={12} blur={2.4} far={7} resolution={256}/>
  </>;
}
export default function CoffeeScene(props: Props) {
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  if(!mounted) return <div className="scene-loading">Warming up the coffee lab…</div>;
  return <SceneBoundary><Canvas shadows camera={{position:[4.2,4.3,6.8],fov:35}} dpr={[1,1.7]} gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}} aria-label="Interactive 3D coffee glass; drag to rotate">
    <color attach="background" args={['#e9dcc6']}/><ambientLight intensity={1.2}/><directionalLight position={[4,8,5]} intensity={2.8} castShadow shadow-mapSize={[1024,1024]}/><directionalLight position={[-5,5,-3]} intensity={1.5} color="#fff4de"/>
    <Suspense fallback={null}><Environment resolution={128}><Lightformer intensity={3} position={[-4,5,3]} scale={[3,8,1]} rotation={[0,Math.PI/3,0]}/><Lightformer intensity={2} position={[4,4,-2]} scale={[2,6,1]} rotation={[0,-Math.PI/3,0]}/></Environment><Cup {...props}/></Suspense>
    <OrbitControls target={[0,2.15,0]} enableZoom={false} enablePan={false} minPolarAngle={Math.PI/3.3} maxPolarAngle={Math.PI/2.1} rotateSpeed={.65}/>
  </Canvas></SceneBoundary>;
}

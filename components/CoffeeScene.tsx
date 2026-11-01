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
  return <>
    <mesh position={[0, BASE + bottom + height/2, 0]} material={material} castShadow receiveShadow><cylinderGeometry args={[radiusAt(bottom+height)-.03, radiusAt(bottom)-.03, height, 80, 1]} /></mesh>
    {height>.045&&!mixed&&<mesh position={[0,BASE+bottom+height+.008,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[radiusAt(bottom+height)-.052,.012,6,80]}/><meshBasicMaterial color={coffee?'#f5d5ac':'#fff5e1'} transparent opacity={coffee?.28:.18} depthWrite={false}/></mesh>}
  </>;
}
function Surface({height,color,foamy}: {height:number;color:string;foamy:boolean}) {
  const group=useRef<THREE.Group>(null);
  const radius=radiusAt(height)-.045;
  const level=BASE+height+.009;
  useFrame(({clock})=>{if(group.current)group.current.position.y=level+Math.sin(clock.elapsedTime*1.7)*.004;});
  if(height<.01)return null;
  return <group ref={group} position={[0,level,0]}>
    <mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[radius,80]}/><meshPhysicalMaterial color={color} roughness={.2} clearcoat={.8} clearcoatRoughness={.14} side={THREE.DoubleSide}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]}><ringGeometry args={[radius*.68,radius*.7,80]}/><meshBasicMaterial color="#fff9ee" transparent opacity={.26} depthWrite={false} side={THREE.DoubleSide}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[-.21,.018,-.16]} scale={[1,.43,1]}><circleGeometry args={[radius*.27,48]}/><meshBasicMaterial color="#fffdf4" transparent opacity={.14} depthWrite={false} side={THREE.DoubleSide}/></mesh>
    {foamy&&Array.from({length:15},(_,i)=>{const angle=i*2.4, distance=.13+.64*Math.sqrt(i/15);return <mesh key={i} position={[Math.cos(angle)*distance,.024+Math.sin(i*3)*.007,Math.sin(angle)*distance]} scale={[1,.38,1]}><sphereGeometry args={[.035+(i%4)*.004,12,8]}/><meshStandardMaterial color="#fff0e3" roughness={.72}/></mesh>;})}
  </group>;
}
function Whipped({y, amount}: {y: number; amount: number}) {
  const geometry = useMemo(() => {
    const points = Array.from({length: 180}, (_,i) => { const t=i/179; const a=t*Math.PI*8; const r=.79*(1-t); return new THREE.Vector3(Math.cos(a)*r,t*.64,Math.sin(a)*r); });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),180,.105,10,false);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group position={[0,y,0]} scale={[1,Math.min(1,amount/25),1]}>
    <mesh geometry={geometry} castShadow><meshStandardMaterial color="#fff0d6" roughness={.58}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.045,0]} castShadow><torusGeometry args={[.69,.09,10,64]}/><meshStandardMaterial color="#fff0d6" roughness={.58}/></mesh>
    {Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return <mesh key={i} position={[Math.sin(a)*.7,.065,Math.cos(a)*.7]} scale={[1,.56,1]} castShadow><sphereGeometry args={[.075,12,8]}/><meshStandardMaterial color={i%3===0?'#fff5e4':'#f8e7cf'} roughness={.62}/></mesh>;})}
  </group>;
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
  // Keep the spout visible while leaving room for a full 600 ml hot drink.
  const top=3.52, bottom=Math.max(BASE+.05,level), length=top-bottom;
  useFrame(({clock})=>{
    const t=clock.elapsedTime;
    if(stream.current){stream.current.scale.x=.88+Math.sin(t*14)*.045;stream.current.rotation.z=Math.sin(t*2.2)*.012;}
    if(drops.current) drops.current.children.forEach((c,i)=>{const p=(t*1.9+i*.145)%1;c.position.set(-.29+Math.sin(p*8+t+i)*.026,top-p*length,Math.cos(t*2+i*5.1)*.025);c.scale.setScalar(.32+Math.sin(p*Math.PI)*.35);});
    if(ripple.current){const phase=(t*1.8)%1;ripple.current.scale.setScalar(.25+phase*.7);(ripple.current.material as THREE.MeshStandardMaterial).opacity=(1-phase)*(1-phase)*.58;}
  });
  if(active==='ice') return null;
  return <group><group position={[-.9,3.585,0]} rotation={[0,0,-.95]} scale={.7}>
    <mesh castShadow><cylinderGeometry args={[.38,.31,.7,48,1,true]}/><meshStandardMaterial color="#b69b79" metalness={.8} roughness={.24} side={THREE.DoubleSide}/></mesh>
    <mesh position={[.31,.28,0]} rotation={[0,0,-.46]}><coneGeometry args={[.15,.35,3]}/><meshStandardMaterial color="#b69b79" metalness={.75} roughness={.25}/></mesh>
    <mesh position={[-.46,0,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.23,.045,10,24]}/><meshStandardMaterial color="#b69b79" metalness={.8} roughness={.24}/></mesh>
    </group><mesh ref={stream} position={[-.29,bottom+length/2,0]}><cylinderGeometry args={[.058,.08,length,20]}/><meshPhysicalMaterial color={color} roughness={.16} clearcoat={.65} clearcoatRoughness={.12}/></mesh>
    <group ref={drops}>{Array.from({length:8},(_,i)=><mesh key={i}><sphereGeometry args={[.045,8,8]}/><meshStandardMaterial color={color} roughness={.3}/></mesh>)}</group>
    <mesh ref={ripple} position={[-.29,bottom+.025,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.5,.015,6,48]}/><meshStandardMaterial color={color} transparent opacity={.5}/></mesh>
  </group>;
}
function FinishGlint() {
  const group=useRef<THREE.Group>(null), glint=useRef<THREE.Mesh>(null), started=useRef<number|null>(null);
  useFrame(({clock})=>{
    if(!group.current||!glint.current)return;
    if(started.current===null)started.current=clock.elapsedTime;
    const age=clock.elapsedTime-started.current;
    group.current.rotation.y=-Math.PI/2+Math.min(age,2.6)*.52;
    (glint.current.material as THREE.MeshBasicMaterial).opacity=Math.max(0,.62*(1-age/2.6));
  });
  return <group ref={group} position={[0,3.496,0]}><mesh ref={glint} rotation={[-Math.PI/2,0,0]} renderOrder={7}><torusGeometry args={[1.123,.025,8,32,Math.PI*.28]}/><meshBasicMaterial color="#fffdf1" transparent opacity={.62} depthWrite={false}/></mesh></group>;
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
  const topLayer=[...layers].reverse().find(layer=>layer.height>.01);
  const finished=!preview&&!active&&recipe.ingredients.every(item=>(poured[item.id]??0)>=item.quantity-.02);
  const glassGeometry=useMemo(()=>new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.86,0),new THREE.Vector2(.94,.07),new THREE.Vector2(1.145,3.14),new THREE.Vector2(1.11,3.16),new THREE.Vector2(.9,.15),new THREE.Vector2(0,.15)],96),[]);
  const logo=useMemo(()=>{
    const c=document.createElement('canvas'); c.width=512;c.height=512;const ctx=c.getContext('2d')!;
    ctx.fillStyle='#f5e8ca';ctx.beginPath();ctx.arc(256,256,201,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#4b3929';ctx.lineWidth=4;ctx.beginPath();ctx.arc(256,256,185,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#4b3929';ctx.textAlign='center';ctx.font='bold 32px Georgia';ctx.fillText('BARISTA',256,153);ctx.font='italic 120px Georgia';ctx.fillText('br.',248,287);ctx.font='24px monospace';ctx.fillText('FRESHLY JUDGED',256,354);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[]);
  useEffect(()=>{onReady?.();return()=>{glassGeometry.dispose();logo.dispose();};},[glassGeometry,logo,onReady]);
  useFrame(({clock},dt)=>{if(root.current)root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y,stirred ? clock.elapsedTime*.55 : finished ? -.15+Math.sin(clock.elapsedTime*.58)*.065 : -.15,3,dt);});
  return <><group ref={root}>
    {layers.map(l=><Liquid key={l.id} bottom={l.bottom} height={l.height} color={stirred&&INGREDIENTS[l.id].kind!=='foam'?'#b78352':INGREDIENTS[l.id].color} mixed={stirred} coffee={l.id==='espresso'||l.id==='matcha'}/>)}
    {topLayer&&<Surface height={fillHeight} color={INGREDIENTS[topLayer.id].color} foamy={INGREDIENTS[topLayer.id].kind==='foam'&&topLayer.height>.045}/>}
    <Ice quantity={quantities.ice??0} level={BASE+fillHeight} animate={!preview}/>
    {((quantities.whipped??0)>0)&&<Whipped y={BASE+fillHeight+.015} amount={quantities.whipped!}/>}
    <mesh geometry={glassGeometry} position={[0,.33,0]} renderOrder={4}><meshPhysicalMaterial color="#faf2df" transparent opacity={.17} roughness={.13} metalness={.08} clearcoat={1} envMapIntensity={1.8} side={THREE.DoubleSide} depthWrite={false}/></mesh>
    {[[-.08,.18,.18],[1.06,.11,.1]].map(([start,arc,opacity],i)=><mesh key={i} position={[0,1.91,0]} renderOrder={5}><cylinderGeometry args={[1.143,.94,3.08,96,1,true,start,arc]}/><meshBasicMaterial color="#fffdf3" transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide}/></mesh>)}
    {[.42,3.48].map((y,i)=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]} renderOrder={5}><torusGeometry args={[i?1.125:.906,i?.028:.035,12,96]}/><meshPhysicalMaterial color="#fff4da" transparent opacity={.65} roughness={.1} metalness={.15} depthWrite={false}/></mesh>)}
    {finished&&<FinishGlint/>}
    {Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return <mesh key={i} position={[Math.sin(a)*1.015,1.88,Math.cos(a)*1.015]} rotation={[Math.cos(a)*.066,0,-Math.sin(a)*.066]} renderOrder={5}><cylinderGeometry args={[.013,.019,2.99,6]}/><meshPhysicalMaterial color="#fff2cf" transparent opacity={.12} roughness={.13} depthWrite={false}/></mesh>;})}
    <mesh position={[.58,1.68,.9]} rotation={[0,.57,0]} renderOrder={6}><planeGeometry args={[1.04,1.04]}/><meshBasicMaterial map={logo} transparent depthWrite={false}/></mesh>
    </group>{active&&<Pour active={active} level={BASE+fillHeight}/>}
    <mesh position={[0,.16,0]} receiveShadow castShadow><cylinderGeometry args={[1.49,1.54,.28,96]}/><meshStandardMaterial color="#c9ae87" roughness={.85}/></mesh>
    <mesh position={[0,.306,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.27,1.29,96]}/><meshStandardMaterial color="#a98b64" roughness={1}/></mesh>
    {finished&&<mesh position={[0,.312,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.34,1.42,96]}/><meshBasicMaterial color="#fff0c9" transparent opacity={.48} depthWrite={false}/></mesh>}
    {[[-1.95,.07,.8],[-2.22,.065,.59],[1.9,.07,-.4],[2.1,.07,-.6]].map((p,i)=><group key={i} position={p as [number,number,number]} rotation={[.15,i*2,.15]}><mesh scale={[.1,.065,.18]} castShadow><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#684330" roughness={.8}/></mesh><mesh position={[0,.059,0]} scale={[.009,.008,.12]}><sphereGeometry args={[1,8,8]}/><meshStandardMaterial color="#302118"/></mesh></group>)}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.005,0]} receiveShadow><planeGeometry args={[200,200]}/><meshBasicMaterial color="#e9dcc6" toneMapped={false}/></mesh>
    <ContactShadows position={[0,.005,0]} opacity={.35} scale={12} blur={2.4} far={7} resolution={256}/>
  </>;
}
export default function CoffeeScene(props: Props) {
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  if(!mounted) return <div className="scene-loading">Warming up the coffee lab…</div>;
  return <SceneBoundary><Canvas shadows camera={{position:[3.65,3.8,6.1],fov:39}} dpr={[1,1.35]} gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}} aria-label="Interactive 3D coffee glass; drag to rotate">
    <color attach="background" args={['#e9dcc6']}/><ambientLight intensity={1}/><directionalLight position={[4,8,5]} intensity={2.7} castShadow shadow-mapSize={[1024,1024]}/><directionalLight position={[-5,5,-3]} intensity={1.6} color="#fff4de"/>
    <Suspense fallback={null}><Environment resolution={128}><Lightformer intensity={3} position={[-4,5,3]} scale={[3,8,1]} rotation={[0,Math.PI/3,0]}/><Lightformer intensity={2.5} position={[4,4,-2]} scale={[2,6,1]} rotation={[0,-Math.PI/3,0]}/><Lightformer intensity={2} position={[0,7,1]} scale={[6,1,1]}/></Environment><Cup {...props}/></Suspense>
    <OrbitControls target={[0,1.48,0]} enableZoom={false} enablePan={false} minPolarAngle={Math.PI/3.3} maxPolarAngle={Math.PI/2.1} rotateSpeed={.65}/>
  </Canvas></SceneBoundary>;
}

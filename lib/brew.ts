import { DEFAULT_RECIPE, type Poured, type PourStep, type Recipe } from './contracts';
import { makePlan } from './recipe';
export type BrewState = { phase:'idle'|'brewing'|'paused'|'complete'; recipe:Recipe; poured:Poured; plan:PourStep[]; index:number; elapsed:number; changes:number };
export const initialBrew: BrewState = { phase:'idle', recipe:DEFAULT_RECIPE, poured:{}, plan:[], index:0, elapsed:0, changes:0 };
export type BrewAction = {type:'start';recipe:Recipe}|{type:'tick';dt:number}|{type:'pause'}|{type:'resume'}|{type:'revise';recipe:Recipe}|{type:'reset'};
export function brewReducer(state:BrewState,action:BrewAction):BrewState {
  if(action.type==='reset') return {...initialBrew};
  if(action.type==='start') { const plan=makePlan(action.recipe,{}); return {phase:plan.length?'brewing':'complete',recipe:action.recipe,poured:{},plan,index:0,elapsed:0,changes:0}; }
  if(action.type==='pause') return state.phase==='brewing'?{...state,phase:'paused'}:state;
  if(action.type==='resume') return state.phase==='paused'?{...state,phase:'brewing'}:state;
  if(action.type==='revise') { const plan=makePlan(action.recipe,state.poured); return {...state,phase:plan.length?'brewing':'complete',recipe:action.recipe,plan,index:0,elapsed:0,changes:state.changes+1}; }
  if(action.type!=='tick'||state.phase!=='brewing'||!Number.isFinite(action.dt)||action.dt<=0) return state;
  const step=state.plan[state.index]; if(!step) return {...state,phase:'complete'};
  const elapsed=Math.min(step.duration,state.elapsed+Math.min(action.dt,.15));
  const quantity=(state.poured[step.id]??0)+(elapsed-state.elapsed)/step.duration*step.quantity;
  const poured={...state.poured,[step.id]:Math.round(quantity*1e8)/1e8};
  if(elapsed>=step.duration-.00001){const index=state.index+1;return {...state,poured,index,elapsed:0,phase:index>=state.plan.length?'complete':'brewing'};}
  return {...state,poured,elapsed};
}

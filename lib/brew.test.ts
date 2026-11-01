import test from 'node:test';
import assert from 'node:assert/strict';
import { brewReducer, initialBrew, type BrewState } from './brew';
import { parseOrder, reconcileRecipe } from './recipe';
import { SAMPLE_ORDER } from './contracts';
function tick(state:BrewState,seconds:number){for(let i=0;i<seconds*20;i++)state=brewReducer(state,{type:'tick',dt:.05});return state;}
test('pause commits the current partial pour and healthy edits never subtract it',()=>{
  let state=brewReducer(initialBrew,{type:'start',recipe:parseOrder(SAMPLE_ORDER)});
  state=tick(state,4);state=brewReducer(state,{type:'pause'});
  const caramel=state.poured.caramel!;assert.ok(caramel>0&&caramel<6);
  assert.deepEqual(tick(state,2),state);
  const revised=reconcileRecipe(parseOrder('make it healthy',state.recipe),state.poured).recipe;
  state=brewReducer(state,{type:'revise',recipe:revised});state=tick(state,30);
  assert.equal(state.phase,'complete');assert.equal(state.poured.caramel,caramel);
  assert.equal(state.poured.whipped,undefined);assert.equal(state.poured.strawberry,undefined);
});
test('an unmodified brew delivers the complete planned quantities once',()=>{
  const recipe=parseOrder(SAMPLE_ORDER);let state=brewReducer(initialBrew,{type:'start',recipe});state=tick(state,40);
  assert.equal(state.phase,'complete');for(const i of recipe.ingredients)assert.ok(Math.abs(state.poured[i.id]!-i.quantity)<.00001);
  assert.deepEqual(tick(state,1),state);assert.deepEqual(brewReducer(state,{type:'reset'}),initialBrew);
});
test('resuming a paused step adds only its remaining amount',()=>{
  let state=brewReducer(initialBrew,{type:'start',recipe:parseOrder('an iced oat latte with six caramel pumps')});
  state=tick(state,3);state=brewReducer(state,{type:'pause'});state=brewReducer(state,{type:'resume'});state=tick(state,30);
  assert.equal(state.phase,'complete');for(const i of state.recipe.ingredients)assert.ok(Math.abs(state.poured[i.id]!-i.quantity)<.00001);
});

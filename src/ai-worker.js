self.window = self;
importScripts('../vendor/sim.js', 'core.js', 'ai.js');
self.onmessage = (e) => {
  const {id, json} = e.data;
  let res;
  try { res = self.AI.decide(json); } catch (err) { res = {choice: null, error: String(err)}; }
  self.postMessage({id, choice: res.choice, sims: res.sims});
};
self.postMessage({ready: true});

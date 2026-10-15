// Loads the browser scripts into Node so the tools can drive real battles headlessly.
global.window = globalThis; global.self = globalThis;
require('../vendor/sim.js'); require('../src/core.js'); require('../src/ai.js'); require('../src/e4.js');
module.exports = {Core: window.Core, AI: window.AI, E4: window.E4};

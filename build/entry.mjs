// Exposes the engine to the page as window.PS (and self.PS inside the AI worker).
// --keep-names matters: battle cloning (Battle.toJSON/fromJSON) relies on class names.
import {Battle, Dex, PRNG} from '@pkmn/sim';
import {TeamGenerators} from '@pkmn/randoms';
(typeof window !== 'undefined' ? window : self).PS = {Battle, Dex, PRNG, TeamGenerators};

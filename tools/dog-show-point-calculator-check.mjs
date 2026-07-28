import assert from "node:assert/strict";
import {
  akcPointCalculatorBreeds2026,
  akcPointCalculatorStates2026,
  akcBreedPointSchedule2026,
  calculateAkcBreedPointScenarios2026,
} from "../js/dog-show-point-calculator.js";

assert.equal(akcPointCalculatorBreeds2026().length, 217, "The 2026 AKC breed/variety list is incomplete.");
assert.equal(akcPointCalculatorStates2026().length, 53, "The 2026 AKC state/location list is incomplete.");

const texasSiberian = akcBreedPointSchedule2026("TX", "Siberian Huskies");
assert.equal(texasSiberian.division, 7);
assert.deepEqual(texasSiberian.dogs, [2, 4, 5, 8, 13]);
assert.deepEqual(texasSiberian.bitches, [2, 4, 6, 10, 18]);

const divisionOneGolden = akcBreedPointSchedule2026("CT", "Retrievers (Golden)");
assert.equal(divisionOneGolden.division, 1);
assert.deepEqual(divisionOneGolden.dogs, [2, 8, 13, 17, 24]);
assert.deepEqual(divisionOneGolden.bitches, [2, 10, 17, 21, 29]);

const scenarios = calculateAkcBreedPointScenarios2026({
  state: "TX",
  breed: "Siberian Huskies",
  classDogs: 2,
  classBitches: 2,
  championDogs: 2,
  championBitches: 3,
});
assert.deepEqual(scenarios.scenarios.winners, { dogs: 1, bitches: 1 });
assert.deepEqual(scenarios.scenarios.bestOfWinners, { dogs: 1, bitches: 1 });
assert.deepEqual(scenarios.scenarios.bestOfOppositeSex, { dogs: 2, bitches: 2 });
assert.deepEqual(scenarios.scenarios.bestOfWinnersAndOppositeSex, { dogs: 2, bitches: 2 });
assert.deepEqual(scenarios.scenarios.bestOfBreed, { dogs: 3, bitches: 3 });
assert.deepEqual(scenarios.scenarios.bestOfWinnersAndBreed, { dogs: 3, bitches: 3 });

const onePointBow = calculateAkcBreedPointScenarios2026({
  state: "TX",
  breed: "Siberian Huskies",
  classDogs: 1,
  classBitches: 1,
});
assert.deepEqual(onePointBow.scenarios.winners, { dogs: 0, bitches: 0 });
assert.deepEqual(onePointBow.scenarios.bestOfWinners, { dogs: 1, bitches: 1 });

assert.equal(akcBreedPointSchedule2026("XX", "Siberian Huskies"), null);
assert.equal(akcBreedPointSchedule2026("TX", "Not a real breed"), null);

console.log("Dog Show point calculator checks passed.");

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
assert.deepEqual(scenarios.scenarios.special, {
  dogs: { select: 1, bestOfOppositeSex: 2, bestOfBreed: 4 },
  bitches: { select: 2, bestOfOppositeSex: 2, bestOfBreed: 3 },
});

const referenceScenarios = calculateAkcBreedPointScenarios2026({
  state: "TX",
  breed: "Siberian Huskies",
  classDogs: 3,
  classBitches: 5,
  championDogs: 2,
  championBitches: 4,
});
assert.deepEqual(referenceScenarios.outcomes.classDogs, {
  eligible: true,
  winners: 1,
  bestOfWinners: 2,
  bestOfWinnersWhenOppositeWinnerIsBos: 3,
  bestOfOppositeSex: 3,
  bestOfBreed: 4,
});
assert.deepEqual(referenceScenarios.outcomes.specialDogs, {
  eligible: true,
  select: 2,
  bestOfOppositeSex: 3,
  bestOfBreed: 5,
});
assert.deepEqual(referenceScenarios.outcomes.classBitches, {
  eligible: true,
  winners: 2,
  bestOfWinners: 2,
  bestOfWinnersWhenOppositeWinnerIsBos: 3,
  bestOfOppositeSex: 3,
  bestOfBreed: 4,
});
assert.deepEqual(referenceScenarios.outcomes.specialBitches, {
  eligible: true,
  select: 3,
  bestOfOppositeSex: 3,
  bestOfBreed: 4,
});

const onePointBow = calculateAkcBreedPointScenarios2026({
  state: "TX",
  breed: "Siberian Huskies",
  classDogs: 1,
  classBitches: 1,
});
assert.deepEqual(onePointBow.scenarios.winners, { dogs: 0, bitches: 0 });
assert.deepEqual(onePointBow.scenarios.bestOfWinners, { dogs: 1, bitches: 1 });

const noOppositeSex = calculateAkcBreedPointScenarios2026({
  state: "TX",
  breed: "Siberian Huskies",
  classDogs: 3,
  classBitches: 0,
  championDogs: 0,
  championBitches: 2,
});
assert.equal(noOppositeSex.outcomes.classDogs.bestOfWinners, null, "BOW requires Winners in both sexes.");
assert.equal(noOppositeSex.outcomes.classBitches.winners, null, "A missing class entry cannot win WB.");
assert.equal(noOppositeSex.outcomes.specialDogs.select, null, "A missing special cannot win Select Dog.");

assert.equal(akcBreedPointSchedule2026("XX", "Siberian Huskies"), null);
assert.equal(akcBreedPointSchedule2026("TX", "Not a real breed"), null);

console.log("Dog Show point calculator checks passed.");

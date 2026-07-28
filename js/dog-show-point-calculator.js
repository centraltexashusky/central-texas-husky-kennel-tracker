import { DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026 } from "./dog-show-point-data.js?v=20260727-akc-all-breed-calculator";

const AKC_POINT_DIVISION_STATES_2026 = {
  1: ["CT", "ME", "MA", "NH", "RI", "VT"],
  2: ["DE", "NJ", "NY", "PA"],
  3: ["DC", "MD", "NC", "VA", "WV"],
  4: ["FL", "GA", "SC"],
  5: ["IN", "KY", "MI", "OH"],
  6: ["CO", "NV", "UT"],
  7: ["KS", "OK", "TX"],
  8: ["OR", "WA"],
  9: ["AZ", "CA"],
  10: ["AK"],
  11: ["HI"],
  12: ["MX", "PR"],
  13: ["ID", "MT", "NE", "NM", "ND", "SD", "WY"],
  14: ["AL", "AR", "LA", "MS", "TN"],
  15: ["IL", "IA", "MN", "MO", "WI"],
};

function normalizedCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function thresholdsBySex(values = []) {
  return {
    dogs: values.filter((value, index) => index % 2 === 0),
    bitches: values.filter((value, index) => index % 2 === 1),
  };
}

function pointsForCount(count = 0, thresholds = []) {
  return thresholds.reduce((points, threshold, index) => count >= threshold ? index + 1 : points, 0);
}

function bestOfWinnersPoints(dogPoints, bitchPoints, combinedClassCount, onePointThreshold) {
  const points = Math.max(dogPoints, bitchPoints);
  if (points) return points;
  return combinedClassCount >= onePointThreshold ? 1 : 0;
}

export function akcPointCalculatorBreeds2026() {
  return [...DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026.breeds];
}

export function akcPointCalculatorStates2026() {
  return Object.values(AKC_POINT_DIVISION_STATES_2026).flat();
}

export function akcBreedPointSchedule2026(state = "", breed = "") {
  const stateCode = String(state).trim().toUpperCase();
  const divisionEntry = Object.entries(AKC_POINT_DIVISION_STATES_2026)
    .find(([, states]) => states.includes(stateCode));
  if (!divisionEntry || !DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026.breeds.includes(breed)) return null;
  const division = Number(divisionEntry[0]);
  const values = DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026.divisionExceptions[division]?.[breed]
    || DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026.defaultThresholds;
  return {
    year: DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026.year,
    effectiveDate: DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026.effectiveDate,
    state: stateCode,
    division,
    breed,
    ...thresholdsBySex(values),
  };
}

export function calculateAkcBreedPointScenarios2026(input = {}) {
  const schedule = akcBreedPointSchedule2026(input.state, input.breed);
  if (!schedule) return null;
  const counts = {
    classDogs: normalizedCount(input.classDogs),
    classBitches: normalizedCount(input.classBitches),
    championDogs: normalizedCount(input.championDogs),
    championBitches: normalizedCount(input.championBitches),
  };
  const winnersDog = pointsForCount(counts.classDogs, schedule.dogs);
  const winnersBitch = pointsForCount(counts.classBitches, schedule.bitches);
  const combinedClassCount = counts.classDogs + counts.classBitches;
  const bestOfWinners = {
    dogs: bestOfWinnersPoints(winnersDog, winnersBitch, combinedClassCount, schedule.dogs[0]),
    bitches: bestOfWinnersPoints(winnersDog, winnersBitch, combinedClassCount, schedule.bitches[0]),
  };
  const bestOfOppositeSex = {
    dogs: pointsForCount(counts.classDogs + counts.championDogs, schedule.dogs),
    bitches: pointsForCount(counts.classBitches + counts.championBitches, schedule.bitches),
  };
  const bestOfBreed = {
    dogs: pointsForCount(counts.classDogs + counts.championDogs + counts.championBitches, schedule.dogs),
    bitches: pointsForCount(counts.classBitches + counts.championDogs + counts.championBitches, schedule.bitches),
  };
  return {
    schedule,
    counts,
    scenarios: {
      winners: {
        dogs: winnersDog,
        bitches: winnersBitch,
      },
      bestOfWinners,
      bestOfOppositeSex,
      bestOfWinnersAndOppositeSex: {
        dogs: Math.max(bestOfWinners.dogs, bestOfOppositeSex.dogs),
        bitches: Math.max(bestOfWinners.bitches, bestOfOppositeSex.bitches),
      },
      bestOfBreed,
      bestOfWinnersAndBreed: {
        dogs: Math.max(bestOfWinners.dogs, bestOfBreed.dogs),
        bitches: Math.max(bestOfWinners.bitches, bestOfBreed.bitches),
      },
    },
  };
}

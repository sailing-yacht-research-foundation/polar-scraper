export function convertKnotsToSecPerMile(speedKts: number) {
  const speedInSec = speedKts / 3600;
  const secPerMile = 1 / speedInSec;
  return Number(secPerMile.toFixed(1));
}

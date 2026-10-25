export function getDefaultMLBSeason(): number {
  const today = new Date();
  const year = today.getUTCFullYear();

  // Keep the previous season during the offseason.
  // Update this date once the official Opening Day is confirmed.
  const openingDay = new Date(`${year}-04-01T00:00:00Z`);

  return today < openingDay ? year - 1 : year;
}
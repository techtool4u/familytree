/** World events used as context in the Timeline and Time machine. */
export const HISTORY = [
  { a: 1857, b: 1858, label: 'Indian Rebellion of 1857' },
  { a: 1861, b: 1865, label: 'US Civil War' },
  { a: 1903, b: 1903.6, label: 'First powered flight' },
  { a: 1914, b: 1918, label: 'World War I' },
  { a: 1918, b: 1920, label: 'Flu pandemic' },
  { a: 1929, b: 1939, label: 'Great Depression' },
  { a: 1939, b: 1945, label: 'World War II' },
  { a: 1947, b: 1947.6, label: 'Indian independence' },
  { a: 1949, b: 1949.6, label: 'People’s Republic of China founded' },
  { a: 1969, b: 1969.6, label: 'Moon landing' },
  { a: 1989, b: 1989.6, label: 'Berlin Wall falls' },
  { a: 1997, b: 1997.6, label: 'Hong Kong handover' },
  { a: 2007, b: 2007.6, label: 'First iPhone' },
  { a: 2020, b: 2022, label: 'COVID-19' },
];

export function worldContext(year: number) {
  return HISTORY.filter((h) => year >= h.a && year <= Math.floor(h.b)).map((h) => h.label);
}

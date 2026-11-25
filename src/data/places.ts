export interface Place { name: string; country: string; flag: string; lat: number; lon: number }

const P = (name: string, country: string, flag: string, lat: number, lon: number): Place => ({ name, country, flag, lat, lon });

// Small built-in gazetteer: sample places + common world cities so new entries can land on the map.
export const PLACES: Place[] = [
  P('Naples, Italy', 'Italy', '🇮🇹', 40.85, 14.27),
  P('Rome, Italy', 'Italy', '🇮🇹', 41.9, 12.5),
  P('Milan, Italy', 'Italy', '🇮🇹', 45.46, 9.19),
  P('Palermo, Italy', 'Italy', '🇮🇹', 38.12, 13.36),
  P('Cork, Ireland', 'Ireland', '🇮🇪', 51.9, -8.47),
  P('Galway, Ireland', 'Ireland', '🇮🇪', 53.27, -9.05),
  P('Dublin, Ireland', 'Ireland', '🇮🇪', 53.35, -6.26),
  P('London, England', 'United Kingdom', '🇬🇧', 51.51, -0.13),
  P('Manchester, England', 'United Kingdom', '🇬🇧', 53.48, -2.24),
  P('Edinburgh, Scotland', 'United Kingdom', '🇬🇧', 55.95, -3.19),
  P('Boston, USA', 'United States', '🇺🇸', 42.36, -71.06),
  P('New York, USA', 'United States', '🇺🇸', 40.71, -74.0),
  P('Chicago, USA', 'United States', '🇺🇸', 41.88, -87.63),
  P('San Francisco, USA', 'United States', '🇺🇸', 37.77, -122.42),
  P('Seattle, USA', 'United States', '🇺🇸', 47.61, -122.33),
  P('Denver, USA', 'United States', '🇺🇸', 39.74, -104.99),
  P('Los Angeles, USA', 'United States', '🇺🇸', 34.05, -118.24),
  P('Washington, USA', 'United States', '🇺🇸', 38.9, -77.04),
  P('Miami, USA', 'United States', '🇺🇸', 25.76, -80.19),
  P('Houston, USA', 'United States', '🇺🇸', 29.76, -95.37),
  P('Atlanta, USA', 'United States', '🇺🇸', 33.75, -84.39),
  P('Toronto, Canada', 'Canada', '🇨🇦', 43.65, -79.38),
  P('Vancouver, Canada', 'Canada', '🇨🇦', 49.28, -123.12),
  P('Montreal, Canada', 'Canada', '🇨🇦', 45.5, -73.57),
  P('Mexico City, Mexico', 'Mexico', '🇲🇽', 19.43, -99.13),
  P('São Paulo, Brazil', 'Brazil', '🇧🇷', -23.55, -46.63),
  P('Buenos Aires, Argentina', 'Argentina', '🇦🇷', -34.6, -58.38),
  P('Guangzhou, China', 'China', '🇨🇳', 23.13, 113.26),
  P('Shanghai, China', 'China', '🇨🇳', 31.23, 121.47),
  P('Beijing, China', 'China', '🇨🇳', 39.9, 116.4),
  P('Hong Kong', 'Hong Kong', '🇭🇰', 22.32, 114.17),
  P('Taipei, Taiwan', 'Taiwan', '🇹🇼', 25.03, 121.57),
  P('Tokyo, Japan', 'Japan', '🇯🇵', 35.68, 139.69),
  P('Seoul, South Korea', 'South Korea', '🇰🇷', 37.57, 126.98),
  P('Manila, Philippines', 'Philippines', '🇵🇭', 14.6, 120.98),
  P('Mumbai, India', 'India', '🇮🇳', 19.08, 72.88),
  P('Delhi, India', 'India', '🇮🇳', 28.61, 77.21),
  P('Hyderabad, India', 'India', '🇮🇳', 17.39, 78.49),
  P('Chennai, India', 'India', '🇮🇳', 13.08, 80.27),
  P('Bengaluru, India', 'India', '🇮🇳', 12.97, 77.59),
  P('Karachi, Pakistan', 'Pakistan', '🇵🇰', 24.86, 67.0),
  P('Dubai, UAE', 'UAE', '🇦🇪', 25.2, 55.27),
  P('Cairo, Egypt', 'Egypt', '🇪🇬', 30.04, 31.24),
  P('Lagos, Nigeria', 'Nigeria', '🇳🇬', 6.52, 3.38),
  P('Nairobi, Kenya', 'Kenya', '🇰🇪', -1.29, 36.82),
  P('Johannesburg, South Africa', 'South Africa', '🇿🇦', -26.2, 28.05),
  P('Paris, France', 'France', '🇫🇷', 48.86, 2.35),
  P('Berlin, Germany', 'Germany', '🇩🇪', 52.52, 13.4),
  P('Hamburg, Germany', 'Germany', '🇩🇪', 53.55, 9.99),
  P('Madrid, Spain', 'Spain', '🇪🇸', 40.42, -3.7),
  P('Lisbon, Portugal', 'Portugal', '🇵🇹', 38.72, -9.14),
  P('Amsterdam, Netherlands', 'Netherlands', '🇳🇱', 52.37, 4.9),
  P('Stockholm, Sweden', 'Sweden', '🇸🇪', 59.33, 18.07),
  P('Warsaw, Poland', 'Poland', '🇵🇱', 52.23, 21.01),
  P('Athens, Greece', 'Greece', '🇬🇷', 37.98, 23.73),
  P('Sydney, Australia', 'Australia', '🇦🇺', -33.87, 151.21),
  P('Melbourne, Australia', 'Australia', '🇦🇺', -37.81, 144.96),
  P('Auckland, New Zealand', 'New Zealand', '🇳🇿', -36.85, 174.76),
];

// Places the user has located themselves (looked up online or picked on the map).
let custom: Place[] = [];
let byName = new Map<string, Place>();
const rebuild = () => { byName = new Map([...PLACES, ...custom].map((p) => [p.name.toLowerCase().trim(), p])); };
rebuild();
export function setCustomPlaces(list: Place[]) { custom = list; rebuild(); }
export const allPlaces = () => [...custom, ...PLACES];

export function findPlace(name?: string): Place | undefined {
  if (!name) return undefined;
  const k = name.toLowerCase().trim();
  if (byName.has(k)) return byName.get(k);
  // fuzzy: match on city name (before the first comma)
  const city = k.split(',')[0].trim();
  return allPlaces().find((p) => p.name.toLowerCase().split(',')[0].trim() === city);
}

/** 🇮🇳 from "in" */
export const flagFromCode = (cc?: string) => (cc && /^[a-z]{2}$/i.test(cc) ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '');

export function countryOf(name?: string): string | undefined {
  if (!name) return undefined;
  const p = findPlace(name);
  if (p) return p.country;
  const parts = name.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : undefined;
}

export function flagOf(name?: string): string {
  return findPlace(name)?.flag ?? '';
}

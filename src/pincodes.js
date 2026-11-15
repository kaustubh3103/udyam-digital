// Pincode helpers: the mock fibre check and a gentle pincode-to-city check. No data files, so tests can import it.

// Mock serviceability API: deterministic per pincode, tuned to the ~7% of sites in the
// data where fibre was not feasible (about 1 pincode in 14). Ludhiana 141008 or Mumbai 400008 show the AirFiber fallback.
export const fibreAvailable = (pin) => Number(pin) % 14 !== 0;

// First three digits of each city's pincodes (India Post sorting districts), for a gentle "is this the right
// city?" check. Not a full pincode directory: a mismatch only shows a warning, it never blocks the owner.
export const CITY_PIN_PREFIXES = {
  Delhi: ["110"], Mumbai: ["400"], Bengaluru: ["560", "562"], Hyderabad: ["500", "501"], Chennai: ["600", "603"],
  Pune: ["411", "412"], Kolkata: ["700", "711"], Vadodara: ["390", "391"], Kochi: ["682", "683"], Ahmedabad: ["380", "382"],
  Ludhiana: ["141", "142"], Indore: ["452", "453"], Nagpur: ["440", "441"], Lucknow: ["226", "227"], Bhopal: ["462", "463"],
  Jaipur: ["302", "303"], Mysuru: ["570", "571"], Coimbatore: ["641"], Nashik: ["422"], Patna: ["800", "801"],
  Visakhapatnam: ["530", "531"], Surat: ["394", "395"],
};
/** true / false when the city is known, null when it isn't (then no warning). */
export const pinInCity = (pin, city) => {
  const pre = CITY_PIN_PREFIXES[city];
  if (!pre || String(pin).length !== 6) return null;
  return pre.some((p) => String(pin).startsWith(p));
};
/** A pincode in the city's own range where the mock check finds no fibre, for the demo shortcut. */
export const noFibrePinFor = (city) => {
  const pre = CITY_PIN_PREFIXES[city]?.[0] ?? "400";
  for (let n = Number(pre) * 1000 + 1; n < Number(pre) * 1000 + 1000; n++) if (n % 14 === 0) return String(n);
  return "400008";
};

export const DEFAULT_PLACE = { lat: 26.9124, lng: 75.7873, city: 'Jaipur', country: 'India', source: 'default' };

const TIMEOUT_MS = 8000;
const STORE_KEY = 'itsash.location';

const fetchJson = async (url) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const validCoords = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

export const getChoice = () => localStorage.getItem(STORE_KEY);
export const setChoice = (v) => localStorage.setItem(STORE_KEY, v);

export const geoPermission = async () => {
  try {
    return (await navigator.permissions?.query({ name: 'geolocation' }))?.state ?? 'prompt';
  } catch {
    return 'prompt';
  }
};

export const browserLocation = () =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, source: 'gps' }),
      reject,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 6e5 }
    );
  });

export const ipLocation = async () => {
  try {
    const res = await fetchJson('https://get.geojs.io/v1/ip/geo.json');
    const lat = Number.parseFloat(res.latitude);
    const lng = Number.parseFloat(res.longitude);
    if (validCoords(lat, lng)) return { lat, lng, city: res.city || res.region || '', country: res.country || '', source: 'ip' };
  } catch {}
  return DEFAULT_PLACE;
};

export const placeName = async (place) => {
  if (place.city) return place;
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.search = new URLSearchParams({ latitude: place.lat, longitude: place.lng, localityLanguage: 'en' });
    const res = await fetchJson(url);
    return { ...place, city: res.city || res.locality || res.principalSubdivision || '', country: res.countryName || '' };
  } catch {
    return { ...place, city: '', country: '' };
  }
};

export const fetchWeather = async ({ lat, lng }) => {
  if (!validCoords(lat, lng)) throw new Error('Invalid coordinates');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    forecast_days: '1'
  });
  const res = await fetchJson(url);
  const c = res.current ?? {};
  return {
    temp: c.temperature_2m,
    feels: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    code: c.weather_code ?? 0,
    cloudCover: c.cloud_cover ?? 0,
    wind: c.wind_speed_10m ?? 0,
    windDir: c.wind_direction_10m ?? 0,
    timezone: res.timezone,
    sunrise: res.daily?.sunrise?.[0],
    sunset: res.daily?.sunset?.[0]
  };
};

const CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm, hail', 99: 'Thunderstorm, hail'
};

export const describe = (code) => CODES[code] ?? 'Unknown';

export const conditions = (code, cloudCover = 0) => {
  const c = { clouds: Math.min(1, cloudCover / 100), rain: 0, snow: 0, fog: 0, thunder: false };
  if (code === 1) c.clouds = Math.max(c.clouds, 0.2);
  else if (code === 2) c.clouds = Math.max(c.clouds, 0.5);
  else if (code === 3) c.clouds = 1;
  else if (code === 45 || code === 48) Object.assign(c, { clouds: 0.7, fog: 1 });
  else if (code >= 51 && code <= 57) Object.assign(c, { clouds: 0.9, rain: 0.3 });
  else if (code >= 61 && code <= 67) Object.assign(c, { clouds: 1, rain: code === 61 ? 0.5 : code === 63 ? 0.75 : 1 });
  else if (code >= 71 && code <= 77) Object.assign(c, { clouds: 1, snow: code === 71 ? 0.5 : code === 75 ? 1 : 0.75 });
  else if (code >= 80 && code <= 82) Object.assign(c, { clouds: 0.9, rain: code === 82 ? 1 : 0.7 });
  else if (code === 85 || code === 86) Object.assign(c, { clouds: 0.9, snow: 0.8 });
  else if (code >= 95) Object.assign(c, { clouds: 1, rain: 1, thunder: true });
  return c;
};

export const PRESETS = {
  clear: { code: 0, cloudCover: 5, wind: 6 },
  clouds: { code: 3, cloudCover: 90, wind: 14 },
  rain: { code: 63, cloudCover: 100, wind: 18 },
  snow: { code: 73, cloudCover: 100, wind: 8, temp: -3 },
  storm: { code: 95, cloudCover: 100, wind: 35 },
  fog: { code: 45, cloudCover: 70, wind: 3 }
};

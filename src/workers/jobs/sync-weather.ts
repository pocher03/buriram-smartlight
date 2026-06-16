// src/workers/jobs/sync-weather.ts
// CRON: OpenWeatherMap (อุณหภูมิ/ความชื้น/สภาพอากาศ) + Air Pollution (PM2.5)
//       → weather_cache (append ทุก 30 นาที — live adapter อ่านแถวล่าสุด)
//
// GAP ① (master plan): temp/humidity/PM2.5 ไม่มีใน API ต้นทาง → OpenWeather
//   - co2: ไม่มีในแหล่งฟรี → null (UI แสดง --)
//   - ถ้าไม่มี API key → ข้าม (null-safe)

import { prisma } from "../../lib/prisma";
import { getWeatherCoords, OPENWEATHER_API_KEY, PROJECT_ID } from "../lib/config";
import { safeNum } from "../../lib/null-safe";

interface OwmWeather {
  main?: { temp?: number; humidity?: number };
  weather?: Array<{ description?: string }>;
}
interface OwmAir {
  list?: Array<{ components?: { pm2_5?: number } }>;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[sync-weather] HTTP ${res.status} — ข้าม`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[sync-weather] fetch ล้มเหลว: ${(e as Error).message}`);
    return null;
  }
}

export async function syncWeather(): Promise<void> {
  if (!OPENWEATHER_API_KEY) {
    console.warn("[sync-weather] ไม่มี OPENWEATHER_API_KEY → ข้าม");
    return;
  }
  const { lat, lng } = getWeatherCoords();
  const base = "https://api.openweathermap.org/data/2.5";
  const common = `lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}`;

  const [w, air] = await Promise.all([
    getJson<OwmWeather>(`${base}/weather?${common}&units=metric&lang=th`),
    getJson<OwmAir>(`${base}/air_pollution?${common}`),
  ]);

  const temp = safeNum(w?.main?.temp ?? null);
  const humidity = safeNum(w?.main?.humidity ?? null);
  const desc = w?.weather?.[0]?.description ?? null;
  const pm25 = safeNum(air?.list?.[0]?.components?.pm2_5 ?? null);

  await prisma.weatherCache.create({
    data: {
      projectId: PROJECT_ID,
      temp,
      description: desc,
      humidity: humidity != null ? Math.round(humidity) : null,
      pm25: pm25 != null ? Math.round(pm25) : null,
      co2: null, // ไม่มีในแหล่งฟรี
    },
  });

  console.log(`[sync-weather] temp=${temp}°C humidity=${humidity}% pm2.5=${pm25}`);
}

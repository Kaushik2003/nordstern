export const PORT = Number(process.env.PORT ?? 3005);
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://anchor:anchor@db:5432/anchordb';
export const QUOTE_TTL_SECONDS = Number(process.env.QUOTE_TTL_SECONDS ?? 300); // 5 mins
export const HEALTH_CHECK_INTERVAL_MS = Number(process.env.HEALTH_CHECK_INTERVAL_MS ?? 15000); // 15 seconds
export const FEE_REFRESH_INTERVAL_MS = Number(process.env.FEE_REFRESH_INTERVAL_MS ?? 60000); // 60 seconds
export const FX_RATE_INR_USDC = Number(process.env.FX_RATE_INR_USDC ?? 88.50);

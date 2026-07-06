import { pool } from './db.js';
import { calculateBestRoute } from './routing.js';
import { QUOTE_TTL_SECONDS, FX_RATE_INR_USDC } from './config.js';

export interface Quote {
  id: string;
  fiatAmount: number;
  fiatCurrency: string;
  destAsset: string;
  paymentRail: string;
  fxRate: number;
  estimatedFees: number;
  settlementEstMins: number;
  anchorId: string;
  expiresAt: Date;
  reasoning: string;
}

export async function createQuote(
  fiatAmount: number,
  fiatCurrency: string,
  destAsset: string,
  paymentRail: string,
  userRegion?: string
): Promise<Quote> {
  // 1. Calculate optimal route using Routing Engine
  // Convert INR amount to token equivalent for limit evaluation
  const tokenAmt = fiatAmount / FX_RATE_INR_USDC;
  
  const route = await calculateBestRoute(tokenAmt, fiatCurrency, destAsset, paymentRail, userRegion);

  // 2. Compute quote parameters
  const expiresAt = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000);
  
  // Calculate total fees in fiat (INR)
  const estimatedFeesInFiat = route.fees * FX_RATE_INR_USDC;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert Quote
    const quoteRes = await client.query(
      `INSERT INTO aggregator.quotes (fiat_amount, fiat_currency, dest_asset, payment_rail, fx_rate, estimated_fees, settlement_est_mins, anchor_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [fiatAmount, fiatCurrency, destAsset, paymentRail, FX_RATE_INR_USDC, estimatedFeesInFiat, route.settlementMins, route.anchorId, expiresAt]
    );

    const quoteId = quoteRes.rows[0].id;

    // Log Routing Decision for observability
    const scores = {
      score: route.score,
      breakdown: route.breakdown
    };
    await client.query(
      `INSERT INTO aggregator.routing_decisions (quote_id, preferred_anchor_id, scores, reason)
       VALUES ($1, $2, $3, $4)`,
      [quoteId, route.anchorId, scores, route.reasoning]
    );

    await client.query('COMMIT');

    return {
      id: quoteId,
      fiatAmount,
      fiatCurrency,
      destAsset,
      paymentRail,
      fxRate: FX_RATE_INR_USDC,
      estimatedFees: estimatedFeesInFiat,
      settlementEstMins: route.settlementMins,
      anchorId: route.anchorId,
      expiresAt,
      reasoning: route.reasoning
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getQuote(quoteId: string): Promise<any> {
  const { rows } = await pool.query(
    `SELECT q.*, r.reason 
     FROM aggregator.quotes q
     LEFT JOIN aggregator.routing_decisions r ON r.quote_id = q.id
     WHERE q.id = $1`,
    [quoteId]
  );
  if (rows.length === 0) return null;
  return rows[0];
}

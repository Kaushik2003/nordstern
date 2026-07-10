import { pool } from './db.js';

interface ScoringWeights {
  fee: number;
  speed: number;
  uptime: number;
  liquidity: number;
}

export interface RouteResult {
  anchorId: string;
  name: string;
  apiUrl: string;
  fees: number;
  settlementMins: number;
  score: number;
  breakdown: {
    feeScore: number;
    speedScore: number;
    uptimeScore: number;
    liquidityScore: number;
  };
  reasoning: string;
}

export async function calculateBestRoute(
  amount: number,
  currency: string,
  asset: string,
  rail: string,
  region?: string
): Promise<RouteResult> {
  // 1. Fetch active routing policy weights
  const policyRes = await pool.query(
    'SELECT weights FROM aggregator.routing_policies WHERE active = true LIMIT 1'
  );
  const weights: ScoringWeights = policyRes.rows[0]?.weights ?? {
    fee: 0.4,
    speed: 0.2,
    uptime: 0.2,
    liquidity: 0.2,
  };

  // 2. Fetch all active anchors
  const anchorsRes = await pool.query(
    `SELECT * FROM aggregator.anchors 
     WHERE status = 'active' AND current_availability = true`
  );
  
  if (anchorsRes.rows.length === 0) {
    throw new Error('No active anchors found in registry');
  }

  const eligibleAnchors = anchorsRes.rows.filter((anchor) => {
    const caps = anchor.capabilities;
    // Check asset compatibility
    const supportsAsset = caps.supportedAssets?.includes(asset);
    // Check payment rail compatibility
    const supportsRail = caps.supportedRails?.includes(rail);
    // Check regional compatibility
    const supportsRegion = !region || !anchor.regions || anchor.regions.length === 0 || anchor.regions.includes(region);
    // Check treasury limit
    const hasLiquidity = Number(anchor.treasury_capacity) >= amount;

    return supportsAsset && supportsRail && supportsRegion && hasLiquidity;
  });

  if (eligibleAnchors.length === 0) {
    throw new Error('No eligible anchors support the requested asset, rail, region, or amount limits');
  }

  const scoredRoutes: RouteResult[] = [];

  for (const anchor of eligibleAnchors) {
    const caps = anchor.capabilities;
    const feeConfig = anchor.fee_config;

    // A. Fee Calculation
    const fixedFee = Number(feeConfig.fixed ?? 0);
    const percentFee = Number(feeConfig.percent ?? 0);
    const calculatedFee = fixedFee + (amount * percentFee);

    // B. Uptime Score from health history (last 1 hour)
    const healthRes = await pool.query(
      `SELECT api_available, checked_at FROM aggregator.health_metrics 
       WHERE anchor_id = $1 AND checked_at > now() - interval '1 hour'
       ORDER BY checked_at DESC`,
      [anchor.id]
    );
    let uptimeScore = 100;
    if (healthRes.rows.length > 0) {
      const successes = healthRes.rows.filter(h => h.api_available).length;
      uptimeScore = (successes / healthRes.rows.length) * 100;
    }

    // C. Speed / Settlement Score
    const settlementMins = caps.settlementModel === 'instant' ? 5 : 60;
    const speedScore = caps.settlementModel === 'instant' ? 100 : 50;

    // D. Liquidity Headroom Score
    const capacity = Number(anchor.treasury_capacity);
    const liquidityScore = Math.min(100, (capacity / (amount * 5)) * 100);

    // E. Fee Score (relative comparison - handled below once all fees are fetched)
    scoredRoutes.push({
      anchorId: anchor.id,
      name: anchor.name,
      apiUrl: anchor.api_url,
      fees: calculatedFee,
      settlementMins,
      score: 0, // calculated next
      breakdown: {
        feeScore: 0,
        speedScore,
        uptimeScore,
        liquidityScore
      },
      reasoning: ''
    });
  }

  // Calculate Fee Scores relative to the cheapest option
  const minFee = Math.min(...scoredRoutes.map(r => r.fees));
  for (const route of scoredRoutes) {
    // If minFee is 0 and current fee is 0, score is 100. Otherwise relative ratio.
    route.breakdown.feeScore = route.fees === 0 ? 100 : Math.round((minFee / route.fees) * 100);

    // Calculate final weighted score
    route.score = Math.round(
      route.breakdown.feeScore * weights.fee +
      route.breakdown.speedScore * weights.speed +
      route.breakdown.uptimeScore * weights.uptime +
      route.breakdown.liquidityScore * weights.liquidity
    );

    route.reasoning = `Routed to ${route.name} (weighted score: ${route.score}). Breakdown: Fee score = ${route.breakdown.feeScore} (weight: ${weights.fee * 100}%), Speed score = ${route.breakdown.speedScore} (weight: ${weights.speed * 100}%), Uptime score = ${Math.round(route.breakdown.uptimeScore)} (weight: ${weights.uptime * 100}%), Liquidity score = ${Math.round(route.breakdown.liquidityScore)} (weight: ${weights.liquidity * 100}%).`;
  }

  // Sort descending by score
  scoredRoutes.sort((a, b) => b.score - a.score);
  return scoredRoutes[0];
}

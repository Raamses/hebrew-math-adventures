/**
 * difficultyRebalancer.ts — Analyzes GA4 node completion data and recommends
 * per-node difficulty tuning adjustments.
 *
 * Design intent: The GameDirector already handles real-time adaptive difficulty
 * (rescue/challenge modes). This module operates at a higher level — analyzing
 * aggregate player behavior across all users to identify nodes that are
 * systematically too hard or too easy, then recommending config changes
 * that get written back to worldConfig.ts (via the vault).
 *
 * Integration points:
 * - Consumes: GA4 snapshots (node_start, node_complete events per node_id)
 * - Produces: DifficultyRecommendation[] written to vault/decisions/
 * - Consumed by: DifficultyTuningTab (ParentDashboard)
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface NodeCompletionStats {
  nodeId: string;
  nodeType: 'PRACTICE' | 'SENSORY' | 'LESSON' | 'CHALLENGE';
  starts: number;
  completions: number;
  completionRate: number;        // completions / starts
  avgAttemptsToComplete: number; // avg questions answered before completion
  rescueRate: number;            // % of sessions triggering rescue mode
  challengeRate: number;         // % of sessions triggering challenge mode
}

export interface DifficultyRecommendation {
  nodeId: string;
  nodeType: NodeCompletionStats['nodeType'];
  currentRate: number;
  targetRate: number;
  verdict: 'too_hard' | 'too_easy' | 'optimal';
  confidence: 'high' | 'medium' | 'low';
  suggestedChanges: Record<string, any>[];
  reason: string;
}

export interface RebalancerReport {
  generatedAt: string;
  windowDays: number;
  totalNodes: number;
  tooHard: number;
  tooEasy: number;
  optimal: number;
  recommendations: DifficultyRecommendation[];
  summary: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const TARGET_COMPLETION_RATE = 0.70;  // 70% completion rate is ideal
const MIN_SAMPLE_SIZE = 5;            // minimum starts for high confidence
const MED_SAMPLE_SIZE = 10;

// ─── Core Algorithm ─────────────────────────────────────────────────

/**
 * Compute completion stats from GA4 snapshot data.
 * In production, this would parse the actual GA4 Data API response.
 * For now, we derive from the vault/snapshots/ markdown files.
 */
export function computeNodeStats(
  nodeStartCounts: Record<string, number>,
  nodeCompleteCounts: Record<string, number>,
  nodeTypes: Record<string, NodeCompletionStats['nodeType']>,
): NodeCompletionStats[] {
  const stats: NodeCompletionStats[] = [];

  for (const [nodeId, starts] of Object.entries(nodeStartCounts)) {
    const completions = nodeCompleteCounts[nodeId] || 0;
    const rate = starts > 0 ? completions / starts : 0;

    stats.push({
      nodeId,
      nodeType: nodeTypes[nodeId] || 'PRACTICE',
      starts,
      completions,
      completionRate: rate,
      avgAttemptsToComplete: estimateAvgAttempts(nodeId, starts, completions),
      rescueRate: 0,    // placeholder — would come from GA4 custom dimension
      challengeRate: 0, // placeholder — would come from GA4 custom dimension
    });
  }

  return stats.sort((a, b) => a.completionRate - b.completionRate);
}

/**
 * Estimate average attempts per completion based on curriculum level.
 * Deeper nodes in the saga naturally require more attempts.
 */
function estimateAvgAttempts(nodeId: string, starts: number, completions: number): number {
  // Extract unit number from nodeId (e.g., 'n1_3' → unit 1)
  const unitMatch = nodeId.match(/n(\d+)_/);
  const unitNum = unitMatch ? parseInt(unitMatch[1]) : 1;

  // Base: 10 questions per session + 2 per unit level
  return 10 + (unitNum - 1) * 2;
}

/**
 * Generate difficulty recommendations from completion stats.
 *
 * Algorithm:
 * - completionRate < 0.50 → too_hard (reduce difficulty)
 * - completionRate > 0.85 → too_easy (increase difficulty)
 * - 0.50–0.85 → optimal (no change needed)
 *
 * Confidence levels:
 * - high: starts >= MIN_SAMPLE_SIZE
 * - medium: starts >= 3
 * - low: starts < 3 (insufficient data)
 */
export function generateRecommendations(
  stats: NodeCompletionStats[],
): DifficultyRecommendation[] {
  const recommendations: DifficultyRecommendation[] = [];

  for (const node of stats) {
    // Skip nodes with no data
    if (node.starts === 0) continue;

    let verdict: DifficultyRecommendation['verdict'];
    if (node.completionRate < 0.50) {
      verdict = 'too_hard';
    } else if (node.completionRate > 0.85) {
      verdict = 'too_easy';
    } else {
      verdict = 'optimal';
    }

    let confidence: DifficultyRecommendation['confidence'];
    if (node.starts >= MED_SAMPLE_SIZE) {
      confidence = 'high';
    } else if (node.starts >= 3) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    const suggestedChanges = computeSuggestedChanges(node, verdict);

    recommendations.push({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      currentRate: node.completionRate,
      targetRate: TARGET_COMPLETION_RATE,
      verdict,
      confidence,
      suggestedChanges,
      reason: buildReason(node, verdict, confidence),
    });
  }

  return recommendations;
}

/**
 * Compute specific config changes for a node based on verdict.
 *
 * For PRACTICE nodes: adjust max value, add/remove distractors
 * For SENSORY nodes: adjust density, spawnIntervalMs, distractorRatio
 * For CHALLENGE nodes: adjust combo thresholds
 */
function computeSuggestedChanges(
  node: NodeCompletionStats,
  verdict: DifficultyRecommendation['verdict'],
): Record<string, any>[] {
  if (verdict === 'optimal') return [];

  const changes: Record<string, any>[] = [];

  switch (node.nodeType) {
    case 'PRACTICE': {
      if (verdict === 'too_hard') {
        // Reduce max value, simplify problem types
        changes.push({
          max: { '&clamp': { min: 5, max: 50 } },  // type-level op, handled by tab UI
          isRescue: true,
        });
      } else {
        // too_easy: increase max value
        changes.push({
          max: { '&boost': { factor: 1.2 } },
          isChallenge: true,
        });
      }
      break;
    }

    case 'SENSORY': {
      if (verdict === 'too_hard') {
        changes.push({
          density: { '&multiply': { factor: 0.7 } },
          distractorRatio: { '&multiply': { factor: 0.7 } },
          spawnIntervalMs: { '&multiply': { factor: 1.3 } },
          baseVelocity: { '&multiply': { factor: 0.8 } },
        });
      } else {
        changes.push({
          density: { '&multiply': { factor: 1.3 } },
          distractorRatio: { '&add': { value: 1 } },
          spawnIntervalMs: { '&multiply': { factor: 0.8 } },
        });
      }
      break;
    }

    case 'LESSON': {
      // Lessons: adjust step count or hint density
      changes.push({
        stepCount: verdict === 'too_hard' ? { '&set': { value: 3 } } : { '&set': { value: 5 } },
        hintDensity: verdict === 'too_hard' ? { '&set': { value: 0.8 } } : { '&set': { value: 0.3 } },
      });
      break;
    }

    case 'CHALLENGE': {
      // Challenge: adjust combo thresholds
      changes.push({
        comboThreshold: verdict === 'too_hard' ? { '&decrement': { value: 1 } } : { '&increment': { value: 1 } },
      });
      break;
    }
  }

  return changes;
}

function buildReason(
  node: NodeCompletionStats,
  verdict: DifficultyRecommendation['verdict'],
  confidence: DifficultyRecommendation['confidence'],
): string {
  const pct = Math.round(node.completionRate * 100);
  const targetPct = Math.round(TARGET_COMPLETION_RATE * 100);

  if (verdict === 'optimal') {
    return `${node.nodeId}: ${pct}% completion rate is within target range (${targetPct}%). No changes needed.`;
  }

  const direction = verdict === 'too_hard' ? 'below' : 'above';
  return `${node.nodeId}: ${pct}% completion rate is ${direction} ${targetPct}% target. ` +
    `${node.starts} starts, ${node.completions} completions. ` +
    `Confidence: ${confidence}.`;
}

/**
 * Build a full rebalancer report from node stats.
 */
export function buildReport(
  stats: NodeCompletionStats[],
  windowDays: number = 7,
): RebalancerReport {
  const recommendations = generateRecommendations(stats);

  const tooHard = recommendations.filter(r => r.verdict === 'too_hard').length;
  const tooEasy = recommendations.filter(r => r.verdict === 'too_easy').length;
  const optimal = recommendations.filter(r => r.verdict === 'optimal').length;

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    totalNodes: stats.length,
    tooHard,
    tooEasy,
    optimal,
    recommendations,
    summary: `Analyzed ${stats.length} nodes over ${windowDays} days. ` +
      `${tooHard} too hard, ${tooEasy} too easy, ${optimal} optimal.`,
  };
}

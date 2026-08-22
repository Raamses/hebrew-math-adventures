import { describe, it, expect } from 'vitest';
import {
  computeNodeStats,
  generateRecommendations,
  buildReport,
  type NodeCompletionStats,
} from '../lib/difficultyRebalancer';

describe('difficultyRebalancer', () => {
  // ─── Test Data ──────────────────────────────────────────────────

  const sampleStats: NodeCompletionStats[] = [
    { nodeId: 'n1_1', nodeType: 'SENSORY', starts: 50, completions: 45, completionRate: 0.90, avgAttemptsToComplete: 12, rescueRate: 0.05, challengeRate: 0.10 },
    { nodeId: 'n1_2', nodeType: 'PRACTICE', starts: 40, completions: 30, completionRate: 0.75, avgAttemptsToComplete: 11, rescueRate: 0.15, challengeRate: 0.20 },
    { nodeId: 'n1_3', nodeType: 'PRACTICE', starts: 35, completions: 10, completionRate: 0.29, avgAttemptsToComplete: 15, rescueRate: 0.40, challengeRate: 0.05 },
    { nodeId: 'n2_1', nodeType: 'LESSON', starts: 20, completions: 18, completionRate: 0.90, avgAttemptsToComplete: 8, rescueRate: 0.10, challengeRate: 0.15 },
    { nodeId: 'n3_9', nodeType: 'CHALLENGE', starts: 15, completions: 5, completionRate: 0.33, avgAttemptsToComplete: 20, rescueRate: 0.50, challengeRate: 0.02 },
    { nodeId: 'n4_5', nodeType: 'PRACTICE', starts: 2, completions: 2, completionRate: 1.00, avgAttemptsToComplete: 10, rescueRate: 0.00, challengeRate: 0.30 },
  ];

  // ─── computeNodeStats ──────────────────────────────────────────

  describe('computeNodeStats', () => {
    it('should compute stats from start/complete counts', () => {
      const starts: Record<string, number> = { n1_1: 50, n1_2: 40, n1_3: 35 };
      const completes: Record<string, number> = { n1_1: 45, n1_2: 30, n1_3: 10 };
      const types: Record<string, NodeCompletionStats['nodeType']> = { n1_1: 'SENSORY', n1_2: 'PRACTICE', n1_3: 'PRACTICE' };

      const result = computeNodeStats(starts, completes, types);

      expect(result).toHaveLength(3);
      expect(result[0].completionRate).toBeCloseTo(10 / 35, 5); // lowest first
      expect(result[2].completionRate).toBeCloseTo(45 / 50, 5); // highest last
    });

    it('should handle missing complete counts', () => {
      const starts = { n1_1: 50 };
      const completes: Record<string, number> = {};
      const types = { n1_1: 'SENSORY' as const };

      const result = computeNodeStats(starts, completes, types);

      expect(result[0].completions).toBe(0);
      expect(result[0].completionRate).toBe(0);
    });

    it('should sort by completion rate ascending', () => {
      const starts = { a: 10, b: 10, c: 10 };
      const completes = { a: 5, b: 9, c: 1 };
      const types = { a: 'PRACTICE' as const, b: 'PRACTICE' as const, c: 'PRACTICE' as const };

      const result = computeNodeStats(starts, completes, types);

      expect(result[0].nodeId).toBe('c'); // 10%
      expect(result[1].nodeId).toBe('a'); // 50%
      expect(result[2].nodeId).toBe('b'); // 90%
    });
  });

  // ─── generateRecommendations ────────────────────────────────────

  describe('generateRecommendations', () => {
    it('should classify nodes with <50% as too_hard', () => {
      const recs = generateRecommendations(sampleStats);
      const tooHard = recs.filter(r => r.verdict === 'too_hard');

      expect(tooHard.map(r => r.nodeId).sort()).toEqual(['n1_3', 'n3_9']);
    });

    it('should classify nodes with >85% as too_easy', () => {
      const recs = generateRecommendations(sampleStats);
      const tooEasy = recs.filter(r => r.verdict === 'too_easy');

      expect(tooEasy.map(r => r.nodeId).sort()).toEqual(['n1_1', 'n2_1', 'n4_5']);
    });

    it('should classify nodes with 50-85% as optimal', () => {
      const recs = generateRecommendations(sampleStats);
      const optimal = recs.filter(r => r.verdict === 'optimal');

      expect(optimal.map(r => r.nodeId)).toEqual(['n1_2']);
    });

    it('should assign high confidence for nodes with >=10 starts', () => {
      const recs = generateRecommendations(sampleStats);
      const n1_1 = recs.find(r => r.nodeId === 'n1_1')!;
      expect(n1_1.confidence).toBe('high');
    });

    it('should assign low confidence for nodes with <3 starts', () => {
      const recs = generateRecommendations(sampleStats);
      const n4_5 = recs.find(r => r.nodeId === 'n4_5')!;
      expect(n4_5.confidence).toBe('low');
    });

    it('should skip nodes with 0 starts', () => {
      const statsWithZero: NodeCompletionStats[] = [
        { nodeId: 'n9_9', nodeType: 'PRACTICE', starts: 0, completions: 0, completionRate: 0, avgAttemptsToComplete: 0, rescueRate: 0, challengeRate: 0 },
        ...sampleStats,
      ];

      const recs = generateRecommendations(statsWithZero);
      expect(recs.find(r => r.nodeId === 'n9_9')).toBeUndefined();
    });

    it('should generate suggestedChanges for non-optimal nodes', () => {
      const recs = generateRecommendations(sampleStats);
      const tooHard = recs.find(r => r.nodeId === 'n1_3')!;

      expect(tooHard.suggestedChanges.length).toBeGreaterThan(0);
    });

    it('should not generate suggestedChanges for optimal nodes', () => {
      const recs = generateRecommendations(sampleStats);
      const optimal = recs.find(r => r.nodeId === 'n1_2')!;

      expect(optimal.suggestedChanges).toHaveLength(0);
    });

    it('should produce a human-readable reason', () => {
      const recs = generateRecommendations(sampleStats);
      const rec = recs.find(r => r.nodeId === 'n1_3')!;

      expect(rec.reason).toContain('n1_3');
      expect(rec.reason).toContain('29%');
      expect(rec.reason).toContain('70%');
      expect(rec.reason).toContain('too_hard');
    });
  });

  // ─── buildReport ────────────────────────────────────────────────

  describe('buildReport', () => {
    it('should build a complete report', () => {
      const report = buildReport(sampleStats, 7);

      expect(report.totalNodes).toBe(6);
      expect(report.tooHard).toBe(2);
      expect(report.tooEasy).toBe(3);
      expect(report.optimal).toBe(1);
      expect(report.windowDays).toBe(7);
      expect(report.recommendations).toHaveLength(6);
    });

    it('should include ISO timestamp', () => {
      const report = buildReport(sampleStats);

      expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include a summary string', () => {
      const report = buildReport(sampleStats);

      expect(report.summary).toContain('6 nodes');
      expect(report.summary).toContain('2 too hard');
      expect(report.summary).toContain('3 too easy');
      expect(report.summary).toContain('1 optimal');
    });

    it('should handle empty stats', () => {
      const report = buildReport([]);

      expect(report.totalNodes).toBe(0);
      expect(report.tooHard).toBe(0);
      expect(report.recommendations).toHaveLength(0);
    });
  });

  // ─── Suggested changes correctness ──────────────────────────────

  describe('suggestedChanges', () => {
    it('should suggest reducing difficulty for too_hard PRACTICE nodes', () => {
      const stats: NodeCompletionStats[] = [
        { nodeId: 'n1_3', nodeType: 'PRACTICE', starts: 20, completions: 5, completionRate: 0.25, avgAttemptsToComplete: 15, rescueRate: 0.40, challengeRate: 0.05 },
      ];

      const recs = generateRecommendations(stats);
      const change = recs[0].suggestedChanges[0] as any;

      expect(change.isRescue).toBe(true);
    });

    it('should suggest increasing difficulty for too_easy SENSORY nodes', () => {
      const stats: NodeCompletionStats[] = [
        { nodeId: 'n1_1', nodeType: 'SENSORY', starts: 20, completions: 19, completionRate: 0.95, avgAttemptsToComplete: 8, rescueRate: 0.02, challengeRate: 0.20 },
      ];

      const recs = generateRecommendations(stats);
      const change = recs[0].suggestedChanges[0] as any;

      expect(change.density).toBeDefined();
      expect(change.distractorRatio).toBeDefined();
    });
  });
});

/**
 * DifficultyTuningTab.tsx — Parent Dashboard tab for viewing and applying
 * AI-generated difficulty recommendations.
 *
 * Features:
 * - Summary cards (too hard / too easy / optimal counts)
 * - Sortable table of recommendations with confidence indicators
 * - Apply button per recommendation (writes to vault/decisions/)
 * - Visual completion rate bar chart (CSS-only, no external deps)
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { RebalancerReport, DifficultyRecommendation } from '../../lib/difficultyRebalancer';

interface DifficultyTuningTabProps {
  report: RebalancerReport | null;
  onLoadReport: () => void;
  onApply: (rec: DifficultyRecommendation) => void;
}

type SortKey = 'nodeId' | 'currentRate' | 'confidence' | 'verdict';
type SortDir = 'asc' | 'desc';

export const DifficultyTuningTab: React.FC<DifficultyTuningTabProps> = ({
  report,
  onLoadReport,
  onApply,
}) => {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>('currentRate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRecs = useMemo(() => {
    if (!report) return [];
    const recs = [...report.recommendations];
    recs.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'nodeId':
          cmp = a.nodeId.localeCompare(b.nodeId);
          break;
        case 'currentRate':
          cmp = a.currentRate - b.currentRate;
          break;
        case 'confidence':
          cmp = confidenceRank(a.confidence) - confidenceRank(b.confidence);
          break;
        case 'verdict':
          cmp = a.verdict.localeCompare(b.verdict);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return recs;
  }, [report, sortKey, sortDir]);

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">{t('difficulty.noReport', 'No analysis available.')}</p>
        <button
          onClick={onLoadReport}
          className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
        >
          {t('difficulty.runAnalysis', 'Run Analysis')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label={t('difficulty.tooHard', 'Too Hard')}
          count={report.tooHard}
          total={report.totalNodes}
          color="red"
          icon="😰"
        />
        <SummaryCard
          label={t('difficulty.tooEasy', 'Too Easy')}
          count={report.tooEasy}
          total={report.totalNodes}
          color="yellow"
          icon="😴"
        />
        <SummaryCard
          label={t('difficulty.optimal', 'Optimal')}
          count={report.optimal}
          total={report.totalNodes}
          color="green"
          icon="✅"
        />
      </div>

      {/* Report Meta */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          {report.summary}
          <br />
          <span className="text-xs text-slate-400">
            Generated: {new Date(report.generatedAt).toLocaleString('he-IL')}
          </span>
        </p>
      </div>

      {/* Recommendations Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th label={t('difficulty.node', 'Node')} sortKey="nodeId" current={sortKey} dir={sortDir} onClick={handleSort} />
              <Th label={t('difficulty.type', 'Type')} sortKey="verdict" current={sortKey} dir={sortDir} onClick={handleSort} />
              <Th label={t('difficulty.rate', 'Rate')} sortKey="currentRate" current={sortKey} dir={sortDir} onClick={handleSort} />
              <Th label={t('difficulty.confidence', 'Confidence')} sortKey="confidence" current={sortKey} dir={sortDir} onClick={handleSort} />
              <th className="px-4 py-3 text-right font-semibold text-slate-600">
                {t('difficulty.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRecs.map(rec => (
              <React.Fragment key={rec.nodeId}>
                <tr
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedNode(expandedNode === rec.nodeId ? null : rec.nodeId)}
                >
                  <td className="px-4 py-3 font-mono font-bold">{rec.nodeId}</td>
                  <td className="px-4 py-3">
                    <VerdictBadge verdict={rec.verdict} />
                  </td>
                  <td className="px-4 py-3">
                    <CompletionBar rate={rec.currentRate} target={rec.targetRate} />
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge level={rec.confidence} />
                  </td>
                  <td className="px-4 py-3 text-left">
                    {rec.verdict !== 'optimal' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onApply(rec); }}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
                      >
                        {t('difficulty.apply', 'Apply')}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedNode === rec.nodeId && (
                  <tr className="bg-blue-50/50">
                    <td colSpan={5} className="px-6 py-4">
                      <RecommendationDetails rec={rec} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────

function SummaryCard({ label, count, total, color, icon }: {
  label: string;
  count: number;
  total: number;
  color: 'red' | 'yellow' | 'green';
  icon: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colorMap = {
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold">{count}</span>
        <span className="text-sm opacity-70">/ {total} ({pct}%)</span>
      </div>
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: DifficultyRecommendation['verdict'] }) {
  const map = {
    too_hard: { label: 'Too Hard', class: 'bg-red-100 text-red-700' },
    too_easy: { label: 'Too Easy', class: 'bg-yellow-100 text-yellow-700' },
    optimal: { label: 'Optimal', class: 'bg-green-100 text-green-700' },
  };
  const { label, class: cls } = map[verdict];
  return <span className={`px-2 py-1 rounded-full text-xs font-bold ${cls}`}>{label}</span>;
}

function ConfidenceBadge({ level }: { level: DifficultyRecommendation['confidence'] }) {
  const map = {
    high: { label: 'High', class: 'text-green-600' },
    medium: { label: 'Med', class: 'text-yellow-600' },
    low: { label: 'Low', class: 'text-slate-400' },
  };
  const { label, class: cls } = map[level];
  return <span className={`text-xs font-bold ${cls}`}>● {label}</span>;
}

function CompletionBar({ rate }: { rate: number; target?: number }) {
  const pct = Math.round(rate * 100);
  const color = rate < 0.5 ? 'bg-red-400' : rate > 0.85 ? 'bg-yellow-400' : 'bg-green-400';

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono">{pct}%</span>
    </div>
  );
}

function Th({ label, sortKey, current, dir, onClick }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === current;
  return (
    <th
      className="px-4 py-3 text-right font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
      onClick={() => onClick(sortKey)}
    >
      {label}
      {active && <span className="mr-1">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

function RecommendationDetails({ rec }: { rec: DifficultyRecommendation }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-700">{rec.reason}</p>
      {rec.suggestedChanges.length > 0 && (
        <div>
          <p className="font-semibold text-slate-600 mb-1">Suggested Changes:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            {rec.suggestedChanges.map((change, i) => (
              <li key={i} className="font-mono text-xs">{JSON.stringify(change)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-4 text-xs text-slate-500">
        <span>Current: {Math.round(rec.currentRate * 100)}%</span>
        <span>Target: {Math.round(rec.targetRate * 100)}%</span>
        <span className="capitalize">Type: {rec.nodeType}</span>
      </div>
    </div>
  );
}

function confidenceRank(c: DifficultyRecommendation['confidence']): number {
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1;
}

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, RefreshCw, AlertTriangle, TrendingUp, Lightbulb, CheckCircle, Info } from 'lucide-react';
import { aicoachApi } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatDateTime } from '../../utils/format.js';

const typeConfig = {
  WARNING: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  PATTERN: { icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  INSIGHT: { icon: Lightbulb, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  ALERT: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  POSITIVE: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
  INFO: { icon: Info, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/60', border: 'border-gray-200 dark:border-gray-700' },
};

export default function AICoach() {
  const qc = useQueryClient();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['ai-coach'],
    queryFn: () => aicoachApi.latest().then(r => r.data.data),
  });

  const generateMutation = useMutation({
    mutationFn: aicoachApi.generate,
    onSuccess: () => qc.invalidateQueries(['ai-coach']),
  });

  const observations = analysis?.observations ?? [];
  const model = analysis?.model ?? 'deterministic-v1';

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Brain size={18} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Trading Coach</h2>
            {analysis && (
              <p className="text-xs text-gray-400">
                Last generated: {formatDateTime(analysis.generatedAt)} ·{' '}
                <span className={model === 'deterministic-v1' ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}>
                  {model === 'deterministic-v1' ? 'Deterministic analysis' : 'AI-powered analysis'}
                </span>
              </p>
            )}
          </div>
        </div>
        <Button variant="secondary" icon={RefreshCw} loading={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}>
          {analysis ? 'Regenerate' : 'Generate Analysis'}
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <strong>Important:</strong> This AI analysis is for educational purposes only, based on your recorded journal entries. It does not constitute financial or investment advice. All findings are based on data you have entered — the AI does not access real markets.
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading analysis..." />
      ) : !analysis && !generateMutation.isPending ? (
        <div className="card p-10 text-center">
          <Brain size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">No analysis yet</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Record trades in your journal, then click Generate Analysis.</p>
          <Button className="mt-4" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
            Generate Analysis
          </Button>
        </div>
      ) : generateMutation.isPending ? (
        <LoadingSpinner message="Analysing your trading records..." />
      ) : (
        <div className="space-y-3">
          {observations.map((obs, i) => {
            const config = typeConfig[obs.type] ?? typeConfig.INFO;
            const Icon = config.icon;
            return (
              <div key={i} className={`card p-5 border ${config.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <Icon size={16} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{obs.title}</h3>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                        {obs.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{obs.observation}</p>

                    {obs.evidence?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Supporting Evidence</p>
                        <ul className="space-y-0.5">
                          {obs.evidence.map((e, j) => (
                            <li key={j} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                              <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {obs.exercises?.length > 0 && (
                      <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                        <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1.5">Suggested Exercises</p>
                        <ul className="space-y-1">
                          {obs.exercises.map((ex, j) => (
                            <li key={j} className="text-xs text-teal-700 dark:text-teal-300 flex items-start gap-1.5">
                              <span className="text-teal-500 font-bold">{j + 1}.</span>
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

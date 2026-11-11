import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import { learningApi } from '../../services/api.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Empty from '../../components/ui/Empty.jsx';

const diffBadge = { BEGINNER: 'badge-green', INTERMEDIATE: 'badge-amber', ADVANCED: 'badge-red' };

export default function LearningHub() {
  const [selected, setSelected] = useState(null);

  const { data: resources, isLoading } = useQuery({
    queryKey: ['learning-resources'],
    queryFn: () => learningApi.resources().then(r => r.data.data),
  });

  if (selected) return <ResourceView resource={selected} onBack={() => setSelected(null)} />;

  if (isLoading) return <LoadingSpinner />;

  const categories = [...new Set(resources?.map(r => r.category) ?? [])];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Educational articles and guides to improve your trading discipline and risk management.
      </p>
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{cat}</h3>
          <div className="grid gap-3">
            {resources?.filter(r => r.category === cat).map(r => (
              <button key={r.id} onClick={() => setSelected(r)}
                className="card p-4 text-left hover:shadow-card-hover transition-shadow group w-full">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-teal-50 dark:bg-teal-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen size={16} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-teal-700 dark:group-hover:text-teal-400">{r.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={diffBadge[r.difficulty]}>{r.difficulty}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={11} />{r.readingMin} min read
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-teal-500 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {!resources?.length && <Empty title="No resources" message="Learning resources will appear here." />}
    </div>
  );
}

function ResourceView({ resource, onBack }) {
  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="text-sm text-teal-600 dark:text-teal-400 hover:underline mb-4">&larr; Back to Learning Hub</button>
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={diffBadge[resource.difficulty]}>{resource.difficulty}</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} />{resource.readingMin} min read</span>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
          {resource.content.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mb-3">{line.slice(2)}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold mt-5 mb-2">{line.slice(3)}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold mt-4 mb-1">{line.slice(4)}</h3>;
            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-sm my-1">{line.slice(2, -2)}</p>;
            if (line === '') return <br key={i} />;
            return <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}

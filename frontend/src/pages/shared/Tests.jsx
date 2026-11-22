import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Trophy, Clock, CheckCircle, BookOpen, Target, ChevronRight, AlertTriangle } from 'lucide-react';
import { testsApi, scenariosApi } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Empty from '../../components/ui/Empty.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatDateTime } from '../../utils/format.js';

const TABS = ['Platform Assessments', 'Practical Scenarios', 'Assigned', 'Completed'];
const MENTOR_TABS = ['My Tests', 'Platform Library', 'Practical Scenarios', 'My Scenarios'];

export default function Tests() {
  const { user } = useAuth();
  const isMentor = ['MENTOR', 'INSTITUTE'].includes(user?.role);
  const tabs = isMentor ? MENTOR_TABS : TABS;
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [takingTest, setTakingTest] = useState(null);
  const [viewResult, setViewResult] = useState(null);

  if (takingTest) {
    return <TakeTest testId={takingTest.testId} attemptId={takingTest.attemptId}
      onFinish={(r) => { setTakingTest(null); setViewResult(r); }}
      onCancel={() => setTakingTest(null)} />;
  }
  if (viewResult) {
    return <TestResult result={viewResult} onClose={() => setViewResult(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          {isMentor ? 'Create and manage your tests and scenarios. Use the Assignments section to assign them to students.' : 'Platform assessments, practical scenarios, and assigned tests.'}
        </p>
        <div className="flex gap-2">
          {isMentor && activeTab === 'My Tests' && (
            <Button icon={Plus} onClick={() => setShowCreate(true)}>Create Test</Button>
          )}
          {isMentor && activeTab === 'My Scenarios' && (
            <Button icon={Plus} onClick={() => setShowCreateScenario(true)}>Create Scenario</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: 'var(--bg-raised)' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: activeTab === tab ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === tab ? 'var(--text)' : 'var(--text-3)',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Platform Assessments' && (
        <PlatformAssessments onStart={(testId, attemptId) => setTakingTest({ testId, attemptId })} />
      )}
      {activeTab === 'Practical Scenarios' && <PracticalScenarios />}
      {activeTab === 'Assigned' && (
        <AssignedTests onStart={(testId, attemptId) => setTakingTest({ testId, attemptId })} />
      )}
      {activeTab === 'Completed' && <CompletedSection />}
      {activeTab === 'My Tests' && (
        <MentorTests onStart={(testId, attemptId) => setTakingTest({ testId, attemptId })} />
      )}
      {activeTab === 'Platform Library' && <MentorLibrary />}
      {activeTab === 'My Scenarios' && <MentorScenarios />}

      {showCreate && <CreateTestModal onClose={() => setShowCreate(false)} />}
      {showCreateScenario && <CreateScenarioModal onClose={() => setShowCreateScenario(false)} />}
    </div>
  );
}

// ─── Platform Assessments ────────────────────────────────────────────────────

function PlatformAssessments({ onStart }) {
  const [filters, setFilters] = useState({ topic: '', difficulty: '' });
  const { data: attemptsData } = useQuery({
    queryKey: ['tests'],
    queryFn: () => testsApi.list().then(r => r.data.data),
  });
  const { data: platform = [], isLoading } = useQuery({
    queryKey: ['tests-library', filters],
    queryFn: () => testsApi.library(filters).then(r => r.data.data),
  });

  const startMutation = useMutation({
    mutationFn: (testId) => testsApi.startAttempt(testId).then(r => r.data.data),
    onSuccess: (attempt, testId) => onStart(testId, attempt.id),
  });

  if (isLoading) return <LoadingSpinner />;

  const { selfTests = [] } = attemptsData ?? {};
  const attemptMap = {};
  for (const t of selfTests) {
    if (t.latestAttempt) attemptMap[t.id] = t.latestAttempt;
  }

  const topicGroups = platform.reduce((acc, t) => {
    const key = t.topic || 'General';
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  const TOPICS = ['', 'Risk Management', 'Position Sizing', 'Trading Discipline', 'Trading Psychology', 'Market Analysis', 'Technical Analysis', 'Derivatives', 'Intraday Trading'];

  return (
    <div className="space-y-5">
      <div className="p-3 rounded-lg"
        style={{ backgroundColor: 'var(--info-bg)', border: '1px solid rgba(37,99,235,0.2)' }}>
        <p className="text-xs" style={{ color: 'var(--info)' }}>
          <strong>Platform Assessments</strong> are curated MCQ tests covering core trading concepts. Take them to test your knowledge and track your progress.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select className="input w-auto text-sm" value={filters.topic}
          onChange={e => setFilters(f => ({ ...f, topic: e.target.value }))}>
          <option value="">All Topics</option>
          {TOPICS.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filters.difficulty}
          onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value }))}>
          <option value="">All Levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        {(filters.topic || filters.difficulty) && (
          <button className="text-xs underline" style={{ color: 'var(--accent)' }}
            onClick={() => setFilters({ topic: '', difficulty: '' })}>Clear</button>
        )}
      </div>

      {platform.length === 0 ? (
        <Empty title="No platform assessments" message="Platform MCQ assessments will appear here." />
      ) : (
        Object.entries(topicGroups).map(([topic, tests]) => (
          <div key={topic}>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>{topic}</h3>
            <div className="grid gap-3">
              {tests.map(test => {
                const latestAttempt = attemptMap[test.id];
                return (
                  <div key={test.id} className="card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-medium" style={{ color: 'var(--text)' }}>{test.title}</h4>
                          <span className={test.difficulty === 'BEGINNER' ? 'badge-green' : test.difficulty === 'INTERMEDIATE' ? 'badge-amber' : 'badge-red'}>
                            {test.difficulty}
                          </span>
                          {latestAttempt?.status === 'SCORED' && (
                            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--pos)' }}>
                              <CheckCircle size={12} /> {Number(latestAttempt.percentage ?? 0).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {test.questions?.length ?? 0} questions · {test.durationMin} min
                        </p>
                        {test.description && (
                          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-3)' }}>{test.description}</p>
                        )}
                      </div>
                      <Button size="sm"
                        variant={latestAttempt?.status === 'SCORED' ? 'secondary' : 'primary'}
                        icon={Play}
                        loading={startMutation.isPending && startMutation.variables === test.id}
                        onClick={() => startMutation.mutate(test.id)}>
                        {latestAttempt?.status === 'SCORED' ? 'Retake' : 'Start'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Practical Scenarios ─────────────────────────────────────────────────────

function PracticalScenarios() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['scenarios-list'],
    queryFn: () => scenariosApi.list().then(r => r.data.data),
    retry: 2,
  });

  const { data: attemptsData } = useQuery({
    queryKey: ['scenario-attempts'],
    queryFn: () => scenariosApi.myAttempts().then(r => r.data.data),
    retry: 1,
  });

  const scenarioBasePath = user?.role === 'STUDENT' ? '/student/practical-scenarios'
    : user?.role === 'TRADER' ? '/trader/practical-scenarios'
    : user?.role === 'INSTITUTE' ? '/institute/practical-scenarios'
    : '/mentor/practical-scenarios';

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div className="text-sm p-4" style={{ color: 'var(--neg)' }}>Could not load scenarios.</div>
  );

  const scenarios = Array.isArray(data) ? data : [];

  const attemptMap = {};
  if (Array.isArray(attemptsData)) {
    for (const a of attemptsData) {
      if (!attemptMap[a.scenarioId] || a.submittedAt > attemptMap[a.scenarioId].submittedAt) {
        attemptMap[a.scenarioId] = a;
      }
    }
  }

  const byDifficulty = { BEGINNER: [], INTERMEDIATE: [], ADVANCED: [] };
  for (const s of scenarios) {
    (byDifficulty[s.difficulty] || byDifficulty.BEGINNER).push(s);
  }

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg"
        style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid rgba(15,118,110,0.25)' }}>
        <p className="text-xs" style={{ color: 'var(--accent)' }}>
          <strong>Practical Scenarios</strong> present real-world trading situations with synthetic chart data and market news. Make a BUY / SELL / WAIT decision and get scored on reasoning quality, risk management, and news analysis — not just direction.
        </p>
      </div>

      {scenarios.length === 0 ? (
        <Empty title="No scenarios available" message="Practical trading scenarios will appear here when published." />
      ) : (
        Object.entries(byDifficulty).map(([diff, list]) => list.length === 0 ? null : (
          <div key={diff}>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>{diff}</h3>
            <div className="grid gap-3">
              {list.map(s => {
                const attempt = attemptMap[s.id];
                return (
                  <div key={s.id} className="card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-medium" style={{ color: 'var(--text)' }}>{s.title}</h4>
                          <span className="badge-gray">{s.instrument}</span>
                          {s.newsCategory && <span className="badge-blue">{s.newsCategory}</span>}
                          {attempt?.score != null && (
                            <span className="text-xs font-medium"
                              style={{ color: attempt.score >= 60 ? 'var(--pos)' : 'var(--warn)' }}>
                              <CheckCircle size={12} className="inline mr-0.5" />{attempt.score}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-3)' }}>{s.description}</p>
                      </div>
                      <Button size="sm" icon={ChevronRight}
                        variant={attempt?.score != null ? 'secondary' : 'primary'}
                        onClick={() => navigate(`${scenarioBasePath}/${s.id}`)}>
                        {attempt?.score != null ? 'Review' : 'Practise'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Assigned Tests ──────────────────────────────────────────────────────────

function AssignedTests({ onStart }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => testsApi.list().then(r => r.data.data),
  });

  const startMutation = useMutation({
    mutationFn: (testId) => testsApi.startAttempt(testId).then(r => r.data.data),
    onSuccess: (attempt, testId) => onStart(testId, attempt.id),
  });

  if (isLoading) return <LoadingSpinner />;

  const { assigned = [] } = data ?? {};

  if (assigned.length === 0) {
    return <Empty title="No assigned tests" message="Tests assigned by your mentor will appear here." />;
  }

  return (
    <div className="grid gap-3">
      {assigned.filter(a => a.test != null).map(({ test, latestAttempt, dueAt }) => (
        <div key={test.id} className="card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h4 className="font-medium" style={{ color: 'var(--text)' }}>{test.title}</h4>
                <span className={test.difficulty === 'BEGINNER' ? 'badge-green' : test.difficulty === 'INTERMEDIATE' ? 'badge-amber' : 'badge-red'}>
                  {test.difficulty}
                </span>
                {latestAttempt?.status === 'SCORED' && (
                  <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--pos)' }}>
                    <CheckCircle size={12} /> {Number(latestAttempt.percentage ?? 0).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {test.topic} · {test.questions?.length ?? 0} questions · {test.durationMin} min
                {test.creator?.profile && ` · From ${test.creator.profile.firstName} ${test.creator.profile.lastName}`}
              </p>
              {dueAt && (
                <p className="text-xs mt-1" style={{ color: 'var(--warn)' }}>Due: {formatDateTime(dueAt)}</p>
              )}
            </div>
            <Button size="sm" icon={Play}
              variant={latestAttempt?.status === 'SCORED' ? 'secondary' : 'primary'}
              loading={startMutation.isPending && startMutation.variables === test.id}
              onClick={() => startMutation.mutate(test.id)}>
              {latestAttempt?.status === 'SCORED' ? 'Retake' : 'Start'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Completed Section ───────────────────────────────────────────────────────

function CompletedSection() {
  const { data: testsData, isLoading: testsLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => testsApi.list().then(r => r.data.data),
  });

  const { data: attemptsData, isLoading: attemptsLoading } = useQuery({
    queryKey: ['scenario-attempts'],
    queryFn: () => scenariosApi.myAttempts().then(r => r.data.data),
    retry: 1,
  });

  if (testsLoading || attemptsLoading) return <LoadingSpinner />;

  const { assigned = [], selfTests = [] } = testsData ?? {};
  const completedTests = [...assigned.map(a => ({ ...a, source: 'assigned' })),
    ...selfTests.map(t => ({ test: t, latestAttempt: t.latestAttempt, source: 'self' }))]
    .filter(t => t.latestAttempt?.status === 'SCORED');

  const completedScenarios = Array.isArray(attemptsData)
    ? attemptsData.filter(a => a.submittedAt && a.score != null)
    : [];

  if (completedTests.length === 0 && completedScenarios.length === 0) {
    return <Empty title="No completed tests yet" message="Completed MCQ tests and practical scenarios will appear here." />;
  }

  return (
    <div className="space-y-6">
      {completedTests.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>MCQ Tests</h3>
          <div className="grid gap-3">
            {completedTests.map(({ test, latestAttempt }, i) => (
              <div key={test.id + i} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium" style={{ color: 'var(--text)' }}>{test.title}</h4>
                    <span className={Number(latestAttempt.percentage) >= 50 ? 'badge-green' : 'badge-red'}>
                      {Number(latestAttempt.percentage ?? 0).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{test.topic} · {formatDateTime(latestAttempt.submittedAt)}</p>
                </div>
                <Trophy size={16} style={{ color: Number(latestAttempt.percentage) >= 50 ? 'var(--pos)' : 'var(--text-3)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {completedScenarios.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-3)' }}>Practical Scenarios</h3>
          <div className="grid gap-3">
            {completedScenarios.map(attempt => (
              <div key={attempt.id} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium" style={{ color: 'var(--text)' }}>{attempt.scenario?.title ?? 'Scenario'}</h4>
                    <span className={attempt.score >= 60 ? 'badge-green' : 'badge-amber'}>{attempt.score}%</span>
                    <span className="badge-gray">{attempt.decision}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    {attempt.scenario?.instrument} · {formatDateTime(attempt.submittedAt)}
                  </p>
                </div>
                <Target size={16} style={{ color: attempt.score >= 60 ? 'var(--accent)' : 'var(--text-3)' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mentor Tests ────────────────────────────────────────────────────────────

function MentorTests({ onStart }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => testsApi.list().then(r => r.data.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id) => testsApi.publish(id),
    onSuccess: () => qc.invalidateQueries(['tests']),
  });

  if (isLoading) return <LoadingSpinner />;

  const tests = Array.isArray(data) ? data : [];

  if (tests.length === 0) {
    return <Empty title="No tests created" message="Create your first test to assign to students." />;
  }

  return (
    <div className="grid gap-4">
      {tests.map(test => (
        <div key={test.id} className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{test.title}</h3>
                <span className={test.status === 'PUBLISHED' ? 'badge-green' : 'badge-amber'}>{test.status}</span>
                {test.isSelfTest && <span className="badge-blue">Self-test</span>}
                {test.isSystem && <span className="badge-gray">Platform</span>}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                {test.topic} · {test.difficulty} · {test.durationMin} min · {test.questions?.length ?? 0} questions
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {test.status === 'DRAFT' && (
                <Button size="xs" onClick={() => publishMutation.mutate(test.id)}
                  loading={publishMutation.isPending && publishMutation.variables === test.id}>Publish</Button>
              )}
              <span className="badge-gray">{test.attempts?.length ?? 0} attempts</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Mentor Library ───────────────────────────────────────────────────────────

function MentorLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ topic: '', difficulty: '' });

  const { data: library = [], isLoading } = useQuery({
    queryKey: ['tests-library', filters],
    queryFn: () => testsApi.library(filters).then(r => r.data.data),
  });

  const TOPICS = ['Risk Management', 'Position Sizing', 'Trading Discipline', 'Trading Psychology', 'Market Analysis', 'Technical Analysis', 'Derivatives', 'Intraday Trading'];

  const assignmentsPath = user?.role === 'INSTITUTE' ? '/institute/assignments' : '/mentor/assignments';

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="p-3 rounded-lg"
        style={{ backgroundColor: 'var(--badge-purple-bg)', border: '1px solid rgba(109,40,217,0.2)' }}>
        <p className="text-xs" style={{ color: 'var(--badge-purple-color)' }}>
          <strong>Platform Library</strong> — browse all built-in assessments. To assign a test to students, go to{' '}
          <button className="underline font-medium" onClick={() => navigate(assignmentsPath)}>Assignments</button>.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select className="input w-auto text-sm" value={filters.topic}
          onChange={e => setFilters(f => ({ ...f, topic: e.target.value }))}>
          <option value="">All Topics</option>
          {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filters.difficulty}
          onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value }))}>
          <option value="">All Levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        {(filters.topic || filters.difficulty) && (
          <button className="text-xs underline" style={{ color: 'var(--accent)' }}
            onClick={() => setFilters({ topic: '', difficulty: '' })}>Clear</button>
        )}
      </div>

      {library.length === 0 ? (
        <Empty title="No tests found" message="Adjust your filters to find platform assessments." />
      ) : (
        <div className="grid gap-3">
          {library.map(test => (
            <div key={test.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-medium" style={{ color: 'var(--text)' }}>{test.title}</h4>
                    <span className={test.difficulty === 'BEGINNER' ? 'badge-green' : test.difficulty === 'INTERMEDIATE' ? 'badge-amber' : 'badge-red'}>
                      {test.difficulty}
                    </span>
                    <span className="badge-blue">{test.topic}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {test.questions?.length ?? 0} questions · {test.durationMin} min
                  </p>
                  {test.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-3)' }}>{test.description}</p>
                  )}
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate(assignmentsPath, { state: { preselectedTestId: test.id } })}>
                  Assign
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TakeTest ─────────────────────────────────────────────────────────────────

function TakeTest({ testId, attemptId, onFinish, onCancel }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState('intro'); // 'intro' | 'taking'
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['test-take', testId],
    queryFn: () => testsApi.get(testId).then(r => r.data.data),
  });

  const submitMutation = useMutation({
    mutationFn: () => testsApi.submitAttempt(attemptId, {
      answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId })),
    }).then(r => r.data.data),
    onSuccess: (result) => { qc.invalidateQueries(['tests']); qc.invalidateQueries(['tests-library']); onFinish(result); },
  });

  if (isLoading) return <LoadingSpinner message="Loading test..." />;

  const test = data?.test;
  const questions = test?.questions ?? [];

  // ── Intro screen ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    const unanswered = questions.length - Object.keys(answers).length;
    const isResume = Object.keys(answers).length > 0;
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Exit</Button>
        </div>
        <div className="card p-8 space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen size={28} className="shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{test.title}</h2>
              {test.topic && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{test.topic}</p>}
            </div>
          </div>
          {test.description && (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{test.description}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-raised)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{questions.length}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Questions</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-raised)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{test.durationMin}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Minutes</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-raised)' }}>
              <p className="text-sm font-bold"
                style={{ color: test.difficulty === 'BEGINNER' ? 'var(--pos)' : test.difficulty === 'INTERMEDIATE' ? 'var(--warn)' : 'var(--neg)' }}>
                {test.difficulty}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Level</p>
            </div>
          </div>
          <div className="text-xs space-y-1" style={{ color: 'var(--text-3)' }}>
            <p>• One question at a time — navigate freely with Previous / Next.</p>
            <p>• You can revisit any question before submitting.</p>
            <p>• All questions must be answered before submission.</p>
          </div>
          <Button className="w-full" onClick={() => setPhase('taking')}>
            {isResume ? `Resume Test (${unanswered} unanswered)` : 'Begin Test'}
          </Button>
        </div>
      </div>
    );
  }

  // ── Taking screen ─────────────────────────────────────────────────────────
  const q = questions[current];
  if (!q) return null;

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{test.title}</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Question {current + 1} of {questions.length}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPhase('intro')}>Overview</Button>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--bg-raised)' }}>
        <div className="h-1.5 rounded-full transition-all"
          style={{ width: `${(answeredCount / questions.length) * 100}%`, backgroundColor: 'var(--accent)' }} />
      </div>

      {/* Question navigation dots */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((qs, i) => (
          <button key={qs.id} onClick={() => setCurrent(i)}
            title={`Question ${i + 1}${answers[qs.id] ? ' (answered)' : ' (unanswered)'}`}
            className="w-7 h-7 text-xs font-medium rounded-md transition-all"
            style={{
              outline: i === current ? '2px solid var(--accent)' : 'none',
              backgroundColor: i === current ? 'var(--accent)'
                : answers[qs.id] ? 'var(--accent-subtle)'
                : 'var(--bg-raised)',
              color: i === current ? 'var(--accent-fg)'
                : answers[qs.id] ? 'var(--accent)'
                : 'var(--text-3)',
            }}>
            {i + 1}
          </button>
        ))}
        <span className="text-xs self-center ml-1" style={{ color: 'var(--text-3)' }}>
          {answeredCount}/{questions.length} answered
        </span>
      </div>

      <div className="card p-6">
        <p className="text-sm font-medium mb-4" style={{ color: 'var(--text)' }}>{q.questionText}</p>
        <div className="space-y-2">
          {q.options.map(opt => (
            <label key={opt.id}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
              style={{
                border: answers[q.id] === opt.id
                  ? '2px solid var(--accent)'
                  : '2px solid var(--border)',
                backgroundColor: answers[q.id] === opt.id ? 'var(--accent-subtle)' : 'transparent',
              }}>
              <input type="radio" name={`q-${q.id}`} value={opt.id} checked={answers[q.id] === opt.id}
                onChange={() => setAnswers(a => ({ ...a, [q.id]: opt.id }))}
                className="w-4 h-4 border-gray-300" style={{ accentColor: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>{opt.optionText}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>Previous</Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent(c => c + 1)}>Next</Button>
        ) : (
          <Button loading={submitMutation.isPending} disabled={!allAnswered}
            onClick={() => submitMutation.mutate()}>
            Submit Test
          </Button>
        )}
      </div>

      {!allAnswered && current === questions.length - 1 && (
        <p className="text-xs text-center flex items-center justify-center gap-1" style={{ color: 'var(--warn)' }}>
          <AlertTriangle size={12} /> {questions.length - answeredCount} question(s) unanswered — use the dots above to navigate back.
        </p>
      )}
    </div>
  );
}

// ─── TestResult ───────────────────────────────────────────────────────────────

function TestResult({ result, onClose }) {
  const passed = result.passed;
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="card p-8 text-center"
        style={{ border: `1px solid ${passed ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
        {passed
          ? <Trophy size={40} className="mx-auto mb-3" style={{ color: 'var(--pos)' }} />
          : <Clock size={40} className="mx-auto mb-3" style={{ color: 'var(--warn)' }} />}
        <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{passed ? 'Well done!' : 'Keep practising!'}</h2>
        <p className="text-4xl font-bold mt-2 mb-1" style={{ color: 'var(--text)' }}>{result.percentage.toFixed(1)}%</p>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>{result.score} / {result.maxScore} marks</p>
        <Button className="mt-6" onClick={onClose}>Back to Tests</Button>
      </div>
    </div>
  );
}

// ─── CreateTestModal ──────────────────────────────────────────────────────────

function CreateTestModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', topic: 'Risk Management', difficulty: 'BEGINNER',
    durationMin: 30, isSelfTest: false, questions: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => testsApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['tests']); onClose(); },
  });

  const addQuestion = () => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, {
        questionText: '', explanation: '', marks: 1,
        options: [
          { optionText: '', isCorrect: true, orderIndex: 0 },
          { optionText: '', isCorrect: false, orderIndex: 1 },
          { optionText: '', isCorrect: false, orderIndex: 2 },
          { optionText: '', isCorrect: false, orderIndex: 3 },
        ],
      }],
    }));
  };

  const updateQuestion = (qi, field, value) => {
    setForm(f => {
      const qs = [...f.questions];
      qs[qi] = { ...qs[qi], [field]: value };
      return { ...f, questions: qs };
    });
  };

  const updateOption = (qi, oi, field, value) => {
    setForm(f => {
      const qs = [...f.questions];
      const opts = [...qs[qi].options];
      if (field === 'isCorrect' && value) {
        opts.forEach((o, idx) => { opts[idx] = { ...o, isCorrect: idx === oi }; });
      } else {
        opts[oi] = { ...opts[oi], [field]: value };
      }
      qs[qi] = { ...qs[qi], options: opts };
      return { ...f, questions: qs };
    });
  };

  return (
    <Modal open onClose={onClose} title="Create Test" size="3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>
            Save as Draft
          </Button>
        </>
      }>
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Topic</label>
            <select className="input" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}>
              {['Risk Management', 'Position Sizing', 'Trading Discipline', 'Trading Psychology', 'Market Analysis', 'Technical Analysis', 'Derivatives'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input type="number" min="1" className="input" value={form.durationMin}
              onChange={e => setForm(f => ({ ...f, durationMin: Number(e.target.value) }))} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="selfTest" checked={form.isSelfTest}
              onChange={e => setForm(f => ({ ...f, isSelfTest: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300" style={{ accentColor: 'var(--accent)' }} />
            <label htmlFor="selfTest" className="text-sm" style={{ color: 'var(--text-2)' }}>Make available as self-test</label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Questions ({form.questions.length})</h4>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addQuestion}>Add Question</Button>
          </div>
          {form.questions.map((q, qi) => (
            <div key={qi} className="p-4 rounded-lg mb-3 space-y-3" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Question {qi + 1}</span>
                <button onClick={() => setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== qi) }))}
                  className="text-xs text-red-500 hover:text-red-600">Remove</button>
              </div>
              <input className="input" placeholder="Question text..." value={q.questionText}
                onChange={e => updateQuestion(qi, 'questionText', e.target.value)} />
              <input className="input" placeholder="Explanation (shown after submission)..." value={q.explanation}
                onChange={e => updateQuestion(qi, 'explanation', e.target.value)} />
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qi}`} checked={opt.isCorrect}
                      onChange={() => updateOption(qi, oi, 'isCorrect', true)}
                      className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
                    <input className="input flex-1" placeholder={`Option ${oi + 1}...`} value={opt.optionText}
                      onChange={e => updateOption(qi, oi, 'optionText', e.target.value)} />
                    {opt.isCorrect && <span className="text-xs text-green-600 font-medium">Correct</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {createMutation.error && (
          <p className="text-sm" style={{ color: 'var(--neg)' }}>
            {createMutation.error?.response?.data?.message || 'Failed to create test.'}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ─── Mentor My Scenarios ───────────────────────────────────────────────────────

function MentorScenarios() {
  const qc = useQueryClient();
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['mentor-scenarios'],
    queryFn: () => scenariosApi.mine().then(r => r.data.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id) => scenariosApi.publish(id),
    onSuccess: () => qc.invalidateQueries(['mentor-scenarios']),
  });

  if (isLoading) return <LoadingSpinner />;

  if (scenarios.length === 0) {
    return <Empty title="No scenarios created" message="Create a practical scenario to assign to students." />;
  }

  return (
    <div className="grid gap-4">
      {scenarios.map(s => (
        <div key={s.id} className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{s.title}</h3>
                <span className={s.isPublished ? 'badge-green' : 'badge-amber'}>{s.isPublished ? 'Published' : 'Draft'}</span>
                <span className="badge-gray">{s.instrument}</span>
                <span className={s.difficulty === 'BEGINNER' ? 'badge-green' : s.difficulty === 'INTERMEDIATE' ? 'badge-amber' : 'badge-red'}>{s.difficulty}</span>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--text-3)' }}>{s.description}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Outcome: {s.outcomeDirection}</p>
            </div>
            {!s.isPublished && (
              <Button size="xs"
                loading={publishMutation.isPending && publishMutation.variables === s.id}
                onClick={() => publishMutation.mutate(s.id)}>Publish</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CreateScenarioModal ──────────────────────────────────────────────────────

const SCENARIO_INSTRUMENTS = ['NIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'AXISBANK', 'SBIN', 'CRUDE_OIL', 'GOLD', 'USDINR'];
const NEWS_CATEGORIES = ['EARNINGS', 'POLICY', 'MACRO', 'TECHNICAL', 'SECTOR'];

function CreateScenarioModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', instrument: 'NIFTY', difficulty: 'BEGINNER',
    description: '', context: '', newsHeadline: '', newsBody: '', newsCategory: 'MACRO',
    outcomeDirection: 'UP', outcome: '', teachingPoints: [''],
    startPrice: '', trendFactor: 0.5,
  });

  const createMutation = useMutation({
    mutationFn: (data) => scenariosApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['mentor-scenarios']); onClose(); },
  });

  const f = (field) => (e) => setForm(s => ({ ...s, [field]: e.target.value }));

  return (
    <Modal open onClose={onClose} title="Create Practical Scenario" size="3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={createMutation.isPending} onClick={() => createMutation.mutate({
            ...form,
            startPrice: Number(form.startPrice) || 1000,
            trendFactor: Number(form.trendFactor),
            teachingPoints: form.teachingPoints.filter(Boolean),
          })}>Save as Draft</Button>
        </>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={f('title')} placeholder="e.g. NIFTY Pre-Budget Volatility" />
          </div>
          <div>
            <label className="label">Instrument *</label>
            <select className="input" value={form.instrument} onChange={f('instrument')}>
              {SCENARIO_INSTRUMENTS.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={form.difficulty} onChange={f('difficulty')}>
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Market Situation (shown to student) *</label>
          <textarea className="input min-h-16" value={form.description} onChange={f('description')}
            placeholder="Describe the market situation the student will face..." />
        </div>
        <div>
          <label className="label">Detailed Context / Narrative</label>
          <textarea className="input min-h-16" value={form.context} onChange={f('context')}
            placeholder="Detailed market background (optional — defaults to description if blank)" />
        </div>

        <div className="p-3 rounded-lg space-y-3" style={{ border: '1px solid var(--border)' }}>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>News Event</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Headline</label>
              <input className="input" value={form.newsHeadline} onChange={f('newsHeadline')} placeholder="e.g. RBI holds rates, signals cut ahead" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.newsCategory} onChange={f('newsCategory')}>
                {NEWS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">News Body</label>
            <textarea className="input min-h-14" value={form.newsBody} onChange={f('newsBody')}
              placeholder="Full news context..." />
          </div>
        </div>

        <div className="p-3 rounded-lg space-y-3" style={{ border: '1px solid var(--border)' }}>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Chart Parameters (synthetic data)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Start Price</label>
              <input type="number" className="input" value={form.startPrice} onChange={f('startPrice')} placeholder="e.g. 22500" />
            </div>
            <div>
              <label className="label">Trend Factor (−1 to 1)</label>
              <input type="number" step="0.1" min="-1" max="1" className="input" value={form.trendFactor}
                onChange={f('trendFactor')} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>−1 = strong down, 0 = sideways, 1 = strong up</p>
            </div>
            <div>
              <label className="label">Outcome Direction</label>
              <select className="input" value={form.outcomeDirection} onChange={f('outcomeDirection')}>
                {['UP', 'DOWN', 'SIDEWAYS'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="label">What happened after (outcome narrative) *</label>
          <textarea className="input min-h-16" value={form.outcome} onChange={f('outcome')}
            placeholder="Explain what the market did after the decision point..." />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Teaching Points</label>
            <button className="text-xs underline" style={{ color: 'var(--accent)' }}
              onClick={() => setForm(s => ({ ...s, teachingPoints: [...s.teachingPoints, ''] }))}>+ Add point</button>
          </div>
          {form.teachingPoints.map((tp, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="input flex-1" value={tp} placeholder={`Teaching point ${i + 1}…`}
                onChange={e => setForm(s => {
                  const pts = [...s.teachingPoints]; pts[i] = e.target.value; return { ...s, teachingPoints: pts };
                })} />
              {form.teachingPoints.length > 1 && (
                <button className="text-xs text-red-500"
                  onClick={() => setForm(s => ({ ...s, teachingPoints: s.teachingPoints.filter((_, j) => j !== i) }))}>✕</button>
              )}
            </div>
          ))}
        </div>

        {createMutation.error && (
          <p className="text-sm" style={{ color: 'var(--neg)' }}>
            {createMutation.error?.response?.data?.message || 'Failed to create scenario.'}
          </p>
        )}
      </div>
    </Modal>
  );
}

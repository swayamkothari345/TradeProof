import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Plus, Users, BookOpen, Settings, CheckSquare, ChevronRight, ChevronDown,
  Clock, CheckCircle, AlertTriangle, Calendar, User, Target
} from 'lucide-react';
import { testsApi, scenariosApi, connectionsApi } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Empty from '../../components/ui/Empty.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { formatDateTime } from '../../utils/format.js';

const STEP_LABELS = ['Select Students', 'Select Content', 'Configure', 'Review'];

// ── Status helpers ────────────────────────────────────────────────────────────

function getBatchStatus(batch) {
  const now = new Date();
  const due = batch.dueAt ? new Date(batch.dueAt) : null;
  const count = batch.assignments.length;
  if (count === 0) return 'upcoming';
  const submitted = batch.assignments.filter(a => a.attempt?.status === 'SCORED' || a.attempt?.status === 'SUBMITTED').length;
  if (submitted === count) return 'completed';
  if (due && due < now) return 'overdue';
  if (batch.assignments.some(a => a.attempt?.status === 'IN_PROGRESS')) return 'inprogress';
  return 'upcoming';
}

const STATUS_CONFIG = {
  upcoming:   { label: 'Upcoming',    color: 'var(--info)',  bg: 'var(--info-bg)',  borderColor: 'rgba(37,99,235,0.3)'  },
  inprogress: { label: 'In Progress', color: 'var(--warn)',  bg: 'var(--warn-bg)',  borderColor: 'rgba(180,83,9,0.3)'   },
  completed:  { label: 'Completed',   color: 'var(--pos)',   bg: 'var(--pos-bg)',   borderColor: 'rgba(21,128,61,0.3)'  },
  overdue:    { label: 'Overdue',     color: 'var(--neg)',   bg: 'var(--neg-bg)',   borderColor: 'rgba(220,38,38,0.3)'  },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function Assignments() {
  const location = useLocation();
  const [showWizard, setShowWizard] = useState(false);
  const preselectedTestId = location.state?.preselectedTestId ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Assign tests and scenarios to students, then track their progress.
        </p>
        <Button icon={Plus} onClick={() => setShowWizard(true)}>New Assignment</Button>
      </div>

      <AssignmentList />

      {showWizard && (
        <AssignmentWizard
          preselectedTestId={preselectedTestId}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

// ── Assignment List ───────────────────────────────────────────────────────────

function AssignmentList() {
  const STATUS_TABS = ['All', 'Upcoming', 'In Progress', 'Completed', 'Overdue'];
  const [activeTab, setActiveTab] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mentor-assignments'],
    queryFn: () => testsApi.getAssignments().then(r => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const batches = data?.batches ?? [];
  const standalone = data?.standalone ?? [];

  // Convert standalone to pseudo-batches
  const allBatches = [
    ...batches,
    ...standalone.map(a => ({
      batchId: a.id,
      title: a.title ?? (a.test?.title ?? a.scenario?.title ?? 'Assignment'),
      test: a.test,
      scenario: a.scenario,
      dueAt: a.dueAt,
      startAt: a.startAt,
      assignedAt: a.assignedAt,
      assignments: [a],
    })),
  ];

  const filtered = allBatches.filter(b => {
    if (activeTab === 'All') return true;
    const status = getBatchStatus(b);
    if (activeTab === 'Upcoming') return status === 'upcoming';
    if (activeTab === 'In Progress') return status === 'inprogress';
    if (activeTab === 'Completed') return status === 'completed';
    if (activeTab === 'Overdue') return status === 'overdue';
    return true;
  });

  if (allBatches.length === 0) {
    return (
      <Empty title="No assignments yet"
        message="Click New Assignment to assign a test or scenario to your students." />
    );
  }

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: 'var(--bg-raised)' }}>
        {STATUS_TABS.map(tab => (
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

      {filtered.length === 0 ? (
        <Empty title={`No ${activeTab.toLowerCase()} assignments`} message="Check a different status tab." />
      ) : (
        <div className="space-y-3">
          {filtered.map(batch => {
            const status = getBatchStatus(batch);
            const cfg = STATUS_CONFIG[status];
            const isOpen = expanded === batch.batchId;
            const contentTitle = batch.title ?? batch.test?.title ?? batch.scenario?.title ?? 'Assignment';
            const isScenario = !batch.test && !!batch.scenario;

            return (
              <div key={batch.batchId} className="card" style={{ border: `1px solid ${cfg.borderColor}` }}>
                <div
                  className="p-4 flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : batch.batchId)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-medium" style={{ color: 'var(--text)' }}>{contentTitle}</h4>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {isScenario && <span className="badge-blue">Scenario</span>}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      <Users size={10} className="inline mr-1" />
                      {batch.assignments.length} student{batch.assignments.length !== 1 ? 's' : ''}
                      {batch.dueAt && (
                        <> · <Calendar size={10} className="inline mx-1" />Due {formatDateTime(batch.dueAt)}</>
                      )}
                      {' · '}{formatDateTime(batch.assignedAt)}
                    </p>
                  </div>
                  {isOpen
                    ? <ChevronDown size={16} className="shrink-0 mt-1" style={{ color: 'var(--text-3)' }} />
                    : <ChevronRight size={16} className="shrink-0 mt-1" style={{ color: 'var(--text-3)' }} />
                  }
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <BatchDetail batchId={batch.batchId} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Batch Detail ──────────────────────────────────────────────────────────────

function BatchDetail({ batchId }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['assignment-batch', batchId],
    queryFn: () => testsApi.getAssignmentBatch(batchId).then(r => r.data.data),
  });

  if (isLoading) return <div className="p-4"><LoadingSpinner /></div>;

  return (
    <div className="p-4 space-y-2">
      {items.map(item => {
        const name = item.assignedUser
          ? `${item.assignedUser.profile?.firstName ?? ''} ${item.assignedUser.profile?.lastName ?? ''}`.trim() || item.assignedUser.email
          : 'Cohort';
        const attempt = item.attempt;
        const pct = attempt?.percentage != null ? Number(attempt.percentage).toFixed(0) : null;

        return (
          <div key={item.id} className="flex items-center justify-between gap-4 py-2 last:border-0"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <User size={14} className="shrink-0" style={{ color: 'var(--text-3)' }} />
              <span className="text-sm truncate" style={{ color: 'var(--text-2)' }}>{name}</span>
            </div>
            <div className="shrink-0">
              {!attempt && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                  <Clock size={12} /> Not started
                </span>
              )}
              {attempt?.status === 'IN_PROGRESS' && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--warn)' }}>
                  <Clock size={12} /> In progress
                </span>
              )}
              {(attempt?.status === 'SCORED' || attempt?.status === 'SUBMITTED') && (
                <span className="text-xs font-medium flex items-center gap-1"
                  style={{ color: pct != null && Number(pct) >= 50 ? 'var(--pos)' : 'var(--warn)' }}>
                  {pct != null
                    ? <><CheckCircle size={12} /> {pct}%</>
                    : <><CheckCircle size={12} /> Submitted</>
                  }
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Assignment Wizard ─────────────────────────────────────────────────────────

function AssignmentWizard({ preselectedTestId, onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(preselectedTestId ? 1 : 0);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [contentType, setContentType] = useState('test'); // 'test' | 'scenario'
  const [selectedTestId, setSelectedTestId] = useState(preselectedTestId ?? null);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [config, setConfig] = useState({ title: '', instructions: '', dueAt: '', startAt: '' });

  const createMutation = useMutation({
    mutationFn: (data) => testsApi.createAssignment(data).then(r => r.data.data),
    onSuccess: () => { qc.invalidateQueries(['mentor-assignments']); onClose(); },
  });

  const canNext = [
    selectedStudents.length > 0,
    contentType === 'test' ? !!selectedTestId : !!selectedScenarioId,
    true, // config step always valid
    true,
  ][step];

  const handleSubmit = () => {
    createMutation.mutate({
      testId: contentType === 'test' ? selectedTestId : undefined,
      scenarioId: contentType === 'scenario' ? selectedScenarioId : undefined,
      studentIds: selectedStudents,
      title: config.title || undefined,
      instructions: config.instructions || undefined,
      dueAt: config.dueAt || undefined,
      startAt: config.startAt || undefined,
    });
  };

  return (
    <Modal open onClose={onClose} title="New Assignment" size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={step === 0 ? onClose : () => setStep(s => s - 1)}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button disabled={!canNext} onClick={() => setStep(s => s + 1)}>Next</Button>
            ) : (
              <Button
                loading={createMutation.isPending}
                disabled={!canNext}
                onClick={handleSubmit}>
                Create Assignment
              </Button>
            )}
          </div>
        </div>
      }>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-6">
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                style={{
                  backgroundColor: i <= step ? 'var(--accent)' : 'var(--bg-raised)',
                  color: i <= step ? '#fff' : 'var(--text-3)',
                  outline: i === step ? '2px solid var(--accent-muted)' : 'none',
                }}>
                {i < step ? <CheckCircle size={12} /> : i + 1}
              </div>
              <span className="text-xs font-medium"
                style={{ color: i === step ? 'var(--accent)' : 'var(--text-3)' }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className="flex-1 h-px mx-2"
                style={{ backgroundColor: i < step ? 'var(--accent)' : 'var(--border)' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <StepSelectStudents selected={selectedStudents} onChange={setSelectedStudents} />
      )}
      {step === 1 && (
        <StepSelectContent
          contentType={contentType} onTypeChange={setContentType}
          selectedTestId={selectedTestId} onTestChange={setSelectedTestId}
          selectedScenarioId={selectedScenarioId} onScenarioChange={setSelectedScenarioId}
        />
      )}
      {step === 2 && (
        <StepConfigure config={config} onChange={setConfig} />
      )}
      {step === 3 && (
        <StepReview
          selectedStudents={selectedStudents}
          contentType={contentType}
          selectedTestId={selectedTestId}
          selectedScenarioId={selectedScenarioId}
          config={config}
        />
      )}

      {createMutation.error && (
        <p className="text-xs mt-3" style={{ color: 'var(--neg)' }}>
          {createMutation.error?.response?.data?.message ?? 'Failed to create assignment.'}
        </p>
      )}
    </Modal>
  );
}

// ── Step 1: Select Students ───────────────────────────────────────────────────

function StepSelectStudents({ selected, onChange }) {
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list().then(r => r.data.data),
  });

  const students = connections.filter(c => c.student != null);

  const toggle = (id) => {
    onChange(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => onChange(students.map(c => c.student.id));
  const clearAll = () => onChange([]);

  if (isLoading) return <LoadingSpinner />;

  if (students.length === 0) {
    return <Empty title="No connected students" message="Connect with students first from the Students section." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
          Select students to assign to ({selected.length} selected)
        </p>
        <div className="flex gap-2 text-xs">
          <button className="underline" style={{ color: 'var(--accent)' }} onClick={selectAll}>All</button>
          <button className="underline" style={{ color: 'var(--text-3)' }} onClick={clearAll}>None</button>
        </div>
      </div>
      <div className="grid gap-2 max-h-72 overflow-y-auto">
        {students.map(c => {
          const s = c.student;
          const name = `${s.profile?.firstName ?? ''} ${s.profile?.lastName ?? ''}`.trim() || s.email;
          const checked = selected.includes(s.id);
          return (
            <label key={s.id}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
              style={{
                border: checked ? '2px solid var(--accent)' : '2px solid var(--border)',
                backgroundColor: checked ? 'var(--accent-subtle)' : 'transparent',
              }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(s.id)}
                className="w-4 h-4 rounded border-gray-300" style={{ accentColor: 'var(--accent)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{name}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{s.email}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Select Content ────────────────────────────────────────────────────

function StepSelectContent({ contentType, onTypeChange, selectedTestId, onTestChange, selectedScenarioId, onScenarioChange }) {
  const [testFilter, setTestFilter] = useState({ topic: '', difficulty: '' });

  const { data: myTests = [], isLoading: loadingMy } = useQuery({
    queryKey: ['tests'],
    queryFn: () => testsApi.list().then(r => r.data.data),
  });

  const { data: library = [], isLoading: loadingLib } = useQuery({
    queryKey: ['tests-library', testFilter],
    queryFn: () => testsApi.library(testFilter).then(r => r.data.data),
  });

  const { data: scenarios = [], isLoading: loadingScenarios } = useQuery({
    queryKey: ['scenarios-list'],
    queryFn: () => scenariosApi.list().then(r => r.data.data),
  });

  const publishedTests = Array.isArray(myTests)
    ? myTests.filter(t => t.status === 'PUBLISHED')
    : [];

  const allTests = [
    ...publishedTests.map(t => ({ ...t, source: 'mine' })),
    ...library.filter(t => !publishedTests.find(mt => mt.id === t.id)).map(t => ({ ...t, source: 'platform' })),
  ];

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2">
        {[['test', BookOpen, 'MCQ Test'], ['scenario', Target, 'Practical Scenario']].map(([type, Icon, label]) => (
          <button key={type} onClick={() => onTypeChange(type)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              border: contentType === type ? '2px solid var(--accent)' : '2px solid var(--border)',
              backgroundColor: contentType === type ? 'var(--accent-subtle)' : 'transparent',
              color: contentType === type ? 'var(--accent)' : 'var(--text-3)',
            }}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {contentType === 'test' && (
        <div className="space-y-3">
          {loadingMy || loadingLib
            ? <LoadingSpinner />
            : allTests.length === 0
              ? <Empty title="No tests available" message="Create or publish a test from Assessments." />
              : (
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {allTests.map(test => (
                    <label key={test.id}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        border: selectedTestId === test.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                        backgroundColor: selectedTestId === test.id ? 'var(--accent-subtle)' : 'transparent',
                      }}>
                      <input type="radio" name="test-select" checked={selectedTestId === test.id}
                        onChange={() => onTestChange(test.id)}
                        className="mt-0.5 w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{test.title}</span>
                          {test.source === 'platform' && <span className="badge-gray text-[10px]">Platform</span>}
                          <span className={test.difficulty === 'BEGINNER' ? 'badge-green text-[10px]' : test.difficulty === 'INTERMEDIATE' ? 'badge-amber text-[10px]' : 'badge-red text-[10px]'}>
                            {test.difficulty}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                          {test.topic} · {test.questions?.length ?? 0} questions
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )
          }
        </div>
      )}

      {contentType === 'scenario' && (
        <div className="space-y-3">
          {loadingScenarios
            ? <LoadingSpinner />
            : scenarios.length === 0
              ? <Empty title="No scenarios available" message="Create and publish a scenario from Assessments." />
              : (
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {scenarios.map(s => (
                    <label key={s.id}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        border: selectedScenarioId === s.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                        backgroundColor: selectedScenarioId === s.id ? 'var(--accent-subtle)' : 'transparent',
                      }}>
                      <input type="radio" name="scenario-select" checked={selectedScenarioId === s.id}
                        onChange={() => onScenarioChange(s.id)}
                        className="mt-0.5 w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{s.title}</span>
                          <span className="badge-gray text-[10px]">{s.instrument}</span>
                          <span className={s.difficulty === 'BEGINNER' ? 'badge-green text-[10px]' : s.difficulty === 'INTERMEDIATE' ? 'badge-amber text-[10px]' : 'badge-red text-[10px]'}>
                            {s.difficulty}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-3)' }}>{s.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )
          }
        </div>
      )}
    </div>
  );
}

// ── Step 3: Configure ─────────────────────────────────────────────────────────

function StepConfigure({ config, onChange }) {
  const f = (field) => (e) => onChange(c => ({ ...c, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Assignment Title (optional)</label>
        <input className="input" placeholder="e.g. Week 3 Risk Management Test"
          value={config.title} onChange={f('title')} />
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>If blank, the test/scenario title will be used.</p>
      </div>
      <div>
        <label className="label">Instructions for students (optional)</label>
        <textarea className="input min-h-20" placeholder="Any special instructions or context for the student…"
          value={config.instructions} onChange={f('instructions')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Available from (optional)</label>
          <input type="datetime-local" className="input" value={config.startAt} onChange={f('startAt')} />
        </div>
        <div>
          <label className="label">Due date (optional)</label>
          <input type="datetime-local" className="input" value={config.dueAt} onChange={f('dueAt')} />
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Review ────────────────────────────────────────────────────────────

function StepReview({ selectedStudents, contentType, selectedTestId, selectedScenarioId, config }) {
  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list().then(r => r.data.data),
  });

  const { data: myTests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => testsApi.list().then(r => r.data.data),
  });

  const { data: library = [] } = useQuery({
    queryKey: ['tests-library', {}],
    queryFn: () => testsApi.library({}).then(r => r.data.data),
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios-list'],
    queryFn: () => scenariosApi.list().then(r => r.data.data),
  });

  const students = connections.filter(c => c.student != null && selectedStudents.includes(c.student.id));
  const allTests = [...(Array.isArray(myTests) ? myTests : []), ...library];
  const selectedTest = allTests.find(t => t.id === selectedTestId);
  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  const rows = [
    ['Students', `${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''}`],
    ['Content', contentType === 'test'
      ? (selectedTest?.title ?? '—')
      : (selectedScenario?.title ?? '—')],
    ['Type', contentType === 'test' ? 'MCQ Test' : 'Practical Scenario'],
    ['Title', config.title || '(uses content title)'],
    ['Due date', config.dueAt ? new Date(config.dueAt).toLocaleString() : 'No deadline'],
    ['Available from', config.startAt ? new Date(config.startAt).toLocaleString() : 'Immediately'],
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>Review your assignment before creating it.</p>
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-4 px-4 py-2.5 last:border-0"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-medium w-32 shrink-0" style={{ color: 'var(--text-3)' }}>{label}</span>
            <span className="text-sm" style={{ color: 'var(--text)' }}>{value}</span>
          </div>
        ))}
      </div>

      {students.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Assigned to:</p>
          <div className="flex flex-wrap gap-1.5">
            {students.map(c => {
              const s = c.student;
              const name = `${s.profile?.firstName ?? ''} ${s.profile?.lastName ?? ''}`.trim() || s.email;
              return (
                <span key={s.id} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(15,118,110,0.3)' }}>
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {config.instructions && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Instructions:</p>
          <p className="text-sm p-3 rounded-lg" style={{ color: 'var(--text-2)', backgroundColor: 'var(--bg-raised)' }}>{config.instructions}</p>
        </div>
      )}
    </div>
  );
}

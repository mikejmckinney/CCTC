import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import { Layout } from './Layout';
import { Dashboard } from '../pages/Dashboard';
import { Setup } from '../pages/Setup';
import { SessionPage } from '../pages/Session';
import { ResultsPage } from '../pages/Results';
import { ReviewPage } from '../pages/Review';
import { HistoryPage } from '../pages/History';
import { ReportedItemsPage } from '../pages/ReportedItems';

function DisclaimerGate() {
  const { meta, acknowledgeDisclaimer } = useApp();

  if (!meta.disclaimerSeen) {
    return (
      <section className="modal-backdrop" aria-label="Study aid disclaimer">
        <div className="modal-card">
          <h2>Independent study aid</h2>
          <p>
            This practice app is not affiliated with or endorsed by ABTC or PSI, does not reproduce real exam items, and must not be used for
            patient-care decisions. Practice results are unofficial estimates only.
          </p>
          <button className="primary-button" onClick={() => void acknowledgeDisclaimer()}>
            I understand
          </button>
        </div>
      </section>
    );
  }

  return null;
}

function ReplacePrompt() {
  const {
    sessionReplacePromptOpen,
    dismissSessionReplacePrompt,
    replaceActiveSession,
    resumeExistingSession
  } = useApp();

  if (!sessionReplacePromptOpen) return null;

  return (
    <section className="modal-backdrop" aria-label="Unfinished session">
      <div className="modal-card">
        <h2>Unfinished session</h2>
        <p>
          You already have a session in progress. Resume it, or start a new session with your current setup (this discards
          in-progress answers and bookmarks).
        </p>
        <div className="modal-actions">
          <button className="ghost-button" onClick={dismissSessionReplacePrompt}>
            Cancel
          </button>
          <button className="secondary-button" onClick={replaceActiveSession}>
            Start new
          </button>
          <button className="primary-button" onClick={resumeExistingSession}>
            Resume
          </button>
        </div>
      </div>
    </section>
  );
}

function FlagComposer() {
  const { flagDraft, setFlagDraft, saveFlagDraft } = useApp();
  const FLAG_REASONS = [
    'factual error',
    'outdated policy/guideline',
    'ambiguous / >1 defensible answer',
    'typo / wording',
    'broken or wrong reference link',
    'other'
  ] as const;

  if (!flagDraft) return null;

  return (
    <section className="modal-backdrop" aria-label="Report this item">
      <div className="modal-card">
        <h2>Report this item</h2>
        <label>
          Reason
          <select value={flagDraft.reason} onChange={(e) => setFlagDraft({ ...flagDraft, reason: e.target.value as typeof flagDraft.reason })}>
            {FLAG_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Comment
          <textarea rows={4} value={flagDraft.comment} onChange={(e) => setFlagDraft({ ...flagDraft, comment: e.target.value })} />
        </label>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setFlagDraft(null)}>Cancel</button>
          <button className="primary-button" onClick={() => void saveFlagDraft()}>Save report</button>
        </div>
      </div>
    </section>
  );
}

function AppRoutes() {
  const { ready, error, activeSession } = useApp();

  if (!ready) {
    return (
      <div className="app-content" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <p className="status-card">Loading local study data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-content" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <p className="status-card status-card--danger">{error}</p>
      </div>
    );
  }

  return (
    <>
      <DisclaimerGate />
      <ReplacePrompt />
      <FlagComposer />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="setup" element={<Setup />} />
          <Route path="session" element={<SessionPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="review/:sessionId" element={<ReviewPage />} />
          <Route path="review/:sessionId/:index" element={<ReviewPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="reported" element={<ReportedItemsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}

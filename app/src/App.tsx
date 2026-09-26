import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { JobLayout } from './pages/JobLayout'
import { JobsPage } from './pages/JobsPage'
import { LibraryPage } from './pages/LibraryPage'
import { OverviewTab } from './pages/OverviewTab'
import { PricingTab } from './pages/PricingTab'
import { RevisionsTab } from './pages/RevisionsTab'
import { SettingsPage } from './pages/SettingsPage'
import { UnitsTab } from './pages/UnitsTab'
import { StoreProvider, useStore } from './store/store'

function Nav() {
  const { state } = useStore()
  return (
    <aside className="nav">
      <div className="brand"><i />Quote-to-Build</div>
      <NavLink to="/" end>Jobs</NavLink>
      <NavLink to="/library">Library</NavLink>
      <NavLink to="/settings">Settings{!state.settings.onboarded && ' ·'}</NavLink>
      <div className="spacer" />
      <span className="faint">{state.settings.businessName || 'MVP 1 · core loop'}</span>
    </aside>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <div className="shell">
          <Nav />
          <main className="main">
            <Routes>
              <Route path="/" element={<JobsPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/jobs/:id" element={<JobLayout />}>
                <Route index element={<OverviewTab />} />
                <Route path="units" element={<UnitsTab />} />
                <Route path="pricing" element={<PricingTab />} />
                <Route path="revisions" element={<RevisionsTab />} />
              </Route>
            </Routes>
          </main>
        </div>
      </HashRouter>
    </StoreProvider>
  )
}

import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { JobLayout } from './pages/JobLayout'
import { JobsPage } from './pages/JobsPage'
import { LibraryPage } from './pages/LibraryPage'
import { OverviewTab } from './pages/OverviewTab'
import { IntakeTab } from './pages/IntakeTab'
import { MeasurementsTab } from './pages/MeasurementsTab'
import { PortalPage } from './pages/PortalPage'
import { PricingTab } from './pages/PricingTab'
import { QuoteTab } from './pages/QuoteTab'
import { RevisionsTab } from './pages/RevisionsTab'
import { SettingsPage } from './pages/SettingsPage'
import { UnitsTab } from './pages/UnitsTab'
import { StoreProvider, useStore } from './store/store'

function Nav() {
  const { state, storageOk } = useStore()
  return (
    <aside className="nav">
      {!storageOk && <div className="callout bad small">השמירה בדפדפן נכשלה (כנראה אין מקום — תמונות). מחק תמונות או ייצא JSON.</div>}
      <div className="brand"><i />Quote-to-Build</div>
      <NavLink to="/" end>Jobs</NavLink>
      <NavLink to="/library">Library</NavLink>
      <NavLink to="/settings">Settings{!state.settings.onboarded && ' ·'}</NavLink>
      <div className="spacer" />
      <span className="faint">{state.settings.businessName || 'MVP 1 · core loop'}</span>
    </aside>
  )
}

function Shell() {
  const loc = useLocation()
  if (loc.pathname.startsWith('/q/')) {
    return <Routes><Route path="/q/:id" element={<PortalPage />} /></Routes>
  }
  return (
    <div className="shell">
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<JobsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/jobs/:id" element={<JobLayout />}>
            <Route index element={<OverviewTab />} />
            <Route path="intake" element={<IntakeTab />} />
            <Route path="measurements" element={<MeasurementsTab />} />
            <Route path="units" element={<UnitsTab />} />
            <Route path="pricing" element={<PricingTab />} />
            <Route path="quote" element={<QuoteTab />} />
            <Route path="revisions" element={<RevisionsTab />} />
          </Route>
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  )
}

import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { IntakeTab } from './pages/IntakeTab'
import { JobLayout } from './pages/JobLayout'
import { JobsPage } from './pages/JobsPage'
import { LibraryPage } from './pages/LibraryPage'
import { MeasurementsTab } from './pages/MeasurementsTab'
import { OverviewTab } from './pages/OverviewTab'
import { PortalPage } from './pages/PortalPage'
import { PricingTab } from './pages/PricingTab'
import { QuoteTab } from './pages/QuoteTab'
import { RevisionsTab } from './pages/RevisionsTab'
import { SettingsPage } from './pages/SettingsPage'
import { UnitsTab } from './pages/UnitsTab'
import { StoreProvider, useStore } from './store/store'
import { Icon } from './ui/components'

const LINKS = [
  { to: '/', end: true, label: 'עבודות', icon: Icon.jobs },
  { to: '/library', end: false, label: 'ספרייה', icon: Icon.library },
  { to: '/settings', end: false, label: 'הגדרות', icon: Icon.settings },
]

function Sidebar() {
  const { state, storageOk } = useStore()
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mark">נ</div>
        <div><div className="name">מהצעה לייצור</div><div className="sub">{state.settings.businessName || 'מערכת לנגרייה'}</div></div>
      </div>
      {!storageOk && <div className="callout bad small">השמירה בדפדפן נכשלה, כנראה אין מקום בגלל תמונות. מחק תמונות או ייצא קובץ.</div>}
      {LINKS.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className="side-link">
          {l.icon}<span>{l.label}</span>{l.to === '/settings' && !state.settings.onboarded && <span className="dot" title="ההגדרות לא הושלמו" />}
        </NavLink>
      ))}
      <div className="spacer" />
      <div className="foot">גרסת ניסוי · הנתונים נשמרים בדפדפן הזה בלבד</div>
    </aside>
  )
}

function BottomNav() {
  return (
    <nav className="bottomnav">
      {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end}>{l.icon}<span>{l.label}</span></NavLink>)}
    </nav>
  )
}

function Shell() {
  const loc = useLocation()
  if (loc.pathname.startsWith('/q/')) {
    return <Routes><Route path="/q/:id" element={<PortalPage />} /></Routes>
  }
  return (
    <div className="shell">
      <Sidebar />
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
      <BottomNav />
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

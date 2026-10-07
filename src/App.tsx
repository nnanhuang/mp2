import { NavLink, Route, Routes } from 'react-router-dom'
import styles from './App.module.css'
import ListView from './pages/ListView.tsx'
import GalleryView from './pages/GalleryView.tsx'
import DetailView from './pages/DetailView.tsx'
import NotFound from './pages/NotFound.tsx'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
}

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true" />
          NASA Image Explorer
        </NavLink>
        <nav className={styles.nav}>
          <NavLink to="/" end className={navClass}>
            Search
          </NavLink>
          <NavLink to="/gallery" className={navClass}>
            Gallery
          </NavLink>
        </nav>
      </header>

      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<ListView />} />
          <Route path="/gallery" element={<GalleryView />} />
          <Route path="/item/:nasaId" element={<DetailView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className={styles.footer}>
        Images courtesy of the NASA Image and Video Library.
      </footer>
    </div>
  )
}

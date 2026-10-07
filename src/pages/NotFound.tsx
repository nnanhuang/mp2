import { Link } from 'react-router-dom'
import styles from './NotFound.module.css'

export default function NotFound() {
  return (
    <section className={styles.notFound}>
      <h1>Lost in space</h1>
      <p>This page doesn’t exist.</p>
      <Link to="/" className={styles.home}>
        Back to search
      </Link>
    </section>
  )
}

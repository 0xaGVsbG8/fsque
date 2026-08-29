import styles from "./unsuported_browser.module.css";

export default function UnsupportedBrowserNotice() {
  return (
    <section className={styles.notice}>
      <div className={styles.header}>
        <span className={styles.icon} role="img" aria-label="alert">
          ⚠️
        </span>
        <h2 className={styles.title}>File System Access API unavailable</h2>
      </div>
      <p className={styles.bodyText}>
        Your browser does not have access to the File System Access API, so this
        feature is unavailable.
      </p>
      <p className={styles.sectionTitle}>Recommended solutions:</p>
      <ul className={styles.list}>
        <li>Enable the experimental File System Access API in your browser.</li>
        <li>Switch to a supported browser that includes this API such as Chrome or Edge</li>
      </ul>
    </section>
  );
}

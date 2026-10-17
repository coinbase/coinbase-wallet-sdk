import styles from './Header.module.css';

export const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Base Subscribe SDK Playground</h1>
        <p className={styles.subtitle}>
          Test and explore subscription functionality in a safe environment
        </p>
      </div>
    </header>
  );
};

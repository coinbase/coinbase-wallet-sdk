import styles from './Header.module.css';

export const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Base Pay SDK Playground</h1>
      </div>
    </header>
  );
};

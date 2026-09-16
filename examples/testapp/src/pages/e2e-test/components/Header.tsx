import styles from './Header.module.css';

interface HeaderProps {
  sdkVersion?: string;
  sdkSource?: 'local' | 'npm';
  onSourceChange?: (source: 'local' | 'npm') => void;
  onVersionChange?: (version: string) => void;
  availableVersions?: string[];
  npmVersion?: string;
  isLoadingSDK?: boolean;
  onLoadSDK?: () => void;
}

export const Header = ({
  sdkVersion = 'Loading...',
  sdkSource = 'local',
  onSourceChange,
  onVersionChange,
  availableVersions = ['latest'],
  npmVersion = 'latest',
  isLoadingSDK = false,
  onLoadSDK,
}: HeaderProps) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>🧪 E2E Test Suite</h1>
          <p className={styles.subtitle}>
            Comprehensive end-to-end tests for the Coinbase Wallet SDK
          </p>
        </div>
        <div className={styles.versionSection}>
          <div className={styles.versionBadge}>
            <span className={styles.versionLabel}>SDK Version</span>
            <span className={styles.versionValue}>{sdkVersion}</span>
          </div>
          {onSourceChange && (
            <div className={styles.sdkControls}>
              <div className={styles.sourceToggle}>
                <button
                  className={`${styles.sourceButton} ${sdkSource === 'local' ? styles.active : ''}`}
                  onClick={() => onSourceChange('local')}
                >
                  Local Build
                </button>
                <button
                  className={`${styles.sourceButton} ${sdkSource === 'npm' ? styles.active : ''}`}
                  onClick={() => onSourceChange('npm')}
                >
                  NPM Package
                </button>
              </div>
              {sdkSource === 'npm' && onVersionChange && (
                <>
                  <select
                    className={styles.versionSelect}
                    value={npmVersion}
                    onChange={(e) => onVersionChange(e.target.value)}
                  >
                    {availableVersions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                  {onLoadSDK && (
                    <button
                      className={styles.loadButton}
                      onClick={onLoadSDK}
                      disabled={isLoadingSDK}
                    >
                      {isLoadingSDK ? 'Loading...' : 'Load SDK'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

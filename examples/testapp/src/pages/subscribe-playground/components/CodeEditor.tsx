import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onExecute: () => void;
  onReset: () => void;
  isLoading: boolean;
}

export const CodeEditor = ({ code, onChange, onExecute, onReset, isLoading }: CodeEditorProps) => {
  return (
    <div className={styles.editorPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2h8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
          Code Editor
        </h2>
        <button onClick={onReset} className={styles.resetButton} disabled={isLoading}>
          <svg
            className={styles.buttonIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
          Reset
        </button>
      </div>

      <div className={styles.editorWrapper}>
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className={styles.codeEditor}
          spellCheck={false}
          disabled={isLoading}
          placeholder="Enter your code here..."
        />
        <div className={styles.editorOverlay}></div>
      </div>

      <div className={styles.securityDisclaimer}>
        <svg
          className={styles.warningIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className={styles.disclaimerText}>
          Intended for testing purposes only. Never paste code from untrusted sources. Coinbase is
          not responsible for any loss of funds that you incur. Testnet funds hold no real value.
        </div>
      </div>

      <button onClick={onExecute} disabled={isLoading} className={styles.executeButton}>
        {isLoading ? (
          <>
            <span className={styles.spinner}></span>
            Executing...
          </>
        ) : (
          <>
            <svg
              className={styles.buttonIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Execute Code
          </>
        )}
      </button>
    </div>
  );
};

import styles from './QuickTips.module.css';

interface QuickTipsProps {
  tips: string[];
}

// Helper function to safely render tips with links
const renderTip = (tip: string) => {
  // Check if the tip contains an HTML link
  const linkMatch = tip.match(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);

  if (linkMatch) {
    const [fullMatch, href, text] = linkMatch;
    const parts = tip.split(fullMatch);

    return (
      <>
        {parts[0]}
        <a href={href} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
        {parts[1]}
      </>
    );
  }

  return tip;
};

export const QuickTips = ({ tips }: QuickTipsProps) => {
  return (
    <div className={styles.quickTips}>
      <h3 className={styles.tipsTitle}>
        <svg
          className={styles.tipsIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        Quick Tips
      </h3>
      <ul className={styles.tipsList}>
        {tips.map((tip, index) => (
          <li key={index} className={styles.tipItem}>
            {renderTip(tip)}
          </li>
        ))}
      </ul>
    </div>
  );
};

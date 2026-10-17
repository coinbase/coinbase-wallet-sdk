import type {
  PaymentResult,
  PaymentStatus,
  SubscriptionResult,
  SubscriptionStatus,
} from '@coinbase/wallet-sdk';
import styles from './Output.module.css';

interface OutputProps {
  result: PaymentResult | PaymentStatus | SubscriptionResult | SubscriptionStatus | null;
  error: string | null;
  consoleOutput: string[];
  isLoading: boolean;
}

// Type guard to check if result is PaymentResult
const isPaymentResult = (result: unknown): result is PaymentResult => {
  return result !== null && typeof result === 'object' && 'success' in result;
};

// Type guard to check if result is PaymentStatus
const isPaymentStatus = (result: unknown): result is PaymentStatus => {
  return result !== null && typeof result === 'object' && 'status' in result && 'id' in result;
};

// Type guard to check if result is SubscriptionResult
const isSubscriptionResult = (result: unknown): result is SubscriptionResult => {
  return (
    result !== null &&
    typeof result === 'object' &&
    'subscriptionOwner' in result &&
    'subscriptionPayer' in result
  );
};

// Type guard to check if result is SubscriptionStatus
const isSubscriptionStatus = (result: unknown): result is SubscriptionStatus => {
  return (
    result !== null &&
    typeof result === 'object' &&
    'isSubscribed' in result &&
    'recurringCharge' in result
  );
};

export const Output = ({ result, error, consoleOutput, isLoading }: OutputProps) => {
  return (
    <div className={styles.outputPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <path d="M9 9l6 6" />
            <path d="M15 9l-6 6" />
          </svg>
          Output
        </h2>
      </div>

      <div className={styles.outputContent}>
        {result && isPaymentResult(result) && (
          <div className={`${styles.resultCard} ${result.success ? styles.success : styles.error}`}>
            <div className={styles.resultHeader}>
              {result.success ? (
                <>
                  <svg
                    className={styles.resultIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className={styles.resultTitle}>Payment Successful!</span>
                </>
              ) : (
                <>
                  <svg
                    className={styles.resultIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span className={styles.resultTitle}>Payment Failed</span>
                </>
              )}
            </div>

            <div className={styles.resultBody}>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Amount</span>
                <span className={styles.resultValue}>{result.amount} USDC</span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Recipient</span>
                <code className={styles.resultValue}>{result.to}</code>
              </div>
              {result.success && result.id && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Transaction ID</span>
                  <code className={styles.resultValue}>{result.id}</code>
                </div>
              )}
              {!result.success && 'error' in result && (result as { error?: string }).error && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Error</span>
                  <span className={styles.errorMessage}>
                    {(result as { error?: string }).error}
                  </span>
                </div>
              )}
            </div>

            {result.success && result.payerInfoResponses && (
              <div className={styles.userDataSection}>
                <div className={styles.userDataHeader}>
                  <svg
                    className={styles.userDataIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>User Info</span>
                </div>
                <div className={styles.userDataBody}>
                  {result.payerInfoResponses.name && (
                    <div className={styles.userDataRow}>
                      <span className={styles.userDataLabel}>Name</span>
                      <span className={styles.userDataValue}>
                        {(() => {
                          const name = result.payerInfoResponses.name as unknown as {
                            firstName: string;
                            familyName: string;
                          };
                          return `${name.firstName} ${name.familyName}`;
                        })()}
                      </span>
                    </div>
                  )}
                  {result.payerInfoResponses.email && (
                    <div className={styles.userDataRow}>
                      <span className={styles.userDataLabel}>Email</span>
                      <span className={styles.userDataValue}>
                        {result.payerInfoResponses.email}
                      </span>
                    </div>
                  )}
                  {result.payerInfoResponses.phoneNumber && (
                    <div className={styles.userDataRow}>
                      <span className={styles.userDataLabel}>Phone</span>
                      <span className={styles.userDataValue}>
                        {result.payerInfoResponses.phoneNumber.number} (
                        {result.payerInfoResponses.phoneNumber.country})
                      </span>
                    </div>
                  )}
                  {result.payerInfoResponses.physicalAddress && (
                    <div className={styles.userDataRow}>
                      <span className={styles.userDataLabel}>Address</span>
                      <span className={styles.userDataValue}>
                        {(() => {
                          const addr = result.payerInfoResponses.physicalAddress as unknown as {
                            address1: string;
                            address2?: string;
                            city: string;
                            state: string;
                            postalCode: string;
                            countryCode: string;
                            name?: {
                              firstName: string;
                              familyName: string;
                            };
                          };
                          const parts = [
                            addr.name ? `${addr.name.firstName} ${addr.name.familyName}` : null,
                            addr.address1,
                            addr.address2,
                            `${addr.city}, ${addr.state} ${addr.postalCode}`,
                            addr.countryCode,
                          ].filter(Boolean);
                          return parts.join(', ');
                        })()}
                      </span>
                    </div>
                  )}
                  {result.payerInfoResponses.onchainAddress && (
                    <div className={styles.userDataRow}>
                      <span className={styles.userDataLabel}>On-chain Address</span>
                      <span className={styles.userDataValue}>
                        {result.payerInfoResponses.onchainAddress}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {result && isPaymentStatus(result) && (
          <div
            className={`${styles.resultCard} ${
              result.status === 'completed'
                ? styles.success
                : result.status === 'pending'
                  ? styles.pending
                  : result.status === 'failed'
                    ? styles.error
                    : styles.notFound
            }`}
          >
            <div className={styles.resultHeader}>
              {result.status === 'completed' && (
                <>
                  <svg
                    className={styles.resultIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className={styles.resultTitle}>Payment Completed</span>
                </>
              )}
              {result.status === 'pending' && (
                <>
                  <svg
                    className={styles.resultIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className={styles.resultTitle}>Payment Pending</span>
                </>
              )}
              {result.status === 'failed' && (
                <>
                  <svg
                    className={styles.resultIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span className={styles.resultTitle}>Payment Failed</span>
                </>
              )}
              {result.status === 'not_found' && (
                <>
                  <svg
                    className={styles.resultIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className={styles.resultTitle}>Payment Not Found</span>
                </>
              )}
            </div>

            <div className={styles.resultBody}>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Status</span>
                <span className={styles.resultValue}>{result.status}</span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Transaction ID</span>
                <code className={styles.resultValue}>{result.id}</code>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Message</span>
                <span className={styles.resultValue}>{result.message}</span>
              </div>
              {result.sender && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Sender</span>
                  <code className={styles.resultValue}>{result.sender}</code>
                </div>
              )}
              {result.amount && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Amount</span>
                  <span className={styles.resultValue}>{result.amount} USDC</span>
                </div>
              )}
              {result.recipient && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Recipient</span>
                  <code className={styles.resultValue}>{result.recipient}</code>
                </div>
              )}
              {'error' in result && (result as { error?: string }).error && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Error</span>
                  <span className={styles.errorMessage}>
                    {(result as { error?: string }).error}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {result && isSubscriptionResult(result) && (
          <div className={`${styles.resultCard} ${styles.success}`}>
            <div className={styles.resultHeader}>
              <svg
                className={styles.resultIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className={styles.resultTitle}>Subscription Created!</span>
            </div>

            <div className={styles.resultBody}>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Subscription ID</span>
                <code className={styles.resultValue}>{result.id}</code>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Recurring Charge</span>
                <span className={styles.resultValue}>${result.recurringCharge} USD</span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Period</span>
                <span className={styles.resultValue}>{result.periodInDays} days</span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Subscription Owner</span>
                <code className={styles.resultValue}>{result.subscriptionOwner}</code>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Subscription Payer</span>
                <code className={styles.resultValue}>{result.subscriptionPayer}</code>
              </div>
            </div>
          </div>
        )}

        {result && isSubscriptionStatus(result) && (
          <div
            className={`${styles.resultCard} ${result.isSubscribed ? styles.success : styles.info}`}
          >
            <div className={styles.resultHeader}>
              {result.isSubscribed ? (
                <>
                  <svg
                    className={styles.resultIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className={styles.resultTitle}>Active Subscription</span>
                </>
              ) : (
                <>
                  <svg
                    className={styles.resultIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className={styles.resultTitle}>No Active Subscription</span>
                </>
              )}
            </div>

            <div className={styles.resultBody}>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Status</span>
                <span className={styles.resultValue}>
                  {result.isSubscribed ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Recurring Charge</span>
                <span className={styles.resultValue}>${result.recurringCharge} USD</span>
              </div>
              {result.remainingChargeInPeriod && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Remaining in Period</span>
                  <span className={styles.resultValue}>${result.remainingChargeInPeriod} USD</span>
                </div>
              )}
              {result.currentPeriodStart && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Current Period Start</span>
                  <span className={styles.resultValue}>
                    {new Date(result.currentPeriodStart).toLocaleDateString()}
                  </span>
                </div>
              )}
              {result.nextPeriodStart && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Next Period Start</span>
                  <span className={styles.resultValue}>
                    {new Date(result.nextPeriodStart).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className={`${styles.resultCard} ${styles.error}`}>
            <div className={styles.resultHeader}>
              <svg
                className={styles.resultIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className={styles.resultTitle}>Execution Error</span>
            </div>
            <div className={styles.resultBody}>
              {(() => {
                try {
                  // Try to parse the error as JSON for structured display
                  const errorDetails = JSON.parse(error);
                  return (
                    <>
                      <div className={styles.resultRow}>
                        <span className={styles.resultLabel}>Error</span>
                        <span className={styles.errorMessage}>{errorDetails.message}</span>
                      </div>
                      {errorDetails.type && errorDetails.type !== 'unknown' && (
                        <div className={styles.resultRow}>
                          <span className={styles.resultLabel}>Type</span>
                          <span className={styles.resultValue}>{errorDetails.type}</span>
                        </div>
                      )}
                      {errorDetails.code && (
                        <div className={styles.resultRow}>
                          <span className={styles.resultLabel}>Code</span>
                          <span className={styles.resultValue}>{errorDetails.code}</span>
                        </div>
                      )}
                      {errorDetails.statusCode && (
                        <div className={styles.resultRow}>
                          <span className={styles.resultLabel}>Status Code</span>
                          <span className={styles.resultValue}>{errorDetails.statusCode}</span>
                        </div>
                      )}
                      {errorDetails.details && (
                        <div className={styles.resultRow}>
                          <span className={styles.resultLabel}>Details</span>
                          <span className={styles.resultValue}>
                            {typeof errorDetails.details === 'string'
                              ? errorDetails.details
                              : JSON.stringify(errorDetails.details, null, 2)}
                          </span>
                        </div>
                      )}
                      {errorDetails.response && (
                        <div className={styles.resultRow}>
                          <span className={styles.resultLabel}>Response</span>
                          <span className={styles.resultValue}>
                            {typeof errorDetails.response === 'string'
                              ? errorDetails.response
                              : JSON.stringify(errorDetails.response, null, 2)}
                          </span>
                        </div>
                      )}
                      {process.env.NODE_ENV === 'development' && errorDetails.stack && (
                        <details className={styles.stackTrace}>
                          <summary className={styles.resultLabel}>Stack Trace</summary>
                          <pre className={styles.stackContent}>{errorDetails.stack}</pre>
                        </details>
                      )}
                    </>
                  );
                } catch (_parseError) {
                  // If parsing fails, display as plain text (backward compatibility)
                  return <div className={styles.errorMessage}>{error}</div>;
                }
              })()}
            </div>
          </div>
        )}

        {consoleOutput.length > 0 && (
          <div className={styles.consoleCard}>
            <div className={styles.consoleHeader}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              Console Output
            </div>
            <pre className={styles.consoleBody}>{consoleOutput.join('\n')}</pre>
          </div>
        )}

        {!result && !error && !isLoading && consoleOutput.length === 0 && (
          <div className={styles.emptyState}>
            <svg
              className={styles.emptyIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
            <p>Click &quot;Execute Code&quot; to run your code</p>
          </div>
        )}
      </div>
    </div>
  );
};

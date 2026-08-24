import { useEffect, useState } from 'react';
import { CodeEditor, Header, Output, QuickTips } from './components';
import {
  DEFAULT_GET_SUBSCRIPTION_STATUS_CODE,
  DEFAULT_SUBSCRIBE_CODE,
  GET_SUBSCRIPTION_STATUS_QUICK_TIPS,
  SUBSCRIBE_CODE_WITH_MINIMUM_BALANCE_FALSE,
  SUBSCRIBE_CODE_WITH_TEST_PERIOD,
  SUBSCRIBE_QUICK_TIPS,
} from './constants';
import { useCodeExecution } from './hooks';
import styles from './styles/Home.module.css';

function SubscribePlayground() {
  const [subscribeVariant, setSubscribeVariant] = useState<'default' | 'test' | 'minimumBalance'>(
    'default'
  );
  const [subscribeCode, setSubscribeCode] = useState(DEFAULT_SUBSCRIBE_CODE);
  const [getSubscriptionStatusCode, setGetSubscriptionStatusCode] = useState(
    DEFAULT_GET_SUBSCRIPTION_STATUS_CODE
  );

  const subscribeExecution = useCodeExecution();
  const getSubscriptionStatusExecution = useCodeExecution();

  const handleSubscribeExecute = () => {
    subscribeExecution.executeCode(subscribeCode);
  };

  const handleSubscribeReset = () => {
    setSubscribeVariant('default');
    setSubscribeCode(DEFAULT_SUBSCRIBE_CODE);
    subscribeExecution.reset();
  };

  const handleSubscribeVariantChange = (variant: 'default' | 'test' | 'minimumBalance') => {
    setSubscribeVariant(variant);
    let newCode = DEFAULT_SUBSCRIBE_CODE;
    if (variant === 'test') {
      newCode = SUBSCRIBE_CODE_WITH_TEST_PERIOD;
    } else if (variant === 'minimumBalance') {
      newCode = SUBSCRIBE_CODE_WITH_MINIMUM_BALANCE_FALSE;
    }
    setSubscribeCode(newCode);
    subscribeExecution.reset();
  };

  const handleGetSubscriptionStatusExecute = () => {
    getSubscriptionStatusExecution.executeCode(getSubscriptionStatusCode);
  };

  const handleGetSubscriptionStatusReset = () => {
    setGetSubscriptionStatusCode(DEFAULT_GET_SUBSCRIPTION_STATUS_CODE);
    getSubscriptionStatusExecution.reset();
  };

  // Watch for successful subscription results and update getSubscriptionStatus code with the subscription ID
  useEffect(() => {
    if (
      subscribeExecution.result &&
      'id' in subscribeExecution.result &&
      subscribeExecution.result.id
    ) {
      const subscriptionId = subscribeExecution.result.id;
      const updatedCode = `import { base } from '@base-org/account'

try {
  const result = await base.subscription.getStatus({
    id: '${subscriptionId}', // Automatically filled with your recent subscription
    testnet: false
  })
  
  return result;
} catch (error) {
  console.error('Failed to check subscription status:', error.message);
  throw error;
}`;
      setGetSubscriptionStatusCode(updatedCode);
    }
  }, [subscribeExecution.result]);

  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        {/* subscribe Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>subscription.subscribe</h2>
            <a
              href="https://docs.base.org/base-account/reference/base-pay/subscribe"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docsLink}
            >
              Docs ↗
            </a>
          </div>
          <p className={styles.sectionDescription}>Create recurring USDC subscriptions on Base</p>

          <div className={styles.variantSelector}>
            <label>
              <input
                type="radio"
                name="subscribeVariant"
                value="default"
                checked={subscribeVariant === 'default'}
                onChange={() => handleSubscribeVariantChange('default')}
              />
              Default (30-day period)
            </label>
            <label>
              <input
                type="radio"
                name="subscribeVariant"
                value="test"
                checked={subscribeVariant === 'test'}
                onChange={() => handleSubscribeVariantChange('test')}
              />
              Test Mode (5-minute period)
            </label>
            <label>
              <input
                type="radio"
                name="subscribeVariant"
                value="minimumBalance"
                checked={subscribeVariant === 'minimumBalance'}
                onChange={() => handleSubscribeVariantChange('minimumBalance')}
              />
              No Balance Check
            </label>
          </div>

          <div className={styles.playground}>
            <div className={styles.leftColumn}>
              <CodeEditor
                code={subscribeCode}
                onChange={setSubscribeCode}
                onExecute={handleSubscribeExecute}
                onReset={handleSubscribeReset}
                isLoading={subscribeExecution.isLoading}
              />
              <QuickTips tips={SUBSCRIBE_QUICK_TIPS} />
            </div>

            <div className={styles.rightColumn}>
              <Output
                result={subscribeExecution.result}
                error={subscribeExecution.error}
                consoleOutput={subscribeExecution.consoleOutput}
                isLoading={subscribeExecution.isLoading}
              />
            </div>
          </div>
        </section>

        {/* getSubscriptionStatus Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>subscription.getStatus</h2>
            <a
              href="https://docs.base.org/base-account/reference/base-pay/getStatus"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docsLink}
            >
              Docs ↗
            </a>
          </div>
          <p className={styles.sectionDescription}>Check the status of a subscription</p>

          <div className={styles.playground}>
            <div className={styles.leftColumn}>
              <CodeEditor
                code={getSubscriptionStatusCode}
                onChange={setGetSubscriptionStatusCode}
                onExecute={handleGetSubscriptionStatusExecute}
                onReset={handleGetSubscriptionStatusReset}
                isLoading={getSubscriptionStatusExecution.isLoading}
              />
              <QuickTips tips={GET_SUBSCRIPTION_STATUS_QUICK_TIPS} />
            </div>

            <div className={styles.rightColumn}>
              <Output
                result={getSubscriptionStatusExecution.result}
                error={getSubscriptionStatusExecution.error}
                consoleOutput={getSubscriptionStatusExecution.consoleOutput}
                isLoading={getSubscriptionStatusExecution.isLoading}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Custom layout for this page - no app header
SubscribePlayground.getLayout = function getLayout(page) {
  return page;
};

export default SubscribePlayground;

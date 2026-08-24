import { useEffect, useState } from 'react';
import { CodeEditor, Header, Output, QuickTips } from './components';
import {
  DEFAULT_GET_PAYMENT_STATUS_CODE,
  DEFAULT_PAY_CODE,
  GET_PAYMENT_STATUS_QUICK_TIPS,
  PAY_CODE_WITH_PAYER_INFO,
  PAY_QUICK_TIPS,
} from './constants';
import { useCodeExecution } from './hooks';
import styles from './styles/Home.module.css';

function PayPlayground() {
  const [includePayerInfo, setIncludePayerInfo] = useState(false);
  const [payCode, setPayCode] = useState(DEFAULT_PAY_CODE);
  const [getPaymentStatusCode, setGetPaymentStatusCode] = useState(DEFAULT_GET_PAYMENT_STATUS_CODE);

  const payExecution = useCodeExecution();
  const getPaymentStatusExecution = useCodeExecution();

  const handlePayExecute = () => {
    payExecution.executeCode(payCode);
  };

  const handlePayReset = () => {
    setIncludePayerInfo(false);
    setPayCode(DEFAULT_PAY_CODE);
    payExecution.reset();
  };

  const handlePayerInfoToggle = (checked: boolean) => {
    setIncludePayerInfo(checked);
    const newCode = checked ? PAY_CODE_WITH_PAYER_INFO : DEFAULT_PAY_CODE;
    setPayCode(newCode);
    payExecution.reset();
  };

  const handleGetPaymentStatusExecute = () => {
    getPaymentStatusExecution.executeCode(getPaymentStatusCode);
  };

  const handleGetPaymentStatusReset = () => {
    setGetPaymentStatusCode(DEFAULT_GET_PAYMENT_STATUS_CODE);
    getPaymentStatusExecution.reset();
  };

  // Watch for successful payment results and update getPaymentStatus code with the transaction ID
  useEffect(() => {
    if (
      payExecution.result &&
      'success' in payExecution.result &&
      payExecution.result.success &&
      payExecution.result.id
    ) {
      const transactionId = payExecution.result.id;
      const amount = payExecution.result.amount;
      const recipient = payExecution.result.to;
      const updatedCode = `import { base } from '@base-org/account'

try {
  const result = await base.getPaymentStatus({
    id: '${transactionId}', // Automatically filled with your recent transaction
    expectedPayment: {
      amount: '${amount}',
      recipient: '${recipient}'
    },
    testnet: false
  })
  
  return result;
} catch (error) {
  // This catches network and payment verification errors
  console.error('Failed to check payment status:', error.message);
  throw error;
}`;
      setGetPaymentStatusCode(updatedCode);
    }
  }, [payExecution.result]);

  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        {/* pay Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>pay Function</h2>
            <a
              href="https://docs.base.org/base-account/reference/base-pay/pay"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docsLink}
            >
              Docs ↗
            </a>
          </div>
          <p className={styles.sectionDescription}>Send USDC payments on Base</p>

          <div className={styles.playground}>
            <div className={styles.leftColumn}>
              <CodeEditor
                code={payCode}
                onChange={setPayCode}
                onExecute={handlePayExecute}
                onReset={handlePayReset}
                isLoading={payExecution.isLoading}
                includePayerInfo={includePayerInfo}
                onPayerInfoToggle={handlePayerInfoToggle}
                showPayerInfoToggle={true}
              />
              <QuickTips tips={PAY_QUICK_TIPS} />
            </div>

            <div className={styles.rightColumn}>
              <Output
                result={payExecution.result}
                error={payExecution.error}
                consoleOutput={payExecution.consoleOutput}
                isLoading={payExecution.isLoading}
              />
            </div>
          </div>
        </section>

        {/* getPaymentStatus Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>getPaymentStatus Function</h2>
            <a
              href="https://docs.base.org/base-account/reference/base-pay/getPaymentStatus"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docsLink}
            >
              Docs ↗
            </a>
          </div>
          <p className={styles.sectionDescription}>Check the status of a payment</p>

          <div className={styles.playground}>
            <div className={styles.leftColumn}>
              <CodeEditor
                code={getPaymentStatusCode}
                onChange={setGetPaymentStatusCode}
                onExecute={handleGetPaymentStatusExecute}
                onReset={handleGetPaymentStatusReset}
                isLoading={getPaymentStatusExecution.isLoading}
                includePayerInfo={false}
                onPayerInfoToggle={() => {}}
                showPayerInfoToggle={false}
              />
              <QuickTips tips={GET_PAYMENT_STATUS_QUICK_TIPS} />
            </div>

            <div className={styles.rightColumn}>
              <Output
                result={getPaymentStatusExecution.result}
                error={getPaymentStatusExecution.error}
                consoleOutput={getPaymentStatusExecution.consoleOutput}
                isLoading={getPaymentStatusExecution.isLoading}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Custom layout for this page - no app header
PayPlayground.getLayout = function getLayout(page) {
  return page;
};

export default PayPlayground;

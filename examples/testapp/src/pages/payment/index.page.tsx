import { type PaymentResult, type PaymentStatus, getPaymentStatus, pay } from '@base-org/account';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Checkbox,
  Code,
  Container,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  Link,
  Select,
  Switch,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import type { Address } from 'viem';
import { useConfig } from '../../context/ConfigContextProvider';

export default function Payment() {
  const { scwUrl } = useConfig();
  const toast = useToast();

  // Color mode values for better dark theme support
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBgColor = useColorModeValue('gray.50', 'gray.900');
  const optionalBgColor = useColorModeValue('gray.50', 'gray.700');
  const noteTextColor = useColorModeValue('gray.700', 'gray.200');

  // Pay form state with defaults
  const [payAmount, setPayAmount] = useState('0.01');
  const [payTo, setPayTo] = useState('0x0000000000000000000000000000000000000000');
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState<PaymentResult | null>(null);
  const [payError, setPayError] = useState<{
    error: string;
    errorDetails?: unknown;
    attemptedPayment?: unknown;
  } | null>(null);

  // Optional parameters state
  const [customWalletUrl, setCustomWalletUrl] = useState('');
  const [useTestnet, setUseTestnet] = useState(false);
  const [enableTelemetry, setEnableTelemetry] = useState(true);

  // Payer info state
  const [collectPayerInfo, setCollectPayerInfo] = useState(false);
  const [payerInfoRequests, setPayerInfoRequests] = useState({
    email: { enabled: false, optional: false },
    physicalAddress: { enabled: false, optional: false },
    phoneNumber: { enabled: false, optional: false },
    name: { enabled: false, optional: false },
    onchainAddress: { enabled: false, optional: false },
  });
  const [callbackUrl, setCallbackUrl] = useState('');

  // Status check state
  const [statusId, setStatusId] = useState('');
  const [statusExpectedAmount, setStatusExpectedAmount] = useState('');
  const [statusExpectedRecipient, setStatusExpectedRecipient] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<PaymentStatus | null>(null);
  const [statusError, setStatusError] = useState<{ error: string; errorDetails?: unknown } | null>(
    null
  );
  const [statusTestnet, setStatusTestnet] = useState(false); // Separate testnet state for status check

  const handlePay = async () => {
    if (!payAmount || !payTo) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in amount and recipient address',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setPayLoading(true);
    setPayResult(null);
    setPayError(null);

    try {
      // Build payerInfo if enabled
      let payerInfo;
      if (collectPayerInfo) {
        const requests = [];
        Object.entries(payerInfoRequests).forEach(([type, config]) => {
          if (config.enabled) {
            requests.push({
              type,
              optional: config.optional,
            });
          }
        });

        if (requests.length > 0) {
          payerInfo = {
            requests,
            ...(callbackUrl && { callbackURL: callbackUrl }),
          };
        }
      }

      const result = await pay({
        amount: payAmount,
        to: payTo,
        testnet: useTestnet,
        walletUrl: customWalletUrl || scwUrl, // Use custom URL if provided, otherwise default
        telemetry: enableTelemetry,
        ...(payerInfo && { payerInfo }),
      });

      setPayResult(result);

      if (result.success) {
        toast({
          title: 'Payment sent!',
          description: `Transaction ID: ${result.id}`,
          status: 'success',
          duration: 5000,
        });
        // Auto-populate status check field
        setStatusId(result.id);
        setStatusExpectedAmount(payAmount);
        setStatusExpectedRecipient(payTo);
      } else {
        toast({
          title: 'Payment failed',
          description:
            'error' in result && typeof result.error === 'string' ? result.error : 'Unknown error',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Store the detailed error information
      setPayError({
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : undefined,
          stack: error instanceof Error ? error.stack : undefined,
          raw: error,
        },
        // Include payment details for context
        attemptedPayment: {
          amount: payAmount,
          to: payTo,
          testnet: useTestnet,
        },
      });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setPayLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!statusId) {
      toast({
        title: 'Missing transaction ID',
        description: 'Please enter a transaction ID to check',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (Boolean(statusExpectedAmount) !== Boolean(statusExpectedRecipient)) {
      toast({
        title: 'Incomplete expected payment',
        description: 'Provide both the expected amount and recipient, or leave both empty',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setStatusLoading(true);
    setStatusResult(null);
    setStatusError(null);

    try {
      const result = await getPaymentStatus({
        id: statusId,
        ...(statusExpectedAmount &&
          statusExpectedRecipient && {
            expectedPayment: {
              amount: statusExpectedAmount,
              recipient: statusExpectedRecipient as Address,
            },
          }),
        testnet: statusTestnet, // Use the separate status check testnet setting
      });

      setStatusResult(result);

      toast({
        title: 'Status checked',
        description: `Payment is ${result.status}`,
        status: 'info',
        duration: 3000,
      });
    } catch (error) {
      console.error('Status check error:', error);
      // Store the error details
      setStatusError({
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : undefined,
          stack: error instanceof Error ? error.stack : undefined,
          raw: error,
        },
      });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading>Payment Module Testing</Heading>

        {/* Pay Section */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg={bgColor} borderColor={borderColor}>
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between" align="center">
              <Heading size="md">Send Payment</Heading>
              <Link
                href="https://docs.base.org/base-account/reference/base-pay/pay"
                isExternal
                color="blue.500"
                fontSize="sm"
              >
                Docs <ExternalLinkIcon mx="2px" />
              </Link>
            </HStack>

            <HStack spacing={4} align="start">
              <FormControl flex={1}>
                <FormLabel>Amount (USDC)</FormLabel>
                <Input
                  placeholder="10.50"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  size="lg"
                />
              </FormControl>

              <FormControl flex={2}>
                <FormLabel>Recipient Address</FormLabel>
                <Input
                  placeholder="0x..."
                  value={payTo}
                  onChange={(e) => setPayTo(e.target.value)}
                  fontFamily="mono"
                  size="lg"
                />
              </FormControl>
            </HStack>

            <Divider />

            {/* Advanced Options Accordion */}
            <Accordion allowToggle>
              {/* Network and Core Parameters */}
              <AccordionItem border="none">
                <h2>
                  <AccordionButton>
                    <Box flex="1" textAlign="left" fontWeight="semibold">
                      Network & Core Parameters
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Network</FormLabel>
                      <Select
                        value={useTestnet ? 'testnet' : 'mainnet'}
                        onChange={(e) => setUseTestnet(e.target.value === 'testnet')}
                      >
                        <option value="testnet">Base Sepolia (Testnet)</option>
                        <option value="mainnet">Base (Mainnet)</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Custom Wallet URL</FormLabel>
                      <Input
                        placeholder={`Default: ${scwUrl}`}
                        value={customWalletUrl}
                        onChange={(e) => setCustomWalletUrl(e.target.value)}
                      />
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Enable Telemetry</FormLabel>
                      <Switch
                        isChecked={enableTelemetry}
                        onChange={(e) => setEnableTelemetry(e.target.checked)}
                      />
                    </FormControl>
                  </VStack>
                </AccordionPanel>
              </AccordionItem>

              {/* Payer Info Collection */}
              <AccordionItem border="none">
                <h2>
                  <AccordionButton>
                    <Box flex="1" textAlign="left" fontWeight="semibold">
                      Payer Information Collection
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Collect Payer Information</FormLabel>
                      <Switch
                        isChecked={collectPayerInfo}
                        onChange={(e) => setCollectPayerInfo(e.target.checked)}
                      />
                    </FormControl>

                    {collectPayerInfo && (
                      <>
                        <Box borderWidth="1px" borderRadius="md" p={4} bg={optionalBgColor}>
                          <VStack spacing={3} align="stretch">
                            <Text fontWeight="bold" fontSize="sm">
                              Information to Request
                            </Text>

                            {Object.entries(payerInfoRequests).map(([type, config]) => (
                              <HStack key={type} spacing={4}>
                                <Checkbox
                                  isChecked={config.enabled}
                                  onChange={(e) =>
                                    setPayerInfoRequests((prev) => ({
                                      ...prev,
                                      [type]: { ...prev[type], enabled: e.target.checked },
                                    }))
                                  }
                                >
                                  {type.charAt(0).toUpperCase() +
                                    type.slice(1).replace(/([A-Z])/g, ' $1')}
                                </Checkbox>
                                {config.enabled && (
                                  <Checkbox
                                    size="sm"
                                    isChecked={config.optional}
                                    onChange={(e) =>
                                      setPayerInfoRequests((prev) => ({
                                        ...prev,
                                        [type]: { ...prev[type], optional: e.target.checked },
                                      }))
                                    }
                                  >
                                    Optional
                                  </Checkbox>
                                )}
                              </HStack>
                            ))}
                          </VStack>
                        </Box>

                        <FormControl>
                          <FormLabel>Callback URL</FormLabel>
                          <Input
                            placeholder="https://example.com/callback"
                            value={callbackUrl}
                            onChange={(e) => setCallbackUrl(e.target.value)}
                          />
                        </FormControl>
                      </>
                    )}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>

            <Button
              colorScheme="blue"
              onClick={handlePay}
              isLoading={payLoading}
              loadingText="Sending..."
              size="lg"
              width="full"
            >
              Send Payment
            </Button>

            {(payResult || payError) && (
              <Box p={4} bg={codeBgColor} borderRadius="md" overflowX="auto">
                <Text fontWeight="bold" mb={2}>
                  {payError ? 'Error:' : 'Result:'}
                </Text>
                <Code display="block" whiteSpace="pre" fontSize="sm">
                  {JSON.stringify(payError || payResult, null, 2)}
                </Code>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Raw Parameters Display */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg={bgColor} borderColor={borderColor}>
          <VStack spacing={4} align="stretch">
            <Heading size="md">Current Parameters (Raw)</Heading>

            <Box p={4} bg={codeBgColor} borderRadius="md" overflowX="auto">
              <Code display="block" whiteSpace="pre" fontSize="sm">
                {`pay({
  amount: "${payAmount}",
  to: "${payTo}"${
    !useTestnet
      ? `,
  testnet: false`
      : ''
  }${
    customWalletUrl
      ? `,
  walletUrl: "${customWalletUrl}"`
      : ''
  }${
    !enableTelemetry
      ? `,
  telemetry: false`
      : ''
  }${
    collectPayerInfo && payerInfoRequests && Object.values(payerInfoRequests).some((r) => r.enabled)
      ? `,
  payerInfo: ${JSON.stringify(
    {
      requests: Object.entries(payerInfoRequests)
        .filter(([_, config]) => config.enabled)
        .map(([type, config]) => ({ type, optional: config.optional })),
      ...(callbackUrl && { callbackURL: callbackUrl }),
    },
    null,
    2
  )
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n')}`
      : ''
  }
});`}
              </Code>
            </Box>
          </VStack>
        </Box>

        {/* Status Check Section */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg={bgColor} borderColor={borderColor}>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between" align="center">
              <Heading size="md">Check Payment Status</Heading>
              <Link
                href="https://docs.base.org/base-account/reference/base-pay/getPaymentStatus"
                isExternal
                color="blue.500"
                fontSize="sm"
              >
                Docs <ExternalLinkIcon mx="2px" />
              </Link>
            </HStack>

            <FormControl display="flex" alignItems="center" mb={4}>
              <FormLabel mb="0">Use Testnet</FormLabel>
              <Switch
                isChecked={statusTestnet}
                onChange={(e) => setStatusTestnet(e.target.checked)}
              />
              <Text ml={3} fontSize="sm" color={noteTextColor}>
                {statusTestnet ? 'Base Sepolia' : 'Base Mainnet'}
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Transaction ID</FormLabel>
              <Input
                placeholder="0x..."
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                fontFamily="mono"
                size="lg"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Expected Amount (USDC, optional)</FormLabel>
              <Input
                placeholder="0.01"
                value={statusExpectedAmount}
                onChange={(e) => setStatusExpectedAmount(e.target.value)}
                size="lg"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Expected Recipient (optional)</FormLabel>
              <Input
                placeholder="0x..."
                value={statusExpectedRecipient}
                onChange={(e) => setStatusExpectedRecipient(e.target.value)}
                fontFamily="mono"
                size="lg"
              />
              <Text mt={2} fontSize="sm" color={noteTextColor}>
                Production merchants should load both values from their server-side order.
              </Text>
            </FormControl>

            <Button
              colorScheme="green"
              onClick={handleCheckStatus}
              isLoading={statusLoading}
              loadingText="Checking..."
              size="lg"
              width="full"
            >
              Check Status
            </Button>

            {(statusResult || statusError) && (
              <Box p={4} bg={codeBgColor} borderRadius="md" overflowX="auto">
                <Text fontWeight="bold" mb={2}>
                  {statusError ? 'Error:' : 'Status:'}
                </Text>
                <Code display="block" whiteSpace="pre" fontSize="sm">
                  {JSON.stringify(statusError || statusResult, null, 2)}
                </Code>
              </Box>
            )}
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}

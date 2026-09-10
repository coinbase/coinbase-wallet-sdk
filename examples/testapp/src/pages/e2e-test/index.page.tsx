import { CopyIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  Container,
  Flex,
  Heading,
  Link,
  Radio,
  RadioGroup,
  Stack,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useRef } from 'react';
import { WIDTH_2XL } from '../../components/Layout';
import { UserInteractionModal } from '../../components/UserInteractionModal';
import { useConfig } from '../../context/ConfigContextProvider';
import { useUserInteraction } from '../../hooks/useUserInteraction';
import type { SDKSource } from '../../utils/sdkLoader';

// Import refactored modules
import { TEST_DELAYS, UI_COLORS } from '../../utils/e2e-test-config';
import { useConnectionState } from './hooks/useConnectionState';
import { useSDKState } from './hooks/useSDKState';
import { useTestRunner } from './hooks/useTestRunner';
import { useTestState } from './hooks/useTestState';
import { formatTestResults, getStatusColor, getStatusIcon } from './utils/format-results';

export default function E2ETestPage() {
  const toast = useToast();
  const { scwUrl } = useConfig();
  const { isModalOpen, currentTestName, requestUserInteraction, handleContinue, handleCancel } =
    useUserInteraction();

  // Test data refs (use refs instead of state to avoid async state update issues)
  const paymentIdRef = useRef<string | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const permissionHashRef = useRef<string | null>(null);

  // State management hooks
  const testState = useTestState();
  const { testCategories, runningSectionName, isRunningTests } = testState;

  const { sdkSource, loadedSDK, provider, isLoadingSDK, setSdkSource, loadAndInitializeSDK } =
    useSDKState();

  const connectionState = useConnectionState();
  const { connected, currentAccount, allAccounts, chainId } = connectionState;

  // Test runner hook - handles all test execution logic
  const { runAllTests, runTestSection, runSCWReleaseTests } = useTestRunner({
    testState,
    connectionState,
    loadedSDK,
    provider,
    requestUserInteraction,
    paymentIdRef,
    subscriptionIdRef,
    permissionHashRef,
    walletUrl: scwUrl,
  });

  // Copy functions for test results
  const copyTestResults = async () => {
    const resultsText = formatTestResults(testCategories, {
      format: 'full',
      sdkInfo: {
        version: loadedSDK?.VERSION || 'Not Loaded',
        source: sdkSource === 'npm' ? 'NPM Latest' : 'Local Workspace',
      },
    });

    try {
      await navigator.clipboard.writeText(resultsText);
      toast({
        title: 'Copied!',
        description: 'Test results copied to clipboard',
        status: 'success',
        duration: TEST_DELAYS.TOAST_SUCCESS_DURATION,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        status: 'error',
        duration: TEST_DELAYS.TOAST_ERROR_DURATION,
        isClosable: true,
      });
    }
  };

  const copyAbbreviatedResults = async () => {
    const resultsText = formatTestResults(testCategories, {
      format: 'abbreviated',
      sdkInfo: {
        version: loadedSDK?.VERSION || 'Not Loaded',
        source: sdkSource === 'npm' ? 'NPM Latest' : 'Local Workspace',
      },
    });

    try {
      await navigator.clipboard.writeText(resultsText);
      toast({
        title: 'Copied!',
        description: 'Abbreviated results copied to clipboard',
        status: 'success',
        duration: TEST_DELAYS.TOAST_SUCCESS_DURATION,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        status: 'error',
        duration: TEST_DELAYS.TOAST_ERROR_DURATION,
        isClosable: true,
      });
    }
  };

  const copySectionResults = async (categoryName: string) => {
    const resultsText = formatTestResults(testCategories, {
      format: 'section',
      categoryName,
      sdkInfo: {
        version: loadedSDK?.VERSION || 'Not Loaded',
        source: sdkSource === 'npm' ? 'NPM Latest' : 'Local Workspace',
      },
    });

    try {
      await navigator.clipboard.writeText(resultsText);
      toast({
        title: 'Copied!',
        description: `${categoryName} results copied to clipboard`,
        status: 'success',
        duration: TEST_DELAYS.TOAST_SUCCESS_DURATION,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        status: 'error',
        duration: TEST_DELAYS.TOAST_ERROR_DURATION,
        isClosable: true,
      });
    }
  };

  // Initialize/reload SDK when source or wallet URL changes.
  useEffect(() => {
    loadAndInitializeSDK({ walletUrl: scwUrl });
  }, [loadAndInitializeSDK, scwUrl, sdkSource]);

  // Helper for source change
  const handleSourceChange = (source: SDKSource) => {
    setSdkSource(source);
  };

  return (
    <>
      <UserInteractionModal
        isOpen={isModalOpen}
        testName={currentTestName}
        onContinue={handleContinue}
        onCancel={handleCancel}
      />
      <Container maxW={WIDTH_2XL} py={8}>
        {/* SDK Source Controls */}
        <Card mb={6}>
          <CardBody>
            <Flex justify="space-between" align="center" gap={4}>
              <Box>
                <Heading size="md">SDK Configuration</Heading>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Choose which SDK version to test
                </Text>
              </Box>
              <Flex align="center" gap={3}>
                <RadioGroup
                  value={sdkSource}
                  onChange={(value) => handleSourceChange(value as SDKSource)}
                  size="md"
                  isDisabled={isLoadingSDK}
                >
                  <Stack direction="row" spacing={4}>
                    <Radio value="local" colorScheme="purple">
                      Local
                    </Radio>
                    <Radio value="npm" colorScheme="purple">
                      NPM Latest
                    </Radio>
                  </Stack>
                </RadioGroup>

                {isLoadingSDK && (
                  <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                    Loading...
                  </Badge>
                )}

                <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
                  v{loadedSDK?.VERSION || 'Not Loaded'}
                </Badge>
              </Flex>
            </Flex>
          </CardBody>
        </Card>
        <VStack spacing={6} align="stretch">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <Heading size="md">Wallet Connection Status</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Flex align="center" gap={3}>
                  <Box
                    w={3}
                    h={3}
                    borderRadius="full"
                    bg={connected ? UI_COLORS.STATUS.CONNECTED : UI_COLORS.STATUS.DISCONNECTED}
                    boxShadow={connected ? '0 0 10px rgba(72, 187, 120, 0.6)' : 'none'}
                  />
                  <Text fontSize="lg" fontWeight="bold">
                    {connected ? 'Connected' : 'Not Connected'}
                  </Text>
                  {connected && <Badge colorScheme="green">Active</Badge>}
                </Flex>

                {connected && currentAccount && (
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        Connected Account{allAccounts.length > 1 ? 's' : ''}
                      </Text>
                      <VStack align="stretch" spacing={2}>
                        {allAccounts.map((account, index) => (
                          <Code
                            key={account}
                            fontSize="xs"
                            p={2}
                            borderRadius="md"
                            display="block"
                            bg={index === 0 ? 'blue.50' : undefined}
                            borderWidth={index === 0 ? '2px' : undefined}
                            borderColor={index === 0 ? 'blue.300' : undefined}
                          >
                            {account}
                          </Code>
                        ))}
                      </VStack>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>
                        Active Network Chain ID
                      </Text>
                      <Flex align="center" gap={2}>
                        <Badge colorScheme="blue" fontSize="md" p={2}>
                          {chainId || 'Unknown'}
                        </Badge>
                      </Flex>
                    </Box>
                  </VStack>
                )}

                {!connected && (
                  <Box p={4} bg="gray.50" borderRadius="md" _dark={{ bg: 'gray.800' }}>
                    <Text fontSize="sm" color="gray.600">
                      No wallet connected. Run the "Connect wallet" test to establish a connection.
                    </Text>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Test Controls */}
          <Card>
            <CardBody>
              <Flex justify="space-between" align="center">
                <Box>
                  <Heading size="md">Test Controls</Heading>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Run all tests or individual test categories
                  </Text>
                </Box>
                <Flex gap={3}>
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={runSCWReleaseTests}
                    isLoading={isRunningTests}
                    loadingText="Running Tests..."
                  >
                    Keys / TBA Release
                  </Button>
                  <Button
                    colorScheme="purple"
                    size="lg"
                    onClick={runAllTests}
                    isLoading={isRunningTests}
                    loadingText="Running Tests..."
                  >
                    SDK Release
                  </Button>
                </Flex>
              </Flex>
            </CardBody>
          </Card>

          {/* Test Results Summary */}
          <Card>
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Heading size="md">Test Results</Heading>
                <Flex gap={2}>
                  <Tooltip label="Copy abbreviated results (passed/failed only)" placement="left">
                    <Button
                      size="sm"
                      colorScheme="purple"
                      variant="outline"
                      onClick={copyAbbreviatedResults}
                      isDisabled={
                        testCategories.reduce((acc, cat) => acc + cat.tests.length, 0) === 0
                      }
                      leftIcon={<CopyIcon />}
                    >
                      Copy Short
                    </Button>
                  </Tooltip>
                  <Tooltip label="Copy detailed test results with failure reasons" placement="left">
                    <Button
                      size="sm"
                      colorScheme="purple"
                      onClick={copyTestResults}
                      isDisabled={
                        testCategories.reduce((acc, cat) => acc + cat.tests.length, 0) === 0
                      }
                      leftIcon={<CopyIcon />}
                    >
                      Copy Full
                    </Button>
                  </Tooltip>
                </Flex>
              </Flex>
            </CardHeader>
            <CardBody>
              <StatGroup>
                <Stat>
                  <StatLabel>Total Tests</StatLabel>
                  <StatNumber>
                    {testCategories.reduce((acc, cat) => acc + cat.tests.length, 0)}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Passed</StatLabel>
                  <StatNumber color={UI_COLORS.STATUS.PASSED}>
                    {testCategories.reduce(
                      (acc, cat) => acc + cat.tests.filter((t) => t.status === 'passed').length,
                      0
                    )}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Failed</StatLabel>
                  <StatNumber color={UI_COLORS.STATUS.FAILED}>
                    {testCategories.reduce(
                      (acc, cat) => acc + cat.tests.filter((t) => t.status === 'failed').length,
                      0
                    )}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Skipped</StatLabel>
                  <StatNumber color={UI_COLORS.STATUS.SKIPPED}>
                    {testCategories.reduce(
                      (acc, cat) => acc + cat.tests.filter((t) => t.status === 'skipped').length,
                      0
                    )}
                  </StatNumber>
                </Stat>
              </StatGroup>
            </CardBody>
          </Card>

          {/* Test Categories */}
          <Tabs variant="enclosed" colorScheme="purple">
            <TabList>
              <Tab>Test Categories</Tab>
            </TabList>

            <TabPanels>
              {/* Test Categories Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {testCategories.map((category) => (
                    <Card key={category.name}>
                      <CardHeader>
                        <Flex justify="space-between" align="center">
                          <Box flex="1">
                            <Heading size="md">{category.name}</Heading>
                          </Box>
                          <Flex gap={2} align="center">
                            <Badge colorScheme="purple">
                              {category.tests.length} test{category.tests.length !== 1 ? 's' : ''}
                            </Badge>
                            <Tooltip label="Copy section results" placement="top">
                              <Button
                                size="sm"
                                colorScheme="purple"
                                variant="ghost"
                                onClick={() => copySectionResults(category.name)}
                                isDisabled={category.tests.length === 0}
                              >
                                <CopyIcon />
                              </Button>
                            </Tooltip>
                            <Button
                              size="sm"
                              colorScheme="purple"
                              variant="outline"
                              onClick={() => runTestSection(category.name)}
                              isLoading={runningSectionName === category.name}
                              isDisabled={
                                isRunningTests ||
                                (runningSectionName !== null &&
                                  runningSectionName !== category.name)
                              }
                              loadingText="Running..."
                            >
                              ▶ Run Section
                            </Button>
                          </Flex>
                        </Flex>
                      </CardHeader>
                      <CardBody>
                        {category.tests.length === 0 ? (
                          <Text color="gray.500" fontSize="sm">
                            No tests run yet
                          </Text>
                        ) : (
                          <VStack spacing={3} align="stretch">
                            {category.tests.map((test) => (
                              <Box
                                key={test.name}
                                p={4}
                                borderWidth="1px"
                                borderRadius="md"
                                borderColor={getStatusColor(test.status)}
                                bg={
                                  test.status === 'failed'
                                    ? 'red.50'
                                    : test.status === 'passed'
                                      ? 'green.50'
                                      : 'gray.50'
                                }
                                _dark={{
                                  bg:
                                    test.status === 'failed'
                                      ? 'red.900'
                                      : test.status === 'passed'
                                        ? 'green.900'
                                        : 'gray.800',
                                }}
                              >
                                <Flex justify="space-between" align="center">
                                  <Flex align="center" gap={2}>
                                    <Text fontSize="lg">{getStatusIcon(test.status)}</Text>
                                    <Text fontWeight="medium">{test.name}</Text>
                                  </Flex>
                                  {test.duration && (
                                    <Badge colorScheme="gray">{test.duration}ms</Badge>
                                  )}
                                </Flex>
                                {test.details && (
                                  <Text fontSize="sm" color="gray.600" mt={2}>
                                    {test.details}
                                  </Text>
                                )}
                                {test.error && (
                                  <Box mt={2} p={2} bg="red.100" borderRadius="md">
                                    <Text fontSize="sm" color="red.700">
                                      Error: {test.error}
                                    </Text>
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </VStack>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Documentation Link */}
          <Card>
            <CardBody>
              <Flex justify="center" align="center" gap={2}>
                <Text>📚 For more information, visit the</Text>
                <Link
                  href="https://docs.base.org/base-account"
                  isExternal
                  color="purple.500"
                  fontWeight="bold"
                >
                  Coinbase Wallet Documentation
                </Link>
              </Flex>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </>
  );
}

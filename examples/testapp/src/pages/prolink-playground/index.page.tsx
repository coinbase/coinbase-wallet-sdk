import { createProlinkUrl, decodeProlink, encodeProlink } from '@base-org/account';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { encodeFunctionData, type Address } from 'viem';

// Token configuration
const TOKENS = {
  USDC: {
    name: 'USDC',
    decimals: 6,
    addresses: {
      '8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
      '84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
      '1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum mainnet
    },
  },
  ETH: {
    name: 'ETH',
    decimals: 18,
    addresses: {
      '8453': '0x0000000000000000000000000000000000000000',
      '84532': '0x0000000000000000000000000000000000000000',
      '1': '0x0000000000000000000000000000000000000000',
    },
  },
} as const;

// ERC20 transfer ABI
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export default function ProlinkPlayground() {
  const toast = useToast();

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBgColor = useColorModeValue('gray.50', 'gray.900');
  const simpleModeBgColor = useColorModeValue('blue.50', 'blue.900');
  const simpleModeBorderColor = useColorModeValue('blue.200', 'blue.700');

  // Method selection
  const [methodType, setMethodType] = useState<'wallet_sendCalls' | 'generic'>('wallet_sendCalls');

  // Common fields
  const [chainId, setChainId] = useState('8453'); // Base

  // wallet_sendCalls fields
  const [callsTo, setCallsTo] = useState('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'); // USDC on Base
  const [callsData, setCallsData] = useState(
    '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40'
  ); // ERC20 transfer
  const [callsValue, setCallsValue] = useState('0x0');
  const [callsVersion, setCallsVersion] = useState('1.0');

  // Simple mode for wallet_sendCalls
  const [useSimpleMode, setUseSimpleMode] = useState(true);
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'ETH'>('USDC');
  const [tokenAmount, setTokenAmount] = useState('10000'); // 1 cent USDC in wei (6 decimals)
  const [recipientAddress, setRecipientAddress] = useState(
    '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51'
  );

  // Generic JSON-RPC fields
  const [genericMethod, setGenericMethod] = useState('eth_sendTransaction');
  const [genericParams, setGenericParams] = useState(
    JSON.stringify(
      [
        {
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          value: '0x100',
          data: '0x',
        },
      ],
      null,
      2
    )
  );

  // Capabilities
  const [useCapabilities, setUseCapabilities] = useState(false);
  const [capabilitiesJson, setCapabilitiesJson] = useState(
    JSON.stringify(
      {
        dataCallback: {
          callbackURL: 'https://example.com/callback',
          events: [
            { type: 'initiated', context: { orderId: '123' } },
            { type: 'preSign', context: { shippingTier: 'express' } },
            { type: 'postSign', context: { webhookTag: 'after' } },
          ],
        },
      },
      null,
      2
    )
  );

  // Results
  const [loading, setLoading] = useState(false);
  const [encodedPayload, setEncodedPayload] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decodedResult, setDecodedResult] = useState<unknown>(null);
  const [webhookUuid, setWebhookUuid] = useState<string | null>(null);

  // Decode section
  const [decodeInput, setDecodeInput] = useState('');
  const [decodeLoading, setDecodeLoading] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [decodeResult, setDecodeResult] = useState<unknown>(null);

  // Compute base deeplink from encoded payload
  const baseDeeplink = encodedPayload ? createProlinkUrl(encodedPayload) : null;

  // Auto-update calldata when simple mode fields change
  useEffect(() => {
    if (!useSimpleMode || !methodType || methodType !== 'wallet_sendCalls') return;

    try {
      const token = TOKENS[selectedToken];
      const tokenAddress =
        token.addresses[chainId as keyof typeof token.addresses] || token.addresses['8453'];

      if (selectedToken === 'ETH') {
        // For ETH, set value and empty calldata
        setCallsTo(recipientAddress);
        setCallsData('0x');
        const amountInWei = BigInt(tokenAmount || '0');
        setCallsValue(`0x${amountInWei.toString(16)}`);
      } else {
        // For ERC20 (USDC), encode transfer calldata using wei amount directly
        setCallsTo(tokenAddress);
        setCallsValue('0x0');
        const amountInWei = BigInt(tokenAmount || '0');
        const calldata = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [recipientAddress as Address, amountInWei],
        });
        setCallsData(calldata);
      }
    } catch (error) {
      // Invalid input, don't update
      console.error('Error encoding calldata:', error);
    }
  }, [useSimpleMode, selectedToken, tokenAmount, recipientAddress, chainId, methodType]);

  // Auto-generate webhook.site URL when capabilities are enabled
  useEffect(() => {
    if (!useCapabilities) return;

    const generateWebhook = async () => {
      try {
        // Use CORS proxy to avoid CORS issues in the browser
        const response = await fetch('https://corsproxy.io/?https://webhook.site/token', {
          method: 'POST',
        });
        const data = await response.json();

        if (data.uuid) {
          setWebhookUuid(data.uuid);

          // Update capabilities JSON with the webhook URL
          const capabilities = {
            dataCallback: {
              callbackURL: `https://webhook.site/${data.uuid}`,
              events: [
                { type: 'initiated', context: { orderId: '123' } },
                { type: 'preSign', context: { shippingTier: 'express' } },
                { type: 'postSign', context: { webhookTag: 'after' } },
              ],
            },
          };
          setCapabilitiesJson(JSON.stringify(capabilities, null, 2));

          toast({
            title: 'Webhook generated!',
            description: 'A temporary webhook.site URL has been created',
            status: 'success',
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Error generating webhook:', error);
        toast({
          title: 'Failed to generate webhook',
          description: 'Could not create webhook.site URL',
          status: 'error',
          duration: 3000,
        });
      }
    };

    generateWebhook();
  }, [useCapabilities, toast]);

  const generateProlink = async () => {
    setLoading(true);
    setError(null);
    setEncodedPayload('');
    setDecodedResult(null);

    try {
      let request: {
        method: string;
        params: unknown;
        chainId?: number;
        capabilities?: Record<string, unknown>;
      };

      if (methodType === 'wallet_sendCalls') {
        request = {
          method: 'wallet_sendCalls',
          params: [
            {
              version: callsVersion,
              chainId: `0x${Number.parseInt(chainId).toString(16)}`,
              calls: [
                {
                  to: callsTo,
                  data: callsData,
                  value: callsValue,
                },
              ],
            },
          ],
        };
      } else {
        // generic
        request = {
          method: genericMethod,
          params: JSON.parse(genericParams),
          chainId: Number.parseInt(chainId),
        };
      }

      // Add capabilities if enabled
      if (useCapabilities) {
        try {
          request.capabilities = JSON.parse(capabilitiesJson);
        } catch (e) {
          throw new Error(
            `Invalid capabilities JSON: ${e instanceof Error ? e.message : 'unknown'}`
          );
        }
      }

      // Encode the prolink
      const payload = await encodeProlink(request);
      setEncodedPayload(payload);

      // Decode to verify
      const decoded = await decodeProlink(payload);
      setDecodedResult(decoded);

      toast({
        title: 'Prolink generated!',
        description: `Payload size: ${payload.length} characters`,
        status: 'success',
        duration: 3000,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error generating prolink',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(encodedPayload);
      toast({
        title: 'Copied!',
        description: 'Payload copied to clipboard',
        status: 'success',
        duration: 2000,
      });
    } catch (_error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the payload manually',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const copyDeeplinkToClipboard = async () => {
    if (baseDeeplink) {
      try {
        await navigator.clipboard.writeText(baseDeeplink);
        toast({
          title: 'Copied!',
          description: 'Base deeplink copied to clipboard',
          status: 'success',
          duration: 2000,
        });
      } catch (_error) {
        toast({
          title: 'Failed to copy',
          description: 'Please copy the link manually',
          status: 'error',
          duration: 3000,
        });
      }
    }
  };

  const decodePayload = async () => {
    setDecodeLoading(true);
    setDecodeError(null);
    setDecodeResult(null);

    try {
      const decoded = await decodeProlink(decodeInput.trim());
      setDecodeResult(decoded);

      toast({
        title: 'Prolink decoded!',
        description: `Method: ${decoded.method}`,
        status: 'success',
        duration: 3000,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setDecodeError(errorMessage);
      toast({
        title: 'Error decoding prolink',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setDecodeLoading(false);
    }
  };

  const copyDecodedToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(decodeResult, null, 2));
      toast({
        title: 'Copied!',
        description: 'Decoded result copied to clipboard',
        status: 'success',
        duration: 2000,
      });
    } catch (_error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the result manually',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading>Prolink Playground</Heading>
        <Text color="gray.600">
          Encode and decode compressed, URL-safe payloads for wallet_sendCalls and generic JSON-RPC
          requests
        </Text>

        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Encode</Tab>
            <Tab>Decode</Tab>
          </TabList>

          <TabPanels>
            {/* Encode Tab */}
            <TabPanel px={0}>
              <HStack mb={4}>
                <Heading size="md">encodeProlink</Heading>
                <Link
                  href="https://docs.base.org/base-account/reference/prolink-utilities/encodeProlink"
                  isExternal
                  color="blue.500"
                  fontSize="sm"
                >
                  Docs <ExternalLinkIcon mx="2px" />
                </Link>
              </HStack>
              {/* Method Selection */}
              <Box borderWidth="1px" borderRadius="lg" p={6} bg={bgColor} borderColor={borderColor}>
                <VStack spacing={6} align="stretch">
                  <FormControl>
                    <FormLabel>Method Type</FormLabel>
                    <Select
                      value={methodType}
                      onChange={(e) =>
                        setMethodType(e.target.value as 'wallet_sendCalls' | 'generic')
                      }
                      size="lg"
                    >
                      <option value="wallet_sendCalls">wallet_sendCalls (EIP-5792)</option>
                      <option value="generic">Generic JSON-RPC</option>
                    </Select>
                  </FormControl>

                  <Divider />

                  {/* Method-specific fields */}
                  {methodType === 'wallet_sendCalls' && (
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between" align="center">
                        <Heading size="sm">wallet_sendCalls Parameters</Heading>
                        <HStack>
                          <Text fontSize="sm" color="gray.600">
                            Advanced Mode
                          </Text>
                          <Switch
                            isChecked={!useSimpleMode}
                            onChange={(e) => setUseSimpleMode(!e.target.checked)}
                            colorScheme="blue"
                          />
                        </HStack>
                      </HStack>

                      <FormControl>
                        <FormLabel>Chain ID</FormLabel>
                        <Select value={chainId} onChange={(e) => setChainId(e.target.value)}>
                          <option value="8453">Base (8453)</option>
                          <option value="84532">Base Sepolia (84532)</option>
                          <option value="1">Ethereum (1)</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Version</FormLabel>
                        <Input
                          value={callsVersion}
                          onChange={(e) => setCallsVersion(e.target.value)}
                        />
                      </FormControl>

                      {useSimpleMode ? (
                        <>
                          {/* Simple Mode: Token selector and amount */}
                          <Box
                            p={4}
                            borderRadius="md"
                            bg={simpleModeBgColor}
                            borderWidth="1px"
                            borderColor={simpleModeBorderColor}
                          >
                            <VStack spacing={4} align="stretch">
                              <FormControl>
                                <FormLabel>Token</FormLabel>
                                <Select
                                  value={selectedToken}
                                  onChange={(e) => {
                                    const newToken = e.target.value as 'USDC' | 'ETH';
                                    setSelectedToken(newToken);
                                    // Set default wei amounts when switching tokens
                                    if (newToken === 'USDC') {
                                      setTokenAmount('10000'); // 1 cent USDC
                                    } else {
                                      setTokenAmount('1000'); // dust ETH
                                    }
                                  }}
                                  bg={bgColor}
                                >
                                  <option value="USDC">USDC</option>
                                  <option value="ETH">ETH</option>
                                </Select>
                              </FormControl>
                              <FormControl>
                                <FormLabel>Amount (wei)</FormLabel>
                                <Input
                                  type="text"
                                  value={tokenAmount}
                                  onChange={(e) => setTokenAmount(e.target.value)}
                                  placeholder="10000"
                                  bg={bgColor}
                                />
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                  {selectedToken === 'USDC'
                                    ? '10000 = $0.01 (USDC has 6 decimals)'
                                    : '1000 = 0.000000000000001 ETH (dust)'}
                                </Text>
                              </FormControl>
                              <FormControl>
                                <FormLabel>Recipient Address</FormLabel>
                                <Input
                                  fontFamily="mono"
                                  value={recipientAddress}
                                  onChange={(e) => setRecipientAddress(e.target.value)}
                                  placeholder="0x..."
                                  bg={bgColor}
                                />
                              </FormControl>
                              <Text fontSize="sm" color="gray.600">
                                Calldata will be automatically encoded based on your selection
                              </Text>
                            </VStack>
                          </Box>

                          {/* Show computed values */}
                          <Box
                            p={4}
                            borderRadius="md"
                            bg={codeBgColor}
                            borderWidth="1px"
                            borderColor={borderColor}
                          >
                            <VStack spacing={3} align="stretch">
                              <Heading size="xs" mb={2}>
                                Generated Calldata
                              </Heading>
                              <FormControl>
                                <FormLabel fontSize="sm">To Address</FormLabel>
                                <Input
                                  size="sm"
                                  fontFamily="mono"
                                  value={callsTo}
                                  isReadOnly
                                  bg={bgColor}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel fontSize="sm">Data (hex)</FormLabel>
                                <Textarea
                                  size="sm"
                                  fontFamily="mono"
                                  value={callsData}
                                  isReadOnly
                                  rows={3}
                                  bg={bgColor}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel fontSize="sm">Value (hex)</FormLabel>
                                <Input
                                  size="sm"
                                  fontFamily="mono"
                                  value={callsValue}
                                  isReadOnly
                                  bg={bgColor}
                                />
                              </FormControl>
                            </VStack>
                          </Box>
                        </>
                      ) : (
                        <>
                          {/* Advanced Mode: Raw calldata inputs */}
                          <FormControl>
                            <FormLabel>To Address</FormLabel>
                            <Input
                              fontFamily="mono"
                              value={callsTo}
                              onChange={(e) => setCallsTo(e.target.value)}
                              placeholder="0x..."
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Data (hex)</FormLabel>
                            <Textarea
                              fontFamily="mono"
                              value={callsData}
                              onChange={(e) => setCallsData(e.target.value)}
                              placeholder="0x..."
                              rows={3}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Value (hex)</FormLabel>
                            <Input
                              fontFamily="mono"
                              value={callsValue}
                              onChange={(e) => setCallsValue(e.target.value)}
                              placeholder="0x0"
                            />
                          </FormControl>
                        </>
                      )}
                    </VStack>
                  )}

                  {methodType === 'generic' && (
                    <VStack spacing={4} align="stretch">
                      <Heading size="sm">Generic JSON-RPC Parameters</Heading>
                      <FormControl>
                        <FormLabel>Chain ID</FormLabel>
                        <Input
                          type="number"
                          value={chainId}
                          onChange={(e) => setChainId(e.target.value)}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Method</FormLabel>
                        <Input
                          value={genericMethod}
                          onChange={(e) => setGenericMethod(e.target.value)}
                          placeholder="eth_sendTransaction"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Params (JSON)</FormLabel>
                        <Textarea
                          fontFamily="mono"
                          value={genericParams}
                          onChange={(e) => setGenericParams(e.target.value)}
                          rows={10}
                          placeholder='[{ "from": "0x...", "to": "0x...", "value": "0x100" }]'
                        />
                      </FormControl>
                    </VStack>
                  )}

                  <Divider />

                  {/* Capabilities */}
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Include Capabilities</FormLabel>
                      <input
                        type="checkbox"
                        checked={useCapabilities}
                        onChange={(e) => setUseCapabilities(e.target.checked)}
                      />
                    </FormControl>
                    {useCapabilities && (
                      <FormControl>
                        <FormLabel>Capabilities JSON</FormLabel>
                        <Textarea
                          fontFamily="mono"
                          value={capabilitiesJson}
                          onChange={(e) => setCapabilitiesJson(e.target.value)}
                          rows={8}
                        />
                      </FormControl>
                    )}
                  </VStack>

                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={generateProlink}
                    isLoading={loading}
                    loadingText="Generating..."
                  >
                    Generate Prolink
                  </Button>
                </VStack>
              </Box>

              {/* Results */}
              {(encodedPayload || error) && (
                <Box
                  borderWidth="1px"
                  borderRadius="lg"
                  p={6}
                  mt={6}
                  bg={bgColor}
                  borderColor={borderColor}
                >
                  <VStack spacing={6} align="stretch">
                    <Heading size="md">Results</Heading>

                    {error && (
                      <Box
                        p={4}
                        bg="red.50"
                        borderRadius="md"
                        borderColor="red.200"
                        borderWidth="1px"
                      >
                        <Text color="red.700" fontWeight="bold">
                          Error:
                        </Text>
                        <Text color="red.600" mt={2}>
                          {error}
                        </Text>
                      </Box>
                    )}

                    {encodedPayload && (
                      <Tabs>
                        <TabList>
                          <Tab>Encoded Payload</Tab>
                          <Tab>Decoded Result</Tab>
                        </TabList>

                        <TabPanels>
                          {/* Encoded Payload Tab */}
                          <TabPanel>
                            <VStack spacing={6} align="stretch">
                              <Box>
                                <HStack mb={2}>
                                  <Text fontWeight="bold">Payload Length:</Text>
                                  <Text>{encodedPayload.length} characters</Text>
                                  <Button size="sm" onClick={copyToClipboard}>
                                    Copy
                                  </Button>
                                </HStack>
                                <Box p={4} bg={codeBgColor} borderRadius="md" overflowX="auto">
                                  <Code display="block" whiteSpace="pre-wrap" wordBreak="break-all">
                                    {encodedPayload}
                                  </Code>
                                </Box>
                              </Box>

                              <Divider />

                              {/* Base Deeplink & QR Code */}
                              <VStack spacing={4} align="stretch">
                                <Heading size="sm">Base Deeplink & QR Code</Heading>
                                <Text color="gray.600" fontSize="sm">
                                  Base App deeplink to use this prolink in the Base mobile app. The
                                  deeplink automatically includes the encoded prolink as a URL
                                  parameter.
                                </Text>

                                <Box>
                                  <HStack mb={2}>
                                    <Text fontWeight="bold">Base Deeplink URL:</Text>
                                    <Button size="sm" onClick={copyDeeplinkToClipboard}>
                                      Copy
                                    </Button>
                                  </HStack>
                                  <Box p={4} bg={codeBgColor} borderRadius="md" overflowX="auto">
                                    <Code
                                      display="block"
                                      whiteSpace="pre-wrap"
                                      wordBreak="break-all"
                                    >
                                      {baseDeeplink}
                                    </Code>
                                  </Box>
                                </Box>

                                <Box>
                                  <Text fontWeight="bold" mb={4}>
                                    QR Code:
                                  </Text>
                                  <Box
                                    display="flex"
                                    justifyContent="center"
                                    p={6}
                                    bg="white"
                                    borderRadius="md"
                                    borderWidth="1px"
                                    borderColor={borderColor}
                                  >
                                    <QRCodeSVG value={baseDeeplink} size={256} />
                                  </Box>
                                  <Text fontSize="sm" color="gray.600" mt={2} textAlign="center">
                                    Scan this QR code with the Base mobile app to execute the
                                    prolink
                                  </Text>
                                </Box>

                                {/* Show webhook.site view URL if capabilities are enabled */}
                                {useCapabilities && webhookUuid && (
                                  <Box mt={4}>
                                    <Text fontWeight="bold" mb={2}>
                                      View Data Callback Responses:
                                    </Text>
                                    <Link
                                      href={`https://webhook.site/#!/view/${webhookUuid}`}
                                      isExternal
                                      color="blue.500"
                                      fontSize="sm"
                                    >
                                      https://webhook.site/#!/view/{webhookUuid}
                                    </Link>
                                  </Box>
                                )}
                              </VStack>
                            </VStack>
                          </TabPanel>

                          {/* Decoded Result Tab */}
                          <TabPanel>
                            <Box p={4} bg={codeBgColor} borderRadius="md" overflowX="auto">
                              <Code display="block" whiteSpace="pre" fontSize="sm">
                                {JSON.stringify(decodedResult, null, 2)}
                              </Code>
                            </Box>
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    )}
                  </VStack>
                </Box>
              )}
            </TabPanel>

            {/* Decode Tab */}
            <TabPanel px={0}>
              <HStack mb={4}>
                <Heading size="md">decodeProlink</Heading>
                <Link
                  href="https://docs.base.org/base-account/reference/prolink-utilities/decodeProlink"
                  isExternal
                  color="blue.500"
                  fontSize="sm"
                >
                  Docs <ExternalLinkIcon mx="2px" />
                </Link>
              </HStack>
              <Box borderWidth="1px" borderRadius="lg" p={6} bg={bgColor} borderColor={borderColor}>
                <VStack spacing={6} align="stretch">
                  <Text color="gray.600">
                    Paste an encoded prolink payload to decode and inspect its contents
                  </Text>

                  <FormControl>
                    <FormLabel>Encoded Prolink Payload</FormLabel>
                    <Textarea
                      fontFamily="mono"
                      value={decodeInput}
                      onChange={(e) => setDecodeInput(e.target.value)}
                      placeholder="Paste base64url-encoded prolink payload here..."
                      rows={6}
                    />
                  </FormControl>

                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={decodePayload}
                    isLoading={decodeLoading}
                    loadingText="Decoding..."
                    isDisabled={!decodeInput.trim()}
                  >
                    Decode Prolink
                  </Button>
                </VStack>
              </Box>

              {/* Decode Results */}
              {(decodeResult || decodeError) && (
                <Box
                  borderWidth="1px"
                  borderRadius="lg"
                  p={6}
                  mt={6}
                  bg={bgColor}
                  borderColor={borderColor}
                >
                  <VStack spacing={6} align="stretch">
                    <Heading size="md">Decoded Result</Heading>

                    {decodeError && (
                      <Box
                        p={4}
                        bg="red.50"
                        borderRadius="md"
                        borderColor="red.200"
                        borderWidth="1px"
                      >
                        <Text color="red.700" fontWeight="bold">
                          Error:
                        </Text>
                        <Text color="red.600" mt={2}>
                          {decodeError}
                        </Text>
                      </Box>
                    )}

                    {decodeResult && (
                      <>
                        <HStack>
                          <Text fontWeight="bold">Method:</Text>
                          <Text>
                            {
                              (
                                decodeResult as {
                                  method: string;
                                }
                              ).method
                            }
                          </Text>
                          <Button size="sm" onClick={copyDecodedToClipboard}>
                            Copy JSON
                          </Button>
                        </HStack>
                        <Box p={4} bg={codeBgColor} borderRadius="md" overflowX="auto">
                          <Code display="block" whiteSpace="pre" fontSize="sm">
                            {JSON.stringify(decodeResult, null, 2)}
                          </Code>
                        </Box>
                      </>
                    )}
                  </VStack>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}

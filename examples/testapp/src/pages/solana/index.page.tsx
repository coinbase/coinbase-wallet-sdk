import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Code,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  address,
  blockhash,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import {
  SignAndSendAllTransactions,
  type SolanaSignAndSendAllTransactionsFeature,
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features';
import { getWallets } from '@wallet-standard/app';
import type { Wallet } from '@wallet-standard/base';
import {
  StandardConnect,
  type StandardConnectFeature,
  type StandardEventsFeature,
} from '@wallet-standard/features';
import { useState } from 'react';
import { WIDTH_2XL } from '../../components/Layout';
import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';
import { toDisplayableError } from '../../utils/toDisplayableError';

type SolanaFeatures = StandardConnectFeature &
  StandardEventsFeature &
  SolanaSignMessageFeature &
  SolanaSignTransactionFeature &
  SolanaSignAndSendTransactionFeature &
  SolanaSignAndSendAllTransactionsFeature;

function features(wallet: Wallet): SolanaFeatures {
  return wallet.features as Wallet['features'] & SolanaFeatures;
}

function kitTransaction(signer: string) {
  return compileTransaction(
    pipe(
      createTransactionMessage({ version: 0 }),
      (message) => setTransactionMessageFeePayer(address(signer), message),
      (message) =>
        setTransactionMessageLifetimeUsingBlockhash(
          {
            blockhash: blockhash('11111111111111111111111111111111'),
            lastValidBlockHeight: BigInt(0),
          },
          message
        )
    )
  );
}

function kitTransactionBytes(signer: string): Uint8Array {
  return Uint8Array.from(
    getTransactionEncoder().encode(kitTransaction(signer)) as ArrayLike<number>
  );
}

type ActionCardProps = {
  method: string;
  description: string;
  onSubmit: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
};

function ActionCard({
  method,
  description,
  onSubmit,
  isDisabled = false,
  isLoading = false,
}: ActionCardProps) {
  return (
    <Card shadow="lg" height="100%">
      <CardBody>
        <Flex align="center" justify="space-between" gap={3}>
          <Heading as="h3" size="md">
            <Code>{method}</Code>
          </Heading>
          <Button
            aria-label={`Submit ${method}`}
            onClick={onSubmit}
            isDisabled={isDisabled}
            isLoading={isLoading}
          >
            Submit
          </Button>
        </Flex>
        <Text mt={3} color="gray.600">
          {description}
        </Text>
      </CardBody>
    </Card>
  );
}

type PlaygroundOutput = {
  method: string;
  status: 'success' | 'error';
  value: unknown;
};

export default function SolanaPlayground() {
  const { sdk } = useEIP1193Provider();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [output, setOutput] = useState<PlaygroundOutput | null>(null);
  const [pendingMethod, setPendingMethod] = useState<string | null>(null);

  const registeredWallet = () => {
    if (wallet) return wallet;
    sdk.registerSolanaWallet();
    const registered = getWallets()
      .get()
      .find(
        (candidate) =>
          candidate.name === 'Coinbase Wallet' &&
          StandardConnect in candidate.features &&
          SolanaSignMessage in candidate.features &&
          SolanaSignTransaction in candidate.features
      );
    if (!registered) throw new Error('No compatible Solana wallet is registered');
    setWallet(registered);
    return registered;
  };

  const run = async (method: string, request: () => Promise<unknown>) => {
    setPendingMethod(method);
    try {
      const result = await request();
      setOutput({ method, status: 'success', value: result });
    } catch (error) {
      setOutput({ method, status: 'error', value: toDisplayableError(error) });
    } finally {
      setPendingMethod(null);
    }
  };

  const connect = () =>
    run(StandardConnect, async () => {
      const result = await features(registeredWallet())[StandardConnect].connect();
      const value = result.accounts[0]?.address;
      if (!value) throw new Error('Wallet did not return an account');
      setConnectedAddress(value);
      return { address: value };
    });

  const signMessage = () =>
    run(SolanaSignMessage, async () => {
      const selectedWallet = registeredWallet();
      const account = selectedWallet.accounts[0];
      if (!account) throw new Error('Connect before signing a message');
      const [result] = await features(selectedWallet)[SolanaSignMessage].signMessage({
        account,
        message: new TextEncoder().encode('Hello from the Solana SDK playground'),
      });
      return { signature: Array.from(result.signature) };
    });

  const signTransaction = () =>
    run(SolanaSignTransaction, async () => {
      if (!connectedAddress) throw new Error('Connect before signing a transaction');
      const selectedWallet = registeredWallet();
      const account = selectedWallet.accounts[0];
      if (!account) throw new Error('Connect before signing a transaction');
      const [result] = await features(selectedWallet)[SolanaSignTransaction].signTransaction({
        account,
        chain: 'solana:mainnet',
        transaction: kitTransactionBytes(connectedAddress),
      });
      return { signedTransaction: Array.from(result.signedTransaction) };
    });

  const signAndSendTransaction = () =>
    run(SolanaSignAndSendTransaction, async () => {
      if (!connectedAddress) throw new Error('Connect before signing and sending a transaction');
      const selectedWallet = registeredWallet();
      const account = selectedWallet.accounts[0];
      if (!account) throw new Error('Connect before signing and sending a transaction');
      const feature = features(selectedWallet)[SolanaSignAndSendTransaction];
      if (!feature) throw new Error('Wallet does not support signAndSendTransaction');
      const [result] = await feature.signAndSendTransaction({
        account,
        chain: 'solana:mainnet',
        transaction: kitTransactionBytes(connectedAddress),
      });
      return { signature: Array.from(result.signature) };
    });

  const signAndSendAllTransactions = () =>
    run(SignAndSendAllTransactions, async () => {
      if (!connectedAddress) throw new Error('Connect before signing and sending transactions');
      const selectedWallet = registeredWallet();
      const account = selectedWallet.accounts[0];
      if (!account) throw new Error('Connect before signing and sending transactions');
      const feature = features(selectedWallet)[SignAndSendAllTransactions];
      if (!feature) throw new Error('Wallet does not support signAndSendAllTransactions');
      const results = await feature.signAndSendAllTransactions(
        [
          {
            account,
            chain: 'solana:mainnet',
            transaction: kitTransactionBytes(connectedAddress),
          },
          {
            account,
            chain: 'solana:mainnet',
            transaction: kitTransactionBytes(connectedAddress),
          },
        ],
        { mode: 'serial' }
      );
      return results.map((result) =>
        result.status === 'fulfilled'
          ? { status: result.status, signature: Array.from(result.value.signature) }
          : { status: result.status, reason: String(result.reason) }
      );
    });

  return (
    <Container maxW={WIDTH_2XL} mb={8}>
      <Stack spacing={6}>
        <Box>
          <Heading size="lg">Solana Wallet Standard</Heading>
          <Text mt={2} color="gray.600" maxW="3xl">
            Register the Coinbase Wallet SDK, establish a Solana session, and exercise each exposed
            Wallet Standard signing feature.
          </Text>
        </Box>

        <Card shadow="lg">
          <CardBody>
            <Flex
              align={{ base: 'flex-start', md: 'center' }}
              justify="space-between"
              direction={{ base: 'column', md: 'row' }}
              gap={3}
            >
              <Box>
                <Heading as="h2" size="md">
                  Connection
                </Heading>
                <Text mt={1} color="gray.600">
                  The signing cards unlock after Wallet Standard returns an account.
                </Text>
              </Box>
              <HStack spacing={3}>
                <Badge colorScheme={connectedAddress ? 'green' : 'gray'}>
                  {connectedAddress ? 'Connected' : 'Not connected'}
                </Badge>
                {connectedAddress && <Code>{connectedAddress}</Code>}
              </HStack>
            </Flex>
          </CardBody>
        </Card>

        <Box>
          <Heading size="md">Wallet Connection</Heading>
          <Grid mt={2} templateColumns={{ base: '100%', md: 'repeat(2, 50%)' }} gap={2}>
            <GridItem w="100%">
              <ActionCard
                method={StandardConnect}
                description="Register Coinbase Wallet with Wallet Standard and request the active Solana account."
                onSubmit={connect}
                isLoading={pendingMethod === StandardConnect}
              />
            </GridItem>
          </Grid>
        </Box>

        <Box>
          <Heading size="md">Signing Methods</Heading>
          <Grid
            mt={2}
            templateColumns={{
              base: '100%',
              md: 'repeat(2, 50%)',
              xl: 'repeat(3, 33%)',
            }}
            gap={2}
          >
            <GridItem w="100%">
              <ActionCard
                method={SolanaSignMessage}
                description="Sign a UTF-8 message with the connected Solana account."
                onSubmit={signMessage}
                isDisabled={!connectedAddress}
                isLoading={pendingMethod === SolanaSignMessage}
              />
            </GridItem>
            <GridItem w="100%">
              <ActionCard
                method={SolanaSignTransaction}
                description="Build a versioned transaction with Solana Kit and request its signed bytes."
                onSubmit={signTransaction}
                isDisabled={!connectedAddress}
                isLoading={pendingMethod === SolanaSignTransaction}
              />
            </GridItem>
            <GridItem w="100%">
              <ActionCard
                method={SolanaSignAndSendTransaction}
                description="Request one transaction signature and submit it through the wallet."
                onSubmit={signAndSendTransaction}
                isDisabled={!connectedAddress}
                isLoading={pendingMethod === SolanaSignAndSendTransaction}
              />
            </GridItem>
            <GridItem w="100%">
              <ActionCard
                method={SignAndSendAllTransactions}
                description="Submit two transactions as one serial Wallet Standard batch."
                onSubmit={signAndSendAllTransactions}
                isDisabled={!connectedAddress}
                isLoading={pendingMethod === SignAndSendAllTransactions}
              />
            </GridItem>
          </Grid>
        </Box>

        <Box>
          <Heading size="md">Latest Result</Heading>
          <Card shadow="lg" mt={2}>
            <CardBody>
              <Flex align="center" justify="space-between" mb={3}>
                <Code>{output?.method ?? 'No request submitted'}</Code>
                {output && (
                  <Badge colorScheme={output.status === 'success' ? 'green' : 'red'}>
                    {output.status}
                  </Badge>
                )}
              </Flex>
              <Code
                as="pre"
                display="block"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
                p={4}
                minH="80px"
                colorScheme={output?.status === 'error' ? 'red' : undefined}
              >
                {output
                  ? (JSON.stringify(output.value, null, 2) ?? 'Success')
                  : 'Submit an action to inspect its response.'}
              </Code>
            </CardBody>
          </Card>
        </Box>
      </Stack>
    </Container>
  );
}

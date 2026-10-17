import { Box, Container, Flex, Grid, GridItem, Heading, Switch, Text } from '@chakra-ui/react';
import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

import { EventListenersCard } from '../components/EventListeners/EventListenersCard';
import { WIDTH_2XL } from '../components/Layout';
import { MethodsSection } from '../components/MethodsSection/MethodsSection';
import { RpcMethodCard } from '../components/RpcMethods/RpcMethodCard';
import { connectionMethods } from '../components/RpcMethods/method/connectionMethods';
import { ephemeralMethods } from '../components/RpcMethods/method/ephemeralMethods';
import { experimentalMethods } from '../components/RpcMethods/method/experimentalMethods';
import { multiChainMethods } from '../components/RpcMethods/method/multiChainMethods';
import { readonlyJsonRpcMethods } from '../components/RpcMethods/method/readonlyJsonRpcMethods';
import { sendMethods } from '../components/RpcMethods/method/sendMethods';
import { signMessageMethods } from '../components/RpcMethods/method/signMessageMethods';
import { walletTxMethods } from '../components/RpcMethods/method/walletTxMethods';
import { connectionMethodShortcutsMap } from '../components/RpcMethods/shortcut/connectionMethodShortcuts';
import { ephemeralMethodShortcutsMap } from '../components/RpcMethods/shortcut/ephemeralMethodShortcuts';
import { baseProfileShortcutsMap } from '../components/RpcMethods/shortcut/experimentalShortcuts';
import { multiChainShortcutsMap } from '../components/RpcMethods/shortcut/multipleChainShortcuts';
import { readonlyJsonRpcShortcutsMap } from '../components/RpcMethods/shortcut/readonlyJsonRpcShortcuts';
import { sendShortcutsMap } from '../components/RpcMethods/shortcut/sendShortcuts';
import { signMessageShortcutsMap } from '../components/RpcMethods/shortcut/signMessageShortcuts';
import { walletTxShortcutsMap } from '../components/RpcMethods/shortcut/walletTxShortcuts';
import { SDKConfig } from '../components/SDKConfig/SDKConfig';
import { useEIP1193Provider } from '../context/EIP1193ProviderContextProvider';

const COOP_QUERY_KEY = 'coop';
const COOP_QUERY_VALUE = 'same-origin';

async function ensureCoopServiceWorkerReady(basePath: string) {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  await navigator.serviceWorker.register(`${basePath}/coop-service-worker.js`);
  await navigator.serviceWorker.ready;

  if (navigator.serviceWorker.controller) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 1000);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });
}

export default function Home() {
  const { provider } = useEIP1193Provider();
  const router = useRouter();
  const simulateCoop = router.query[COOP_QUERY_KEY] === COOP_QUERY_VALUE;

  const handleSimulateCoopToggle = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const url = new URL(window.location.href);

      if (event.target.checked) {
        url.searchParams.set(COOP_QUERY_KEY, COOP_QUERY_VALUE);
        try {
          await ensureCoopServiceWorkerReady(router.basePath);
        } catch {
          // Still navigate so the URL reflects the requested simulation state.
        }
      } else {
        url.searchParams.delete(COOP_QUERY_KEY);
      }

      window.location.assign(url.toString());
    },
    [router.basePath]
  );
  const [connected, setConnected] = React.useState(false);
  const [chainId, setChainId] = React.useState<number | undefined>(undefined);
  // This is for Extension compatibility, Extension with SDK3.9 does not emit connect event
  // correctly, so we manually check if the extension is connected, and set the connected state
  useEffect(() => {
    // @ts-expect-error refactor soon
    if (window.coinbaseWalletExtension) {
      setConnected(true);
    }
  }, []);

  useEffect(() => {
    provider?.on('connect', () => {
      setConnected(true);
    });
    provider?.on('chainChanged', (newChainId) => {
      setChainId(Number.parseInt(newChainId as string, 16));
    });
  }, [provider]);

  useEffect(() => {
    if (connected) {
      provider?.request({ method: 'eth_chainId' }).then((chainId) => {
        setChainId(Number.parseInt(chainId as string, 16));
      });
    }

    // Injected provider does not emit a 'connect' event
    // @ts-expect-error isCoinbaseBrowser only exists on injected providers
    if (provider?.isCoinbaseBrowser) {
      setConnected(true);
    }
  }, [connected, provider]);

  const shouldShowMethodsRequiringConnection = connected;

  return (
    <Container maxW={WIDTH_2XL} mb={8}>
      <Box>
        <Heading size="md">Event Listeners</Heading>
        <Grid mt={2} templateColumns={{ base: '100%' }} gap={2}>
          <EventListenersCard />
        </Grid>
      </Box>
      <Heading size="md" mt={4}>
        SDK Configuration (Optional)
      </Heading>
      <Box mt={4}>
        <SDKConfig />
      </Box>
      <Box mt={4}>
        <Heading size="md">Wallet Connection</Heading>
        <Grid
          mt={2}
          templateColumns={{
            base: '100%',
            md: 'repeat(2, 50%)',
            xl: 'repeat(3, 33%)',
          }}
          gap={2}
        >
          <GridItem w="100%" key="eth_requestAccounts">
            <RpcMethodCard
              method="eth_requestAccounts"
              params={[]}
              format={undefined}
              shortcuts={connectionMethodShortcutsMap.eth_requestAccounts}
            >
              <Flex align="center" justify="space-between" mt={4} pt={3} borderTopWidth={1}>
                <Text fontSize="sm" fontWeight="medium">
                  Simulate COOP
                </Text>
                <Switch isChecked={simulateCoop} onChange={handleSimulateCoopToggle} />
              </Flex>
            </RpcMethodCard>
          </GridItem>
          {connectionMethods
            .filter((rpc) => rpc.method !== 'eth_requestAccounts')
            .map((rpc) => (
              <GridItem w="100%" key={rpc.method}>
                <RpcMethodCard
                  method={rpc.method}
                  params={rpc.params}
                  format={rpc.format}
                  shortcuts={connectionMethodShortcutsMap[rpc.method]}
                />
              </GridItem>
            ))}
        </Grid>
      </Box>
      <MethodsSection
        title="Ephemeral Methods"
        methods={ephemeralMethods}
        shortcutsMap={ephemeralMethodShortcutsMap}
      />
      <MethodsSection
        title="Base Profile"
        methods={experimentalMethods}
        shortcutsMap={baseProfileShortcutsMap}
      />
      {shouldShowMethodsRequiringConnection && (
        <>
          <MethodsSection
            title="Switch/Add Chain"
            methods={multiChainMethods}
            shortcutsMap={multiChainShortcutsMap}
          />
          <MethodsSection
            title="Sign Message"
            methods={signMessageMethods}
            shortcutsMap={signMessageShortcutsMap(chainId)}
          />
          <MethodsSection title="Send" methods={sendMethods} shortcutsMap={sendShortcutsMap} />
          <MethodsSection
            title="Wallet Tx"
            methods={walletTxMethods}
            shortcutsMap={walletTxShortcutsMap}
          />
          <MethodsSection
            title="Read-only JSON-RPC Requests"
            methods={readonlyJsonRpcMethods}
            shortcutsMap={readonlyJsonRpcShortcutsMap}
          />
        </>
      )}
    </Container>
  );
}

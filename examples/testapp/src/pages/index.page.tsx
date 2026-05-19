import { Box, Container, Flex, Grid, GridItem, Heading, Switch, Text } from '@chakra-ui/react';
import React, { useCallback, useEffect } from 'react';

import { EventListenersCard } from '../components/EventListeners/EventListenersCard';
import { WIDTH_2XL } from '../components/Layout';
import { MethodsSection } from '../components/MethodsSection/MethodsSection';
import { RpcMethodCard } from '../components/RpcMethods/RpcMethodCard';
import { useConfig } from '../context/ConfigContextProvider';
import { connectionMethods } from '../components/RpcMethods/method/connectionMethods';
import { ephemeralMethods } from '../components/RpcMethods/method/ephemeralMethods';
import { multiChainMethods } from '../components/RpcMethods/method/multiChainMethods';
import { readonlyJsonRpcMethods } from '../components/RpcMethods/method/readonlyJsonRpcMethods';
import { sendMethods } from '../components/RpcMethods/method/sendMethods';
import { signMessageMethods } from '../components/RpcMethods/method/signMessageMethods';
import { walletTxMethods } from '../components/RpcMethods/method/walletTxMethods';
import { connectionMethodShortcutsMap } from '../components/RpcMethods/shortcut/connectionMethodShortcuts';
import { ephemeralMethodShortcutsMap } from '../components/RpcMethods/shortcut/ephemeralMethodShortcuts';
import { multiChainShortcutsMap } from '../components/RpcMethods/shortcut/multipleChainShortcuts';
import { readonlyJsonRpcShortcutsMap } from '../components/RpcMethods/shortcut/readonlyJsonRpcShortcuts';
import { sendShortcutsMap } from '../components/RpcMethods/shortcut/sendShortcuts';
import { signMessageShortcutsMap } from '../components/RpcMethods/shortcut/signMessageShortcuts';
import { walletTxShortcutsMap } from '../components/RpcMethods/shortcut/walletTxShortcuts';
import { SDKConfig } from '../components/SDKConfig/SDKConfig';
import { useEIP1193Provider } from '../context/EIP1193ProviderContextProvider';

export default function Home() {
  const { provider } = useEIP1193Provider();
  const { scwUrl, setScwUrlAndSave } = useConfig();

  const simulateCoop = new URL(scwUrl).searchParams.get('coop') === 'same-origin';

  const handleSimulateCoopToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = new URL(scwUrl);
      if (e.target.checked) {
        url.searchParams.set('coop', 'same-origin');
      } else {
        url.searchParams.delete('coop');
      }
      setScwUrlAndSave(url.toString() as Parameters<typeof setScwUrlAndSave>[0]);
    },
    [scwUrl, setScwUrlAndSave]
  );
  // @ts-expect-error refactor soon
  const [connected, setConnected] = React.useState(Boolean(provider?.connected));
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
      // @ts-expect-error refactor soon
      setChainId(newChainId);
    });
  }, [provider]);

  useEffect(() => {
    if (connected) {
      provider?.request({ method: 'eth_chainId' }).then((chainId) => {
        // @ts-expect-error refactor soon
        setChainId(Number.parseInt(chainId, 16));
      });
    }

    // Injected provider does not emit a 'connect' event
    // @ts-expect-error refactor soon
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
          templateColumns={{ base: '100%', md: 'repeat(2, 50%)', xl: 'repeat(3, 33%)' }}
          gap={2}
        >
          <GridItem w="100%" key="eth_requestAccounts">
            <RpcMethodCard
              method="eth_requestAccounts"
              params={[]}
              format={undefined}
              shortcuts={connectionMethodShortcutsMap?.['eth_requestAccounts']}
            >
              <Flex align="center" justify="space-between" mt={4} pt={3} borderTopWidth={1}>
                <Text fontSize="sm" fontWeight="medium">Simulate COOP</Text>
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
                  shortcuts={connectionMethodShortcutsMap?.[rpc.method]}
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

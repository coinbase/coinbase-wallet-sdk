import { Box, Container, Grid, Heading } from '@chakra-ui/react';
import React, { useEffect } from 'react';

import { EventListenersCard } from '../components/EventListeners/EventListenersCard';
import { WIDTH_2XL } from '../components/Layout';
import { MethodsSection } from '../components/MethodsSection/MethodsSection';
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
import { useCBWSDK } from '../context/CBWSDKReactContextProvider';

export default function Home() {
  const { provider, sdkVersion } = useCBWSDK();
  const [connected, setConnected] = React.useState(Boolean(provider?.connected));
  const [chainId, setChainId] = React.useState<number | undefined>(undefined);
  // This is for Extension compatibility, Extension with SDK3.9 does not emit connect event
  // correctly, so we manually check if the extension is connected, and set the connected state
  useEffect(() => {
    if (window.coinbaseWalletExtension) {
      setConnected(true);
    }
  }, []);

  useEffect(() => {
    provider?.on('connect', () => {
      setConnected(true);
    });
    provider?.on('chainChanged', (newChainId) => {
      setChainId(newChainId);
    });
  }, [provider]);

  useEffect(() => {
    if (connected) {
      provider?.request({ method: 'eth_chainId' }).then((chainId) => {
        setChainId(Number.parseInt(chainId, 16));
      });
    }
  }, [connected, provider]);

  // There's a bug in 3.9.3 where it does not emit a 'connect' event for walletlink connections
  const shouldShowMethodsRequiringConnection = connected || sdkVersion === '3.9.3';

  return (
    <Container maxW={WIDTH_2XL} mb={8}>
      <Box>
        <Heading size="md">Event Listeners</Heading>
        <Grid mt={2} templateColumns={{ base: '100%' }} gap={2}>
          <EventListenersCard />
        </Grid>
      </Box>
      {/* TODO: once published have this include latest */}
      {sdkVersion === 'HEAD' && (
        <>
          <Heading size="md" mt={4}>
            SDK Configuration (Optional)
          </Heading>
          <Box mt={4}>
            <SDKConfig />
          </Box>
        </>
      )}
      <MethodsSection
        title="Wallet Connection"
        methods={connectionMethods}
        shortcutsMap={connectionMethodShortcutsMap}
      />
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

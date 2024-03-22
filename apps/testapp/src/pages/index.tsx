import { Box, Container, Grid, GridItem, Heading } from '@chakra-ui/react';
import React, { useEffect } from 'react';

import { EventListenersCard } from '../components/EventListeners/EventListenersCard';
import { WIDTH_2XL } from '../components/Layout';
import { connectionMethods } from '../components/RpcMethods/method/connectionMethods';
import { multiChainMethods } from '../components/RpcMethods/method/multiChainMethods';
import { readonlyJsonRpcMethods } from '../components/RpcMethods/method/readonlyJsonRpcMethods';
import { RpcRequestInput } from '../components/RpcMethods/method/RpcRequestInput';
import { sendMethods } from '../components/RpcMethods/method/sendMethods';
import { signMessageMethods } from '../components/RpcMethods/method/signMessageMethods';
import { walletTxMethods } from '../components/RpcMethods/method/walletTxMethods';
import { RpcMethodCard } from '../components/RpcMethods/RpcMethodCard';
import { multiChainShortcutsMap } from '../components/RpcMethods/shortcut/multipleChainShortcuts';
import { readonlyJsonRpcShortcutsMap } from '../components/RpcMethods/shortcut/readonlyJsonRpcShortcuts';
import { sendShortcutsMap } from '../components/RpcMethods/shortcut/sendShortcuts';
import { ShortcutType } from '../components/RpcMethods/shortcut/ShortcutType';
import { signMessageShortcutsMap } from '../components/RpcMethods/shortcut/signMessageShortcuts';
import { walletTxShortcutsMap } from '../components/RpcMethods/shortcut/walletTxShortcuts';
import { useCBWSDK } from '../context/CBWSDKReactContextProvider';

export default function Home() {
  const { provider } = useCBWSDK();
  const [connected, setConnected] = React.useState(Boolean(provider?.connected));

  // const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  useEffect(() => {
    provider?.on('connect', async () => {
      setConnected(true);
      provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x14a34' }] });
    });
  }, [provider]);

  return (
    <Container maxW={WIDTH_2XL} mb={8}>
      <Box>
        <Heading size="md">Event Listeners</Heading>
        <Grid mt={2} templateColumns={{ base: '100%' }} gap={2}>
          <EventListenersCard />
        </Grid>
      </Box>
      <MethodsSection title="Wallet Connection" methods={connectionMethods} />
      {connected && (
        <>
          <MethodsSection
            title="Switch/Add Chain"
            methods={multiChainMethods}
            shortcutsMap={multiChainShortcutsMap}
          />
          <MethodsSection
            title="Sign Message"
            methods={signMessageMethods}
            shortcutsMap={signMessageShortcutsMap(provider?.chainId)}
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

function MethodsSection({
  title,
  methods,
  shortcutsMap,
}: {
  title: string;
  methods: RpcRequestInput[];
  shortcutsMap?: Record<string, ShortcutType[]>;
}) {
  return (
    <Box mt={4}>
      <Heading size="md">{title}</Heading>
      <Grid
        mt={2}
        templateColumns={{
          base: '100%',
          md: 'repeat(2, 50%)',
          xl: 'repeat(3, 33%)',
        }}
        gap={2}
      >
        {methods.map((rpc) => (
          <GridItem w="100%" key={rpc.method}>
            <RpcMethodCard
              method={rpc.method}
              params={rpc.params}
              format={rpc.format}
              shortcuts={shortcutsMap?.[rpc.method]}
            />
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
}

import { Box, Container, Grid, GridItem, Heading } from '@chakra-ui/react';
import React from 'react';

import { EventListenersCard } from '../components/EventListeners/EventListenersCard';
import { WIDTH_2XL } from '../components/Layout';
import { connectionMethods } from '../components/RpcMethods/method/connectionMethods';
import { multiChainMethods } from '../components/RpcMethods/method/multiChainMethods';
import { RpcRequestInput } from '../components/RpcMethods/method/RpcRequestInput';
import { sendMethods } from '../components/RpcMethods/method/sendMethods';
import { signMessageMethods } from '../components/RpcMethods/method/signMessageMethods';
import { RpcMethodCard } from '../components/RpcMethods/RpcMethodCard';
import { multiChainShortcutsMap } from '../components/RpcMethods/shortcut/multipleChainShortcuts';
import { sendShortcutsMap } from '../components/RpcMethods/shortcut/sendShortcuts';
import { ShortcutType } from '../components/RpcMethods/shortcut/ShortcutType';
import { signMessageShortcutsMap } from '../components/RpcMethods/shortcut/signMessageShortcuts';

export default function Home() {
  return (
    <Container maxW={WIDTH_2XL} mb={8}>
      <Box>
        <Heading size="md">Event Listeners</Heading>
        <Grid mt={2} templateColumns={{ base: '100%' }} gap={2}>
          <EventListenersCard />
        </Grid>
      </Box>
      <MethodsSection title="Wallet Connection" methods={connectionMethods} />
      <MethodsSection
        title="Switch/Add Chain"
        methods={multiChainMethods}
        shortcutsMap={multiChainShortcutsMap}
      />
      <MethodsSection
        title="Sign Message"
        methods={signMessageMethods}
        shortcutsMap={signMessageShortcutsMap}
      />
      <MethodsSection title="Send" methods={sendMethods} shortcutsMap={sendShortcutsMap} />
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
        templateColumns={{ base: '100%', md: 'repeat(2, 50%)', xl: 'repeat(3, 33%)' }}
        gap={2}
      >
        {methods.map((rpc) => (
          <GridItem w="100%" key={rpc.method}>
            <RpcMethodCard
              method={rpc.method}
              params={rpc.params}
              connected={rpc.connected}
              format={rpc.format}
              shortcuts={shortcutsMap?.[rpc.method]}
            />
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
}

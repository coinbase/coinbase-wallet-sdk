import { Box, Container, Grid, GridItem, Heading } from '@chakra-ui/react';
import React from 'react';

import { EventListenersCard } from '../components/EventListeners/EventListenersCard';
import { connectionMethods } from '../components/RpcMethods/methods/connectionMethods';
import { multiChainMethods } from '../components/RpcMethods/methods/multiChainMethods';
import { signMessageMethods } from '../components/RpcMethods/methods/signMessageMethods';
import { RpcMethod } from '../components/RpcMethods/RpcMethod';
import { RpcMethodCard } from '../components/RpcMethods/RpcMethodCard';

export default function Home() {
  return (
    <Container maxW="container.xl">
      <Box>
        <Heading size="md">Event Listeners</Heading>
        <Grid mt={2} templateColumns={{ base: '100%' }} gap={2}>
          <EventListenersCard />
        </Grid>
      </Box>
      <MethodsSection title="Wallet Connection" methods={connectionMethods} />
      <MethodsSection title="Switch/Add Chain" methods={multiChainMethods} />
      <MethodsSection title="Sign Message" methods={signMessageMethods} />
    </Container>
  );
}

function MethodsSection({ title, methods }: { title: string; methods: RpcMethod[] }) {
  return (
    <Box mt={4}>
      <Heading size="md">{title}</Heading>
      <Grid mt={2} templateColumns={{ base: '100%', md: 'repeat(2, 50%)' }} gap={2}>
        {methods.map((rpc) => (
          <GridItem w="100%" key={rpc.method}>
            <RpcMethodCard
              method={rpc.method}
              params={rpc.params}
              connected={rpc.connected}
              format={rpc.format}
            />
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
}

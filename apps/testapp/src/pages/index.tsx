import { Box, Container, Grid, GridItem, Heading } from '@chakra-ui/react';
import React from 'react';

import { EventListenersCard } from '../components/EventListeners/EventListenersCard';
import { methods } from '../components/RpcMethods';
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
      <Box mt={4}>
        <Heading size="md">Provider Methods</Heading>
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
    </Container>
  );
}

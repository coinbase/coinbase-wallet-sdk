import { Container, Grid, GridItem, Heading } from '@chakra-ui/react';
import React from 'react';

import { methods } from '../components/RpcMethods';
import { RpcMethodCard } from '../components/RpcMethods/RpcMethodCard';

export default function Home() {
  return (
    <Container maxW="container.xl">
      <Heading size="md">SDK Methods</Heading>
      <Grid templateColumns={{ base: '100%', md: 'repeat(2, 50%)' }} gap={2}>
        <GridItem w="100%"></GridItem>
      </Grid>
      <Heading size="md">Provider Methods</Heading>
      <Grid templateColumns={{ base: '100%', md: 'repeat(2, 50%)' }} gap={2}>
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
    </Container>
  );
}

import { Container, Grid, GridItem } from '@chakra-ui/react';
import React from 'react';

import { methods } from '../components/RpcMethods';
import { RpcMethodCard } from '../components/RpcMethods/RpcMethodCard';

export default function Home() {
  return (
    <Container maxW="container.xl">
      <Grid templateColumns="repeat(2, 50%)" gap={2}>
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

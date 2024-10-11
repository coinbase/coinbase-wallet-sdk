import { Box, Grid, GridItem, Heading } from '@chakra-ui/react';
import React from 'react';

import { RpcRequestInput } from '../RpcMethods/method/RpcRequestInput';
import { RpcMethodCard } from '../RpcMethods/RpcMethodCard';
import { ShortcutType } from '../RpcMethods/shortcut/ShortcutType';

export function MethodsSection({
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

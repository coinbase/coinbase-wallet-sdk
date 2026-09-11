import { Box, Grid, GridItem, Heading } from '@chakra-ui/react';

import { RpcMethodCard } from '../RpcMethods/RpcMethodCard';
import { RpcRequestInput } from '../RpcMethods/method/RpcRequestInput';
import { ShortcutType } from '../RpcMethods/shortcut/ShortcutType';

export function MethodsSection({
  title,
  methods,
  shortcutsMap,
}: {
  title?: string;
  methods: RpcRequestInput[];
  shortcutsMap?: Record<string, ShortcutType[]>;
}) {
  return (
    <Box mt={title ? 4 : 0}>
      {title ? <Heading size="md">{title}</Heading> : null}
      <Grid
        mt={title ? 2 : 0}
        templateColumns={{
          base: '1fr',
          md: 'repeat(2, 1fr)',
          xl: 'repeat(1, 1fr)',
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

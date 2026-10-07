import { Box, Button, Card, CardBody, Flex, Grid, Heading, Skeleton, Text } from '@chakra-ui/react';

import { NETWORKS, getNativeTokenSymbol } from '../constants';

type NetworkSwitcherProps = {
  currentChainId: number | null;
  onSwitchNetwork: (chainId: number) => void;
  isSwitching: boolean;
  formatUsd?: (amount: string | number, chainId?: number | null) => string | null;
  connectedBalance?: string | null;
  isLoadingBalance?: boolean;
};

export function NetworkSwitcher({
  currentChainId,
  onSwitchNetwork,
  isSwitching,
  formatUsd,
  connectedBalance,
  isLoadingBalance,
}: NetworkSwitcherProps) {
  return (
    <Card
      variant="outline"
      borderRadius="xl"
      shadow="sm"
      _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
    >
      <CardBody p={{ base: 4, md: 6 }}>
        <Heading size={{ base: 'sm', md: 'md' }} mb={4}>
          Switch Network
        </Heading>

        <Grid
          templateColumns={{
            base: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
          }}
          gap={2}
        >
          {NETWORKS.map((network) => {
            const isActive = currentChainId === network.chainId;
            return (
              <Button
                key={network.chainId}
                size="sm"
                variant={isActive ? 'solid' : 'outline'}
                colorScheme={network.color}
                onClick={() => onSwitchNetwork(network.chainId)}
                isLoading={isSwitching}
                borderRadius="lg"
                h="auto"
                py={2}
                px={3}
              >
                <Flex direction="column" align="center" gap={0.5}>
                  <Box
                    w={2}
                    h={2}
                    borderRadius="full"
                    bg={isActive ? 'white' : `${network.color}.400`}
                  />
                  <Text fontSize="xs" fontWeight="medium">
                    {network.name}
                  </Text>
                </Flex>
              </Button>
            );
          })}
        </Grid>

        {currentChainId && (
          <Flex mt={4} justify="center">
            <Text fontSize="xs" color="gray.500">
              Balance on {NETWORKS.find((n) => n.chainId === currentChainId)?.name}:{' '}
              {isLoadingBalance ? (
                <Skeleton as="span" height="14px" width="80px" display="inline-block" ml={1} />
              ) : connectedBalance !== null && connectedBalance !== undefined ? (
                <Text
                  as="span"
                  fontWeight="semibold"
                  color="gray.700"
                  _dark={{ color: 'gray.300' }}
                >
                  {Number(connectedBalance).toFixed(6)} {getNativeTokenSymbol(currentChainId)}
                  {formatUsd?.(connectedBalance, currentChainId) && (
                    <Text as="span" color="gray.500" fontWeight="normal" ml={1}>
                      ({formatUsd(connectedBalance, currentChainId)})
                    </Text>
                  )}
                </Text>
              ) : (
                <Text as="span" color="gray.400">
                  —
                </Text>
              )}
            </Text>
          </Flex>
        )}
      </CardBody>
    </Card>
  );
}

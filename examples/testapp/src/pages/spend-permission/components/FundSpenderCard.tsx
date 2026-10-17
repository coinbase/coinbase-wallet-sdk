import { RepeatIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  NumberInput,
  NumberInputField,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';

import { NETWORKS, getNativeTokenSymbol } from '../constants';
import type { SpenderBalance } from '../types';

type FundSpenderCardProps = {
  spenderBalances: SpenderBalance[];
  isFetchingBalances: boolean;
  onRefreshBalances: () => void;
  selectedChainId: number | null;
  onSelectChain: (chainId: number) => void;
  fundAmount: string;
  onFundAmountChange: (value: string) => void;
  onFundSpender: () => void;
  isFunding: boolean;
  formatUsd?: (amount: string | number, chainId?: number | null) => string | null;
};

export function FundSpenderCard({
  spenderBalances,
  isFetchingBalances,
  onRefreshBalances,
  selectedChainId,
  onSelectChain,
  fundAmount,
  onFundAmountChange,
  onFundSpender,
  isFunding,
  formatUsd,
}: FundSpenderCardProps) {
  const selectedNetwork = NETWORKS.find((n) => n.chainId === selectedChainId);

  return (
    <Card
      variant="outline"
      borderRadius="xl"
      shadow="sm"
      bg="blue.50"
      borderColor="blue.200"
      _dark={{ bg: 'blue.900', borderColor: 'blue.700' }}
    >
      <CardBody p={{ base: 4, md: 6 }}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size={{ base: 'sm', md: 'md' }}>Fund Local Spender</Heading>
          <Button
            size="xs"
            variant="ghost"
            colorScheme="blue"
            onClick={onRefreshBalances}
            isLoading={isFetchingBalances}
            leftIcon={<RepeatIcon />}
          >
            Refresh Balances
          </Button>
        </Flex>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }} mb={4}>
          Send native tokens from your connected wallet to the local spender for testing.
        </Text>

        {/* Native Token Balances */}
        <Box mb={6}>
          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
            Spender Balances (click to select)
          </Text>
          {isFetchingBalances ? (
            <VStack spacing={1}>
              <Skeleton height="24px" w="full" borderRadius="md" />
              <Skeleton height="24px" w="full" borderRadius="md" />
            </VStack>
          ) : (
            <Grid
              templateColumns={{
                base: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
              }}
              gap={2}
            >
              {spenderBalances.map((bal) => (
                <Box
                  key={bal.chainId}
                  p={2}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={selectedChainId === bal.chainId ? `${bal.color}.400` : 'gray.200'}
                  bg={selectedChainId === bal.chainId ? `${bal.color}.100` : 'white'}
                  _dark={{
                    bg: selectedChainId === bal.chainId ? `${bal.color}.800` : 'gray.800',
                    borderColor: selectedChainId === bal.chainId ? `${bal.color}.600` : 'gray.600',
                  }}
                  cursor="pointer"
                  onClick={() => onSelectChain(bal.chainId)}
                  transition="all 0.15s"
                  _hover={{
                    borderColor: `${bal.color}.400`,
                  }}
                >
                  <Flex align="center" gap={1} mb={1}>
                    <Box w={2} h={2} borderRadius="full" bg={`${bal.color}.400`} flexShrink={0} />
                    <Text
                      fontSize="xs"
                      fontWeight="medium"
                      color="gray.600"
                      _dark={{ color: 'gray.400' }}
                    >
                      {bal.chainName}
                    </Text>
                  </Flex>
                  <Text
                    fontSize="xs"
                    fontFamily="mono"
                    fontWeight={Number(bal.balance) > 0 ? 'semibold' : 'normal'}
                    color={Number(bal.balance) > 0 ? 'green.600' : 'gray.400'}
                    _dark={{
                      color: Number(bal.balance) > 0 ? 'green.400' : 'gray.500',
                    }}
                  >
                    {Number(bal.balance).toFixed(6)}
                  </Text>
                  {formatUsd?.(bal.balance, bal.chainId) && (
                    <Text fontSize="2xs" color="gray.500" _dark={{ color: 'gray.500' }}>
                      {formatUsd(bal.balance, bal.chainId)}
                    </Text>
                  )}
                </Box>
              ))}
            </Grid>
          )}
        </Box>

        {/* Send Funds Form */}
        {!selectedChainId ? (
          <Box
            p={4}
            borderRadius="lg"
            bg="gray.100"
            borderWidth="1px"
            borderColor="gray.200"
            _dark={{ bg: 'gray.900', borderColor: 'gray.700' }}
            textAlign="center"
          >
            <Text color="gray.500" fontSize="sm">
              👆 Select a network above to fund
            </Text>
          </Box>
        ) : (
          <Box
            p={4}
            borderRadius="lg"
            bg="white"
            borderWidth="1px"
            borderColor="blue.200"
            _dark={{ bg: 'gray.800', borderColor: 'blue.700' }}
          >
            <Text fontSize="sm" fontWeight="medium" mb={3}>
              Send Native Token to Local Spender
            </Text>
            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }} mb={3}>
              This will switch your wallet to the selected chain if needed.
            </Text>

            <VStack spacing={3} align="stretch">
              <Flex gap={3} align="flex-end" flexWrap="wrap">
                <FormControl flex="1" minW="120px">
                  <FormLabel fontSize="xs">
                    Amount ({getNativeTokenSymbol(selectedChainId)})
                  </FormLabel>
                  <NumberInput
                    value={fundAmount}
                    onChange={(valueString) => onFundAmountChange(valueString)}
                    min={0}
                    precision={6}
                    size="sm"
                  >
                    <NumberInputField borderRadius="md" bg="white" _dark={{ bg: 'gray.900' }} />
                  </NumberInput>
                </FormControl>

                <Button
                  colorScheme={selectedNetwork?.color || 'blue'}
                  onClick={onFundSpender}
                  isLoading={isFunding}
                  loadingText="Sending..."
                  size="sm"
                  borderRadius="lg"
                  px={6}
                >
                  Send {fundAmount} {getNativeTokenSymbol(selectedChainId)}
                  {formatUsd?.(fundAmount, selectedChainId) &&
                    ` (${formatUsd(fundAmount, selectedChainId)})`}{' '}
                  to {selectedNetwork?.name}
                </Button>
              </Flex>
            </VStack>
          </Box>
        )}
      </CardBody>
    </Card>
  );
}

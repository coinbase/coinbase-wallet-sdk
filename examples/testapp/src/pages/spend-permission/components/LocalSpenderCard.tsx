import { CopyIcon, RepeatIcon } from '@chakra-ui/icons';
import {
  Box,
  Card,
  CardBody,
  Flex,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  Tooltip,
  VStack,
  useClipboard,
} from '@chakra-ui/react';

type LocalSpenderCardProps = {
  address: string | null;
  privateKey: string | null;
  onGenerateNew: () => void;
};

export function LocalSpenderCard({ address, privateKey, onGenerateNew }: LocalSpenderCardProps) {
  const { hasCopied: hasCopiedAddress, onCopy: onCopyAddress } = useClipboard(address || '');
  const { hasCopied: hasCopiedPK, onCopy: onCopyPK } = useClipboard(privateKey || '');

  return (
    <Card
      variant="outline"
      borderRadius="xl"
      shadow="sm"
      bg="orange.50"
      borderColor="orange.200"
      _dark={{ bg: 'orange.900', borderColor: 'orange.700' }}
    >
      <CardBody p={{ base: 4, md: 6 }}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size={{ base: 'sm', md: 'md' }}>Local Spender Account</Heading>
          <Tooltip label="Generate new account" hasArrow>
            <IconButton
              aria-label="Generate new spender"
              icon={<RepeatIcon />}
              size="sm"
              variant="ghost"
              colorScheme="orange"
              onClick={onGenerateNew}
            />
          </Tooltip>
        </Flex>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }} mb={4}>
          This is a local EOA account cached in your browser. Use it as a spender for testing.
        </Text>

        <VStack spacing={3} align="stretch">
          {/* Address */}
          <Box>
            <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={1}>
              Address
            </Text>
            <InputGroup size="sm">
              <Input
                value={address || ''}
                isReadOnly
                fontFamily="mono"
                fontSize="xs"
                bg="white"
                _dark={{ bg: 'gray.800' }}
              />
              <InputRightElement>
                <Tooltip label={hasCopiedAddress ? 'Copied!' : 'Copy address'} hasArrow>
                  <IconButton
                    aria-label="Copy address"
                    icon={<CopyIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={onCopyAddress}
                    colorScheme={hasCopiedAddress ? 'green' : 'gray'}
                  />
                </Tooltip>
              </InputRightElement>
            </InputGroup>
          </Box>

          {/* Private Key (hidden by default) */}
          <Box>
            <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={1}>
              Private Key (for testing only)
            </Text>
            <InputGroup size="sm">
              <Input
                value={privateKey || ''}
                isReadOnly
                fontFamily="mono"
                fontSize="xs"
                type="password"
                bg="white"
                _dark={{ bg: 'gray.800' }}
              />
              <InputRightElement>
                <Tooltip label={hasCopiedPK ? 'Copied!' : 'Copy private key'} hasArrow>
                  <IconButton
                    aria-label="Copy private key"
                    icon={<CopyIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={onCopyPK}
                    colorScheme={hasCopiedPK ? 'green' : 'gray'}
                  />
                </Tooltip>
              </InputRightElement>
            </InputGroup>
            <Text fontSize="xs" color="red.500" mt={1}>
              ⚠️ Never use this account with real funds
            </Text>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}

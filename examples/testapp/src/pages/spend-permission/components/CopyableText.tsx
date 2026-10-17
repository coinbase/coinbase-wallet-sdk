import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { Flex, Icon, Text, Tooltip, useClipboard, type TextProps } from '@chakra-ui/react';

type CopyableTextProps = {
  /** The full value to copy */
  value: string;
  /** Optional display text (if different from value, e.g., truncated) */
  displayText?: string;
  /** Whether to show the copy icon */
  showIcon?: boolean;
  /** Tooltip label when hovering (default: "Click to copy") */
  tooltipLabel?: string;
  /** Tooltip label after copying (default: "Copied!") */
  copiedLabel?: string;
} & Omit<TextProps, 'children'>;

export function CopyableText({
  value,
  displayText,
  showIcon = true,
  tooltipLabel = 'Click to copy',
  copiedLabel = 'Copied!',
  ...textProps
}: CopyableTextProps) {
  const { hasCopied, onCopy } = useClipboard(value);

  return (
    <Tooltip label={hasCopied ? copiedLabel : tooltipLabel} hasArrow closeOnClick={false}>
      <Flex
        as="span"
        align="center"
        gap={1}
        cursor="pointer"
        onClick={onCopy}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCopy();
          }
        }}
        borderRadius="md"
        px={1.5}
        py={0.5}
        mx={-1.5}
        my={-0.5}
        transition="all 0.15s"
        _hover={{
          bg: hasCopied ? 'green.100' : 'gray.100',
          _dark: {
            bg: hasCopied ? 'green.900' : 'gray.700',
          },
        }}
        _active={{
          transform: 'scale(0.98)',
        }}
      >
        <Text
          as="span"
          fontFamily="mono"
          color={hasCopied ? 'green.600' : undefined}
          _dark={{
            color: hasCopied ? 'green.400' : undefined,
          }}
          transition="color 0.15s"
          {...textProps}
        >
          {displayText ?? value}
        </Text>
        {showIcon && (
          <Icon
            as={hasCopied ? CheckIcon : CopyIcon}
            boxSize={3}
            color={hasCopied ? 'green.500' : 'gray.400'}
            _dark={{
              color: hasCopied ? 'green.400' : 'gray.500',
            }}
            transition="all 0.15s"
            flexShrink={0}
          />
        )}
      </Flex>
    </Tooltip>
  );
}

/**
 * Helper to truncate an address or hash for display
 * e.g., "0x1234...5678"
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars + 3) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Helper to truncate a hash for display
 * e.g., "0x1234567890..."
 */
export function truncateHash(hash: string, chars = 10): string {
  if (hash.length <= chars + 3) {
    return hash;
  }
  return `${hash.slice(0, chars)}...`;
}

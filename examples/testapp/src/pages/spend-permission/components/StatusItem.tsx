import { Badge, Flex, Text } from '@chakra-ui/react';

type StatusItemProps = {
  label: string;
  status: 'yes' | 'no' | 'na' | 'error';
  yesColor?: string;
  noColor?: string;
};

export function StatusItem({
  label,
  status,
  yesColor = 'green',
  noColor = 'orange',
}: StatusItemProps) {
  const config = {
    yes: { label: 'Yes', colorScheme: yesColor },
    no: { label: 'No', colorScheme: noColor },
    na: { label: '—', colorScheme: 'gray' },
    error: { label: 'Err', colorScheme: 'red' },
  };

  const { label: statusLabel, colorScheme } = config[status];

  return (
    <Flex
      align="center"
      justify="space-between"
      bg="gray.50"
      _dark={{ bg: 'gray.700' }}
      px={2}
      py={1.5}
      borderRadius="md"
    >
      <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} fontWeight="medium">
        {label}
      </Text>
      <Badge colorScheme={colorScheme} fontSize="xs" px={1.5}>
        {statusLabel}
      </Badge>
    </Flex>
  );
}

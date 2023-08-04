import { Badge, BadgeProps } from "@chakra-ui/react";

export const BadgeBug = (props: BadgeProps) => (
  <Badge colorScheme="red" {...props} p={1} size="xs">
    🐞 Bug
  </Badge>
);

export const BadgeDeprecated = (props: BadgeProps) => (
  <Badge colorScheme="orange" {...props} p={1} size="xs">
    ⚠️ Deprecated
  </Badge>
);

export const BadgeUnsupported = (props: BadgeProps) => (
  <Badge colorScheme="orange" {...props} p={1} size="xs">
    ⚠️ Unsupported in Coinbase Wallet
  </Badge>
);

import { ReactNode } from "react";

import { usePathname, useRouter } from "next/navigation";

import { Button, Flex, Icon, Link, Text, VStack } from "@chakra-ui/react";
import { IconType } from "react-icons";
import { FiBookOpen, FiPower, FiUser } from "react-icons/fi";

import { ListLibraries } from "@/app/libraries/ListLibraries";

interface LinkItemProps {
  name: string;
  icon: IconType;
  page: string;
  newTab?: boolean;
  subContent?: ReactNode;
}

export const Sidebar = () => {
  const router = useRouter();
  const path = usePathname();
  const LinkItems: Array<LinkItemProps> = [
    {
      name: "Wallet Libraries",
      icon: FiPower,
      page: "libraries/coinbase-wallet-sdk",
      subContent: <ListLibraries />,
    },
    { name: "RPC Methods", icon: FiUser, page: "rpc" },
  ];

  return (
    <Flex direction="column" gap={3}>
      {LinkItems.map((link) => (
        <VStack key={link.name}>
          <Button
            colorScheme="blue"
            isActive={path.substr(1) === link.page}
            size="md"
            variant="ghost"
            width="100%"
            onClick={() => router.push(`/${link.page}`)}
          >
            <Flex alignItems="center" justifyContent="flex-start" width="250px">
              <Icon mr="4" fontSize="16" as={link.icon} />
              {link.name}
            </Flex>
          </Button>
          {link.subContent}
        </VStack>
      ))}
      <Text as="div" fontSize="sm" color="blackAlpha.800">
        <Link href="https://docs.cloud.coinbase.com/wallet-sdk/docs/welcome" isExternal>
          <Flex align="center" p="4" borderRadius="lg">
            <Icon mr="4" fontSize="16" as={FiBookOpen} />
            SDK Docs
          </Flex>
        </Link>
      </Text>
    </Flex>
  );
};

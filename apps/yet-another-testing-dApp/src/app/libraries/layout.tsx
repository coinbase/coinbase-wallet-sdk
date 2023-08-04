"use client";

import { usePathname } from "next/navigation";

import { Link } from "@chakra-ui/next-js";
import { Flex, Stack, Text } from "@chakra-ui/react";

import { Category } from "@/app/components/Category";
import { LIBRARIES } from "@/app/utils/libraries";

export default function LibrariesLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const pathLib = path.split("/").filter(Boolean)[1];

  const library = LIBRARIES.find((lib) => lib.name === pathLib)!;

  return (
    <Category title="SDK APIs">
      <Stack width="100%" flexDirection="row" pt={3}>
        <Flex width="150">
          <Text align="left" fontSize="xs" fontWeight="bold">
            github
          </Text>
        </Flex>
        <Flex width="80%">
          <Text align="left" fontSize="xs" overflowWrap="anywhere">
            <Link href={library?.url || ""} color="teal.500">
              {library?.url}
            </Link>
          </Text>
        </Flex>
      </Stack>
      <Stack width="100%" flexDirection="row">
        <Flex width="150">
          <Text fontSize="xs" fontWeight="bold">
            version
          </Text>
        </Flex>
        <Flex width="80%">
          <Text align="left" fontSize="xs">
            {library?.version}
          </Text>
        </Flex>
      </Stack>
      {children}
    </Category>
  );
}

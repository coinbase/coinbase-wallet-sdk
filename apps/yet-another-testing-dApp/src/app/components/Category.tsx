"use client";

import { ReactNode } from "react";

import { Box, Flex, Heading } from "@chakra-ui/react";

export function Category({
  title,
  headerContent,
  children,
}: {
  title: string;
  headerContent?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box>
      <Flex justifyContent="space-between">
        <Heading fontSize={{ base: "2xl", sm: "3xl" }} fontFamily="monospace" id={title}>
          {title}
        </Heading>
        {headerContent}
      </Flex>
      {children}
    </Box>
  );
}

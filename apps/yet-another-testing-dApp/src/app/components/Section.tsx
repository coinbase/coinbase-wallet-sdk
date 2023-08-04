import { ReactNode } from "react";

import { Box, Code, Divider, Flex, Link, Stack, Text } from "@chakra-ui/react";

import { useApp } from "@/app/contexts/AppClient";

export const Section = ({
  title,
  refLink,
  isHidden = false,
  results,
  badge,
  children,
}: {
  title: string;
  refLink?: string;
  isHidden?: boolean;
  results: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) => {
  const { showHidden } = useApp();
  const idName = title
    .replace(/[^\w\s]/gi, "")
    .trim()
    .replace(" ", "_");

  return isHidden && !showHidden ? null : (
    <>
      <Box pt={3}>{badge}</Box>
      <Stack pt={5}>
        <Box>
          <Code borderRadius="md" p={2} id={idName}>
            {title}
          </Code>
        </Box>
        {typeof refLink === "string" && (
          <Text fontSize="xs" pt={2}>
            <Link href={refLink} isExternal color="teal">
              {refLink}
            </Link>
          </Text>
        )}
      </Stack>
      <Stack direction={{ base: "column", md: "row" }} pt={8} alignItems="flex-start">
        <Flex flex={1} justify="center" align="center" minH="200">
          {children}
        </Flex>
        {results}
      </Stack>
      <Divider pt={5} />
    </>
  );
};

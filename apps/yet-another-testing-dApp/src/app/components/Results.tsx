import { Box, Code, Divider, Heading, Stack, Tag } from "@chakra-ui/react";

export function Results({ result, tag }: { result: string; tag?: string }) {
  return (
    <Stack flexDirection="column" minH="200" width="50%">
      {tag && (
        <Box>
          <Tag size="sm" colorScheme="teal">
            {tag}
          </Tag>
        </Box>
      )}
      <Stack
        flex={1}
        flexDirection="column"
        pt={2}
        overflow="scroll"
        borderRadius="md"
        bg="gray.200"
      >
        <Heading fontSize="sm" fontFamily="monospace" pt={3} px={3} pb={1} color="gray.500">
          Result:
        </Heading>
        <Divider borderColor="white" />
        <Box overflow="scroll">
          <pre
            style={{
              whiteSpace: "pre-wrap",
              width: "100%",
            }}
          >
            <Code p={3} fontSize="11px" bg="blackAlpha">
              {result}
            </Code>
          </pre>
        </Box>
      </Stack>
    </Stack>
  );
}

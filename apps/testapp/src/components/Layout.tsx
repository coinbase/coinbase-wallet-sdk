import { Box, Container, Heading } from '@chakra-ui/react';

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <Box>
      <Container maxW="container.xl">
        <Heading>Coinbase Wallet SDK</Heading>
      </Container>
      <Box as="main">{children}</Box>
    </Box>
  );
}

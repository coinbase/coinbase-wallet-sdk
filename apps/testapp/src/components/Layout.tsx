import { Box, Container, Heading } from '@chakra-ui/react';

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <Box>
      <Box shadow="lg" py={6}>
        <Container maxW="container.xl">
          <Heading>Coinbase Wallet SDK</Heading>
        </Container>
      </Box>
      <Box as="main" mt={6}>
        {children}
      </Box>
    </Box>
  );
}

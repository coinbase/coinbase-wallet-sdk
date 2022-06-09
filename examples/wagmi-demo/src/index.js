import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from "@chakra-ui/react";
import { WagmiConfig, createClient } from "wagmi";
import { connectors } from "./connectors";
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
const client = createClient({
  autoConnect: true,
  connectors
});
root.render(
  <StrictMode>
    <ChakraProvider>
      <WagmiConfig client={client}>
        <App />
      </WagmiConfig>
    </ChakraProvider>
  </StrictMode>
);

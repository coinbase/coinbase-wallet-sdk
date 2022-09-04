import { useEffect, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import { Tooltip } from "@chakra-ui/react";
import { truncateAddress } from "./utils";
import { useAccount, useNetwork, useSignMessage } from "wagmi";
import { verifyMessage } from 'ethers/lib/utils'
import { ConnectButton } from "@rainbow-me/rainbowkit";
import '@rainbow-me/rainbowkit/styles.css';

export default function Home() {
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [verified, setVerified] = useState(undefined);

  // wagmi Hooks
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { signMessage } = useSignMessage({
    message,
    onSuccess(data) {
      setSignature(data);
    },
  });

  const handleInput = (e) => {
    const msg = e.target.value;
    setMessage(msg);
  };

  const verify = async () => {
    const resp = verifyMessage(message, signature);
    setVerified(resp.toLowerCase() === address.toLowerCase());
  };

  const refreshState = () => {
    setMessage("");
    setSignature("");
    setVerified(undefined);
  };

  useEffect(() => {
    refreshState();
  }, [address, chain]);

  return (
    <>
      <Text position="absolute" top={0} right="15px">
        If you're in the sandbox, first "Open in New Window" ⬆️
      </Text>
      <VStack justifyContent="center" alignItems="center" h="100vh">
        <HStack marginBottom="10px">
          <Text
            margin="0"
            lineHeight="1.15"
            fontSize={["1.5em", "2em", "3em", "4em"]}
            fontWeight="600"
          >
            Let's connect with
          </Text>
          <Text
            margin="0"
            lineHeight="1.15"
            fontSize={["1.5em", "2em", "3em", "4em"]}
            fontWeight="600"
            sx={{
              background: "linear-gradient(90deg, #1652f0 0%, #b9cbfb 70.35%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Rainbowkit
          </Text>
        </HStack>
        <HStack>
          <ConnectButton />
        </HStack>
        {isConnected && (
          <HStack justifyContent="flex-start" alignItems="flex-start" padding="15px 0">
            <Box
              maxW="sm"
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              padding="10px"
            >
              <VStack>
                <Button
                  onClick={async () => await signMessage()}
                  isDisabled={!message}
                >
                  Sign Message
                </Button>
                <Input
                  placeholder="Set Message"
                  maxLength={20}
                  onChange={handleInput}
                  w="140px"
                />
                {signature ? (
                  <Tooltip label={signature} placement="bottom">
                    <Text>{`Signature: ${truncateAddress(signature)}`}</Text>
                  </Tooltip>
                ) : null}
              </VStack>
            </Box>
            <Box
              maxW="sm"
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              padding="10px"
            >
              <VStack>
                <Button onClick={verify} isDisabled={!signature}>
                  Verify Message
                </Button>
                {verified !== undefined ? (
                  verified === true ? (
                    <VStack>
                      <CheckCircleIcon color="green" />
                      <Text>Signature Verified!</Text>
                    </VStack>
                  ) : (
                    <VStack>
                      <WarningIcon color="red" />
                      <Text>Signature Denied!</Text>
                    </VStack>
                  )
                ) : null}
              </VStack>
            </Box>
          </HStack>
        )}
      </VStack>
    </>
  );
}

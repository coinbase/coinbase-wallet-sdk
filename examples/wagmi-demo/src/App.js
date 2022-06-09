import { useState } from "react";
import {
  Box,
  Button,
  HStack,
  Input,
  Select,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import SelectWalletModal from "./Modal";
import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import { Tooltip } from "@chakra-ui/react";
import { truncateAddress } from "./utils";
import { useAccount, useConnect, useDisconnect, useNetwork, useSignMessage } from "wagmi";
import { verifyMessage } from 'ethers/lib/utils'

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [message, setMessage] = useState("");
  const [network, setNetwork] = useState("");
  const [verified, setVerified] = useState(undefined);

  // wagmi Hooks
  const { activeConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: accountData } = useAccount();
  const { activeChain, switchNetwork } = useNetwork();
  const { data: signData, signMessage } = useSignMessage({
    message
  });

  const handleNetwork = (e) => {
    const id = e.target.value;
    setNetwork(Number(id));
  };

  const handleInput = (e) => {
    const msg = e.target.value;
    setMessage(msg);
  };

  const verify = async () => {
    const address = verifyMessage(message, signData);
    setVerified(address.toLowerCase() === accountData.address.toLowerCase());
  };

  const refreshState = () => {
    setNetwork("");
    setMessage("");
    setVerified(undefined);
  };

  const disconnectWallet = async () => {
    disconnect();
    refreshState();
  };

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
            wagmi
          </Text>
        </HStack>
        <HStack>
          {!activeConnector ? (
            <Button onClick={onOpen}>Connect Wallet</Button>
          ) : (
            <Button onClick={disconnectWallet}>Disconnect</Button>
          )}
        </HStack>
        <VStack justifyContent="center" alignItems="center" padding="10px 0">
          <HStack>
            <Text>{`Connection Status: `}</Text>
            {activeConnector ? (
              <CheckCircleIcon color="green" />
            ) : (
              <WarningIcon color="#cd5700" />
            )}
          </HStack>

          {!accountData ? (
            <Text>Account: No Account</Text>
          ) : (
            <Tooltip label={accountData.address} placement="right">
              <Text>{`Account: ${truncateAddress(accountData.address)}`}</Text>
            </Tooltip>
          )}
          <Text>{`Network ID: ${
            activeChain ? activeChain.id : "No Network"
          }`}</Text>
        </VStack>
        {activeConnector && (
          <HStack justifyContent="flex-start" alignItems="flex-start">
            <Box
              maxW="sm"
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              padding="10px"
            >
              <VStack>
                <Button
                  onClick={() => switchNetwork(network)}
                  isDisabled={!network}
                >
                  Switch Network
                </Button>
                <Select placeholder="Select network" onChange={handleNetwork}>
                  <option value="3">Ropsten</option>
                  <option value="4">Rinkeby</option>
                  <option value="42">Kovan</option>
                </Select>
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
                {signData ? (
                  <Tooltip label={signData} placement="bottom">
                    <Text>{`Signature: ${truncateAddress(signData)}`}</Text>
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
                <Button onClick={verify} isDisabled={!signData}>
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
      <SelectWalletModal isOpen={isOpen} closeModal={onClose} />
    </>
  );
}

import {
  Alert,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  Flex,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  VStack,
  Divider,
} from "@chakra-ui/react";
import React, { useCallback, useMemo, useState } from "react";
import { createCoinbaseWalletSDK } from "@coinbase/wallet-sdk";
import { useCBWSDK } from "../../context/CBWSDKReactContextProvider";
import {
  Preference,
} from "@coinbase/wallet-sdk/dist/core/provider/interface";
import { CheckIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { keccak256, slice, toHex } from "viem";
import { CreateCoinbaseWalletSDKOptions } from "@coinbase/wallet-sdk/dist/createCoinbaseWalletSDK";

type PostOnboardingAction = "none" | "onramp" | "magicspend";

const postOnboardingActions = ["none", "onramp", "magicspend"] as const;

type OnrampPrefillOptions = {
  contractAddress?: string;
  amount: string;
  chainId: number;
};

type Config = {
  postOnboardingAction?: PostOnboardingAction;
  onrampPrefillOptions?: OnrampPrefillOptions;
  attributionDataSuffix?: string;
};

export function SDKConfig() {
  const { option, scwUrl } = useCBWSDK();
  const [config, setConfig] = React.useState<Config>({});

  const options: CreateCoinbaseWalletSDKOptions = useMemo(() => {
    const preference: Preference = {
      options: option,
      keysUrl: scwUrl,
      ...config,
    };
    return {
      appName: "SDK Playground",
      appLogoUrl: null,
      appChainIds: [84532, 8452],
      preference,
    };
  }, [config, option, scwUrl]);

  const startOnboarding = useCallback(async () => {
    const sdk = createCoinbaseWalletSDK(options);
    const provider = sdk.getProvider();
    await provider.request({ method: "eth_requestAccounts" });
  }, [options]);

  const handlePostOnboardingAction = useCallback(
    (action: PostOnboardingAction) => {
      const config_ = { ...config, postOnboardingAction: action };
      if (action !== "onramp") {
        delete config_.onrampPrefillOptions;
      }
      setConfig(config_);
    },
    [config]
  );

  const handleOnrampPrefill = useCallback(
    (key: "contractAddress" | "amount" | "chainId") => (e) => {
      const value = e.target.value;
      setConfig((prev) => ({
        ...prev,
        onrampPrefillOptions: {
          ...prev.onrampPrefillOptions,
          [key]: value,
        },
      }));
    },
    []
  );

  const handleSetDataSuffix = useCallback((e) => {
    const value = e.target.value;
    setConfig((prev) => ({
      ...prev,
      attributionDataSuffix: value,
    }));
  }, []);

  const [dataSuffix, setDataSuffix] = useState("Coinbase Wallet");
  const fourByteHex = useMemo(
    () => slice(keccak256(toHex(dataSuffix)), 0, 4),
    [dataSuffix]
  );

  return (
    <Card>
      <CardHeader>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>
            This section ONLY works for testing onboarding config
          </AlertTitle>
        </Alert>
        <Alert status="info" mt={2}>
          <AlertIcon />
          <AlertTitle>
            Please signout of your Smart Wallet and reset the playground before
            testing
          </AlertTitle>
        </Alert>
      </CardHeader>
      <CardBody>
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="md">Post Onboarding Action</Heading>
            <Code mt={2}>postOnboardingAction</Code>
          </Box>
          <Menu>
            <MenuButton
              colorScheme="telegram"
              as={Button}
              rightIcon={<ChevronDownIcon />}
            >
              {config?.postOnboardingAction}
            </MenuButton>
            <MenuList>
              {postOnboardingActions.map((action) => (
                <MenuItem
                  color={"MenuText"}
                  key={action}
                  icon={
                    action === config.postOnboardingAction ? (
                      <CheckIcon />
                    ) : null
                  }
                  onClick={() => handlePostOnboardingAction(action)}
                >
                  {action}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Flex>
        {config.postOnboardingAction === "onramp" && (
          <>
            <Divider my={6} />
            <Flex justify="space-between" align="center" mt={6}>
              <Box>
                <Heading size="md">Onramp Prefill Options</Heading>
                <Text fontSize="sm" maxW="400px">
                  Optional: Only works when postOnboardingAction is set to
                  onramp. Amount and chainId are required. If contract address
                  is omitted, onramp assumes native asset for that chain
                </Text>
                <Code mt={2}>onrampPrefillOptions</Code>
              </Box>
              <VStack>
                <Input
                  placeholder="Contract Address"
                  onChange={handleOnrampPrefill("contractAddress")}
                />
                <Input
                  placeholder="Amount (wei)"
                  required
                  onChange={handleOnrampPrefill("amount")}
                />
                <Input
                  placeholder="Chain ID"
                  required
                  onChange={(e) =>
                    handleOnrampPrefill("chainId")({
                      target: { value: parseInt(e.target.value, 10) },
                    })
                  }
                />
              </VStack>
            </Flex>
          </>
        )}
        <Divider my={6} />
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="md">Attribution Data Suffix</Heading>
            <Text fontSize="sm">
              First 4 bytes of a unique string to identify your onchain activity
            </Text>
            <FormControl mt={2}>
              <FormLabel>
                <Code>attributionDataSuffix</Code>
              </FormLabel>
              <Input
                mt={2}
                type="text"
                placeholder="Enter String"
                onChange={(e) => setDataSuffix(e.target.value)}
                value={dataSuffix}
              />
              <FormHelperText>
                Convert any string into a 4 byte data suffix
              </FormHelperText>
            </FormControl>
            <Code mt={2} colorScheme="telegram">
              {fourByteHex}
            </Code>
          </Box>
          <VStack>
            <Input
              placeholder="Data Suffix (4 bytes)"
              onChange={handleSetDataSuffix}
            />
          </VStack>
        </Flex>
      </CardBody>
      <Button size="lg" colorScheme="telegram" onClick={startOnboarding}>
        Start Onboarding
      </Button>
    </Card>
  );
}

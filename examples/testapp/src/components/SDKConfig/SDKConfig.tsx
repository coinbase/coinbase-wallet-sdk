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
  Text,
  VStack,
  Switch,
} from "@chakra-ui/react";
import React, { useCallback, useMemo, useState } from "react";
import { createCoinbaseWalletSDK } from "@coinbase/wallet-sdk";
import { useCBWSDK } from "../../context/CBWSDKReactContextProvider";
import { Preference } from "@coinbase/wallet-sdk/dist/core/provider/interface";
import { keccak256, slice, toHex } from "viem";
import { CreateCoinbaseWalletSDKOptions } from "@coinbase/wallet-sdk/dist/createCoinbaseWalletSDK";

function is0xString(value: string): value is `0x${string}` {
  return value.startsWith("0x");
}

export function SDKConfig() {
  const { option, scwUrl } = useCBWSDK();
  const [config, setConfig] = React.useState<Preference>({
    options: option,
    attribution: {
      auto: true,
    },
  });

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

  const handleSetAttributionAuto = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const config_: Preference = {
        ...config,
        attribution: {
          auto: event.target.checked,
        },
      };
      setConfig(config_);
    },
    [config]
  );

  const handleSetDataSuffix = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (is0xString(value)) {
        setConfig((prev) => ({
          ...prev,
          attribution: {
            dataSuffix: value,
          },
        }));
      }
    },
    []
  );

  const [dataSuffix, setDataSuffix] = useState("Coinbase Wallet");
  const sixteenByteHex = useMemo(
    () => slice(keccak256(toHex(dataSuffix)), 0, 16),
    [dataSuffix]
  );

  const attributionAuto = useMemo(() => {
    return "auto" in config.attribution && config.attribution?.auto;
  }, [config.attribution]);

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
            <Heading size="md">Attribution</Heading>
            <Code mt={2}>attribution.auto</Code>
          </Box>
          <Box>
            <FormControl mt={2}>
              <Switch
                defaultChecked={attributionAuto}
                onChange={handleSetAttributionAuto}
              />
            </FormControl>
          </Box>
        </Flex>
        {!attributionAuto && (
          <Flex
            justify="space-between"
            align={{
              base: "flex-start",
              md: "center",
            }}
            my={2}
            flexDirection={{
              base: "column",
              md: "row",
            }}
          >
            <Box>
              <Heading size="sm">Data Suffix</Heading>
              <Text fontSize="sm">
                First 16 bytes of a unique string to identify your onchain
                activity
              </Text>
              <FormControl mt={2}>
                <FormLabel>
                  <Code>attribution.dataSuffix</Code>
                </FormLabel>
                <Input
                  mt={2}
                  type="text"
                  placeholder="Enter String"
                  onChange={(e) => setDataSuffix(e.target.value)}
                  value={dataSuffix}
                />
                <FormHelperText>
                  Convert any string into a 16 byte data suffix
                </FormHelperText>
              </FormControl>
              <Code mt={2} colorScheme="telegram">
                {sixteenByteHex}
              </Code>
            </Box>
            <VStack>
              <Input
                mt={2}
                placeholder="Data Suffix (16 bytes)"
                onChange={handleSetDataSuffix}
              />
            </VStack>
          </Flex>
        )}
      </CardBody>
      <Button size="lg" colorScheme="telegram" onClick={startOnboarding}>
        Start Onboarding
      </Button>
    </Card>
  );
}

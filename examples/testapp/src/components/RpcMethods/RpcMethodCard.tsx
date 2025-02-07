import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Button,
  Card,
  CardBody,
  Code,
  Flex,
  FormControl,
  FormErrorMessage,
  Heading,
  HStack,
  InputGroup,
  InputLeftAddon,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Chain, hexToNumber } from 'viem';
import { mainnet } from 'viem/chains';

import { useCBWSDK } from '../../context/CBWSDKReactContextProvider';
import { verifySignMsg } from './method/signMessageMethods';
import { ADDR_TO_FILL, CHAIN_ID_TO_FILL } from './shortcut/const';
import { multiChainShortcutsMap } from './shortcut/multipleChainShortcuts';

type ResponseType = string;

// Replace address placeholders in string or object values
const replaceAddressInValue = async (value: any, getCurrentAddress: () => Promise<[string]>) => {
  if (typeof value === 'string' && (value === ADDR_TO_FILL || value === 'YOUR_ADDRESS_HERE')) {
    const currentAddress = (await getCurrentAddress())[0];
    return currentAddress;
  }

  if (typeof value === 'object') {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      const stringified = JSON.stringify(parsed);
      if (stringified.includes(ADDR_TO_FILL) || stringified.includes('YOUR_ADDRESS_HERE')) {
        const currentAddress = (await getCurrentAddress())[0];
        const replaced = stringified
          .replace(new RegExp(ADDR_TO_FILL, 'g'), currentAddress)
          .replace(new RegExp('YOUR_ADDRESS_HERE', 'g'), currentAddress);
        return typeof value === 'object' ? JSON.parse(replaced) : replaced;
      }
    } catch (e) {
      // If parsing fails, return original value
    }
  }
  return value;
};

export function RpcMethodCard({ format, method, params, shortcuts }) {
  const [response, setResponse] = React.useState<Response | null>(null);
  const [verifyResult, setVerifyResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<Record<string, unknown> | string | number | null>(null);
  const { provider } = useCBWSDK();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const verify = useCallback(
    async (response: ResponseType, data: Record<string, string>) => {
      const chainId = await provider.request({ method: 'eth_chainId' });
      const chain =
        multiChainShortcutsMap['wallet_switchEthereumChain'].find(
          (shortcut) => Number(shortcut.data.chainId) === hexToNumber(chainId)
        )?.data.chain ?? mainnet;

      const verifyResult = await verifySignMsg({
        method,
        from: data.address?.toLowerCase(),
        sign: response,
        message: data.message,
        chain: chain as Chain,
      });
      if (verifyResult) {
        setVerifyResult(verifyResult);
        return;
      }
    },
    [method, provider]
  );

  const submit = useCallback(
    async (data: Record<string, string>) => {
      setError(null);
      setVerifyResult(null);
      setResponse(null);
      if (!provider) return;

      const dataToSubmit = { ...data };
      let values = dataToSubmit;
      if (format) {
        const getCurrentAddress = async () => await provider.request({ method: 'eth_accounts' });

        for (const key in dataToSubmit) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            dataToSubmit[key] = await replaceAddressInValue(dataToSubmit[key], getCurrentAddress);

            if (dataToSubmit[key] === CHAIN_ID_TO_FILL) {
              const chainId = await provider.request({ method: 'eth_chainId' });
              dataToSubmit[key] = chainId;
            }
          }
        }
        values = format(dataToSubmit);
      }
      try {
        const response = await provider.request({
          method,
          params: values,
        });
        setResponse(response);
        await verify(response, dataToSubmit);
      } catch (err) {
        const { code, message, data } = err;
        setError({ code, message, data });
      }
    },
    [format, method, provider, verify]
  );

  return (
    <Card shadow="lg" as="form" onSubmit={handleSubmit(submit)}>
      <CardBody>
        <Flex align="center" justify="space-between">
          <Heading as="h2" size="lg">
            <Code>{method}</Code>
          </Heading>
          <Button type="submit" mt={4}>
            Submit
          </Button>
        </Flex>
        {params?.length > 0 && (
          <Accordion allowMultiple mt={4} defaultIndex={shortcuts ? [1] : [0]}>
            <AccordionItem>
              <AccordionButton>
                <Heading as="h3" size="sm" marginY={2} flex="1" textAlign="left">
                  Params
                </Heading>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <VStack spacing={2} mt={2} align="stretch" width="100%">
                  {params.map((param) => {
                    const err = errors[param.key];
                    return (
                      <FormControl key={param.key} isInvalid={!!err} isRequired={param.required}>
                        <InputGroup size="sm" flexDirection="column">
                          <InputLeftAddon width="100%" mb={1}>
                            {param.key}
                          </InputLeftAddon>
                          <Textarea
                            {...register(param.key, {
                              required: param.required ? `${param.key} required` : false,
                            })}
                            minH="40px"
                            maxH="none" // No max height limit for vertical resizing
                            resize="none" // Disable manual resizing
                            width="100%"
                            overflow="auto"
                            maxW="100%"
                            minW="100%"
                            whiteSpace="nowrap" // Keep horizontal scrolling
                            overflowX="auto" // Enable horizontal scrolling
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto'; // Reset height to auto to adjust for content
                              target.style.height = `${target.scrollHeight}px`; // Set height based on scroll height
                            }}
                          />
                        </InputGroup>
                        <FormErrorMessage>{err?.message as string}</FormErrorMessage>
                      </FormControl>
                    );
                  })}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
            {shortcuts?.length > 0 && (
              <AccordionItem>
                <AccordionButton>
                  <Heading as="h3" size="sm" marginY={2} flex="1" textAlign="left">
                    Shortcuts
                  </Heading>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <HStack spacing={2}>
                    {shortcuts.map((shortcut) => (
                      <VStack key={shortcut.key} spacing={1}>
                        <Button onClick={() => submit(shortcut.data)}>{shortcut.key}</Button>
                        {shortcut.data.message && (
                          <Button
                            onClick={() =>
                              navigator.clipboard.writeText(
                                JSON.stringify(shortcut.data.message, null, 2)
                              )
                            }
                            variant="outline"
                            size="sm"
                          >
                            Copy
                          </Button>
                        )}
                      </VStack>
                    ))}
                  </HStack>
                </AccordionPanel>
              </AccordionItem>
            )}
          </Accordion>
        )}
        {response && (
          <VStack mt={4}>
            <Code as="pre" p={4} wordBreak="break-word" whiteSpace="pre-wrap" w="100%">
              {JSON.stringify(response, null, 2)}
            </Code>
          </VStack>
        )}
        {verifyResult && (
          <VStack mt={4}>
            <Code
              as="pre"
              p={4}
              colorScheme={verifyResult.includes('Failed') ? 'red' : 'cyan'}
              wordBreak="break-word"
              whiteSpace="pre-wrap"
              w="100%"
            >
              {JSON.stringify(verifyResult, null, 2)}
            </Code>
          </VStack>
        )}
        {error && (
          <VStack mt={4}>
            <Code
              as="pre"
              colorScheme="red"
              p={4}
              wordBreak="break-word"
              whiteSpace="pre-wrap"
              w="100%"
            >
              {JSON.stringify(error, null, 2)}
            </Code>
          </VStack>
        )}
      </CardBody>
    </Card>
  );
}

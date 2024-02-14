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
  Input,
  InputGroup,
  InputLeftAddon,
  VStack,
} from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';

import { useCBWSDK } from '../../context/CBWSDKReactContextProvider';
import { verifySignMsg } from './method/signMessageMethods';
import { ADDR_TO_FILL } from './shortcut/const';

type ResponseType = string;

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

  const verify = useCallback(async (response: ResponseType, data: Record<string, string>) => {
    const verifyResult = verifySignMsg({
      method,
      from: data.address?.toLowerCase(),
      sign: response,
      message: data.message,
    });
    if (verifyResult) {
      setVerifyResult(verifyResult);
      return;
    }
  }, []);

  const submit = useCallback(
    async (data: Record<string, string>) => {
      setError(null);
      setVerifyResult(null);
      setResponse(null);
      if (!provider) return;
      let values = data;
      if (format) {
        // fill active address to the request
        const addresses = await provider.request({ method: 'eth_accounts' });
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (data[key] === ADDR_TO_FILL) {
              data[key] = addresses[0];
            }
          }
        }
        values = format(data);
      }
      try {
        // connection required
        if (!provider?.connected) {
          await provider.enable();
        }

        const response = await provider.request({
          method,
          params: values,
        });
        setResponse(response);
        verify(response, data);
      } catch (err) {
        const { code, message, data } = err;
        setError({ code, message, data });
      }
    },
    [provider]
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
          <>
            <Accordion allowMultiple mt={4} defaultIndex={shortcuts ? [1] : [0]}>
              <AccordionItem>
                <AccordionButton>
                  <Heading as="h3" size="sm" marginY={2} flex="1" textAlign="left">
                    Params
                  </Heading>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={2} mt={2}>
                    {params.map((param) => {
                      const err = errors[param.key];
                      return (
                        <FormControl key={param.key} isInvalid={!!err} isRequired={param.required}>
                          <InputGroup size="sm">
                            <InputLeftAddon>{param.key}</InputLeftAddon>
                            <Input
                              {...register(param.key, {
                                required: param.required ? `${param.key} required` : false,
                              })}
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
                        <Button key={shortcut.key} onClick={() => submit(shortcut.data)}>
                          {shortcut.key}
                        </Button>
                      ))}
                    </HStack>
                  </AccordionPanel>
                </AccordionItem>
              )}
            </Accordion>
          </>
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

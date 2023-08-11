import {
  Button,
  Card,
  CardBody,
  Code,
  Flex,
  FormControl,
  FormErrorMessage,
  Heading,
  Input,
  InputGroup,
  InputLeftAddon,
  VStack,
} from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';

import { useCBWSDK } from '../../context/CBWSDKProvider';

export function RpcMethodCard({ connected, format, method, params }) {
  const [response, setResponse] = React.useState<Record<string, unknown> | string | number | null>(
    null
  );
  const [error, setError] = React.useState<Record<string, unknown> | string | number | null>(null);
  const { provider } = useCBWSDK();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const submit = useCallback(
    async (data: Record<string, unknown>) => {
      setError(null);
      setResponse(null);
      if (!provider) return;
      let values = data;
      if (format) {
        values = format(data);
      }
      try {
        // connection required
        if (!connected) {
          await provider.enable();
        }
        const response = await provider.request({
          method,
          params: values,
        });
        setResponse(response);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          const { code, message } = err;
          setError({ code, message });
        }
      }
    },
    [provider]
  );

  const hasParams = params && params.length > 0;

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
        {hasParams && (
          <>
            <Heading as="h3" size="sm" mt={4}>
              Params
            </Heading>
            <VStack spacing={2} mt={2}>
              {params.map((param) => {
                const err = errors[param.key];
                return (
                  <FormControl key={param.key} isInvalid={!!err}>
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
          </>
        )}
        <VStack mt={4}>
          {response && (
            <Code as="pre" p={4} wordBreak="break-word" whiteSpace="pre-wrap" w="100%">
              {JSON.stringify(response, null, 2)}
            </Code>
          )}
          {error && (
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
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}

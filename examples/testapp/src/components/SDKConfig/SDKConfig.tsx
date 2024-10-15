import {
  Box,
  Card,
  CardBody,
  Code,
  Flex,
  FormControl,
  Heading,
  Input,
  Switch,
  Text,
} from '@chakra-ui/react';
import { Preference } from '@coinbase/wallet-sdk/dist/core/provider/interface';
import React, { useCallback, useMemo, useState } from 'react';
import { keccak256, slice, toHex } from 'viem';

import { useCBWSDK } from '../../context/CBWSDKReactContextProvider';

function computeDataSuffix(value: string): string {
  return slice(keccak256(toHex(value)), 0, 16);
}

export function SDKConfig() {
  const { config, setConfig } = useCBWSDK();
  const [dataSuffix, setDataSuffix] = useState<string>();

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
    [config, setConfig]
  );

  const handleSetDataSuffix = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDataSuffix(value);
      setConfig((prev) => ({
        ...prev,
        attribution: {
          dataSuffix: computeDataSuffix(value),
        },
      }));
    },
    [setConfig]
  );

  const sixteenByteHex = useMemo(
    () => (dataSuffix ? computeDataSuffix(dataSuffix) : undefined),
    [dataSuffix]
  );

  const attributionAuto = useMemo(() => {
    return 'auto' in config.attribution && config.attribution?.auto;
  }, [config.attribution]);

  return (
    <Card>
      <CardBody>
        <Heading mt={2} size="md">
          Attribution
        </Heading>
        <Flex justify="space-between" align="center" mt={4}>
          <Flex alignItems="center">
            <Heading size="sm">Auto</Heading>
            <Code ml={2}>attribution.auto</Code>
          </Flex>
          <Box>
            <FormControl mt={2}>
              <Switch defaultChecked={attributionAuto} onChange={handleSetAttributionAuto} />
            </FormControl>
          </Box>
        </Flex>
        {!attributionAuto && (
          <Flex
            justify="space-between"
            align={{
              base: 'flex-start',
              md: 'center',
            }}
            my={2}
            flexDirection={{
              base: 'column',
              md: 'row',
            }}
          >
            <Box flexBasis="50%">
              <Flex alignItems="center">
                <Heading size="sm">Data Suffix</Heading>
                <Code ml={2}>attribution.dataSuffix</Code>
              </Flex>
              <Text mt={2} fontSize="sm">
                First 16 bytes of a unique string to identify your onchain activity. Update the text
                box below to have your data suffix applied
              </Text>
              <FormControl mt={2}>
                <Input
                  mt={2}
                  type="text"
                  placeholder="Enter string to hash"
                  onChange={handleSetDataSuffix}
                />
              </FormControl>
            </Box>
            <Box flexBasis="50%" textAlign="right">
              <Code mt={2} colorScheme="telegram">
                {sixteenByteHex}
              </Code>
            </Box>
          </Flex>
        )}
      </CardBody>
    </Card>
  );
}

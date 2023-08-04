"use client";

import React from "react";

import {
  Box,
  Divider,
  Flex,
  Link,
  Switch,
  Tag,
  TagLabel,
  TagLeftIcon,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { BiSolidGame, BiSolidGhost } from "react-icons/bi";
import { FaMehBlank, FaSmileWink } from "react-icons/fa";

import { AppIcon } from "@/app/components/AppIcon";
import { Sidebar } from "@/app/components/Sidebar";
import { useApp } from "@/app/contexts/AppClient";

export const SidebarContent = () => {
  const { connected, chainId, showHidden, setShowHidden } = useApp();

  return (
    <Box
      bg={useColorModeValue("white", "gray.900")}
      borderRight="1px"
      borderRightColor={useColorModeValue("gray.200", "gray.700")}
      w={260}
      pos="fixed"
      h="full"
      overflow="scroll"
      p={4}
      display={{ base: "none", md: "block" }}
    >
      <Flex alignItems="center" p="8" justifyContent="space-between" direction="column">
        <AppIcon />
        <Text fontSize="xl" fontFamily="monospace" fontWeight="bold">
          Y.A.T.A.
        </Text>
        <Text fontSize="xs" fontFamily="monospace">
          Yet Another Test dApp
        </Text>
      </Flex>
      <Flex justifyContent="center" p={4} pb={6} direction="column" gap={3}>
        <Tooltip
          rounded="full"
          label={connected?.startsWith("Injected") ? connected : undefined}
          placement="right"
        >
          <Tag size="lg" width="100%" color={connected ? "green" : "gray"}>
            <TagLeftIcon
              boxSize="12px"
              {...(connected
                ? { as: FaSmileWink, color: "green" }
                : { as: FaMehBlank, color: "gray" })}
            />
            <TagLabel fontSize="xs">{connected || "Not Connected"}</TagLabel>
          </Tag>
        </Tooltip>
        <Box>
          <Tag bg="blackAlpha.100">
            <TagLeftIcon
              boxSize="12px"
              {...(chainId
                ? { as: BiSolidGame, color: "blackAlpha.700" }
                : { as: BiSolidGhost, color: "blackAlpha.300" })}
            />
            <TagLabel fontSize="xs" fontFamily="monospace">
              Chain ID: {chainId}
            </TagLabel>
          </Tag>
        </Box>
      </Flex>
      <Sidebar />
      <Divider />
      <Flex pt={3} alignItems="center" gap={2}>
        <Switch
          alignItems="center"
          size="sm"
          onChange={() => setShowHidden(!showHidden)}
          isChecked={showHidden}
        />
        <Text fontSize="xs" color="blackAlpha.600">
          Show inactive methods
        </Text>
      </Flex>
    </Box>
  );
};

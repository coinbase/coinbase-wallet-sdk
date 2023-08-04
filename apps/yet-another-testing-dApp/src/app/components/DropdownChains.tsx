import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { FiChevronDown } from "react-icons/fi";

import {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  WHITELISTED_CHAINS,
  mainnetChainIds,
  testnetChainIds,
} from "@/app/utils/chains";

export const DropdownChains = ({
  selected,
  onSelect,
}: {
  selected?: number;
  onSelect: (chainId: number) => void;
}) => {
  return (
    <Menu>
      <MenuButton as={Button} colorScheme="pink" rightIcon={<FiChevronDown />}>
        Switch to {selected ? WHITELISTED_CHAINS[selected].name : "Network"}
      </MenuButton>
      <MenuList>
        <MenuGroup title="Mainnet">
          {mainnetChainIds.map((chainId) => (
            <MenuItem fontSize="xs" key={chainId} onClick={() => onSelect(chainId)}>
              <Box pl={3}>{MAINNET_CHAINS[chainId].name}</Box>
            </MenuItem>
          ))}
        </MenuGroup>
        <MenuDivider />
        <MenuGroup title="Testnet">
          {testnetChainIds.map((chainId) => (
            <MenuItem fontSize="xs" key={chainId} onClick={() => onSelect(chainId)}>
              <Box pl={3}>{TESTNET_CHAINS[chainId].name}</Box>
            </MenuItem>
          ))}
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};

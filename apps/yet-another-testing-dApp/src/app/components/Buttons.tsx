import { Button, ButtonProps } from "@chakra-ui/react";

export type ButtonConnectProps = ButtonProps & {
  isConnected: boolean;
  testId?: string;
};
export const ButtonConnect = ({
  isConnected,
  testId = "connect-wallet-btn",
  ...props
}: ButtonConnectProps) =>
  isConnected ? (
    <Button fontSize="sm" rounded="full" colorScheme="gray" isDisabled id={`connected-${testId}`}>
      Connected
    </Button>
  ) : (
    <Button
      fontSize="sm"
      rounded="full"
      id={`connect-${testId}`}
      data-testid={testId}
      colorScheme="green"
      px={4}
      boxShadow={"0px 1px 25px -5px rgb(66 153 225 / 48%), 0 10px 10px -5px rgb(66 153 225 / 43%)"}
      _hover={{
        bg: "green.300",
      }}
      _focus={{
        bg: "green.600",
      }}
      {...props}
    >
      Connect Wallet
    </Button>
  );

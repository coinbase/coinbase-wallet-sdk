import { ReactNode } from "react";

import { Button, Flex } from "@chakra-ui/react";

import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";

export const Disconnect = ({
  title,
  disconnect,
  account,
  testId,
  description,
  error,
  isHidden = false,
  badge,
}: {
  title: string;
  disconnect: any;
  account: string | boolean;
  testId?: string;
  description?: string;
  error?: string;
  isHidden?: boolean;
  badge?: ReactNode;
}) => {
  return (
    <Section
      isHidden={isHidden}
      title={title}
      results={<Results result="" tag={error} />}
      refLink={description}
      badge={badge}
    >
      <Flex flex={1} justify="center" align="center" minH="200">
        <Button
          fontSize="sm"
          rounded="full"
          colorScheme="red"
          isDisabled={!account}
          onClick={disconnect}
          id={`disconnect-${testId}`}
          className={`disconnect-${testId}`}
        >
          Disconnect
        </Button>
      </Flex>
    </Section>
  );
};

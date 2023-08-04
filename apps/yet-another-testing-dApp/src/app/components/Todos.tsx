import { Heading, List, ListIcon, ListItem, Stack } from "@chakra-ui/react";
import { FiCheckSquare } from "react-icons/fi";

export const Todos = ({ items }: { items: string[] }) => (
  <Stack pt={5}>
    <Heading fontSize="xl" fontFamily="monospace">
      TODOs
    </Heading>

    <List spacing={3}>
      {items.map((item) => (
        <ListItem key={item}>
          <ListIcon as={FiCheckSquare} color="gray.500" />
          {item}
        </ListItem>
      ))}
    </List>
  </Stack>
);

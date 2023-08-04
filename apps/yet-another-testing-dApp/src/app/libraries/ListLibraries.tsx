"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button, Stack } from "@chakra-ui/react";
import { FiCheck } from "react-icons/fi";

import { useApp } from "@/app/contexts/AppClient";
import { LIBRARIES } from "@/app/utils/libraries";

export function ListLibraries() {
  const { selectLibrary } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Stack width={200}>
      {LIBRARIES.map((lib) => (
        <Button
          variant="ghost"
          fontWeight="normal"
          fontSize="sm"
          key={lib.name}
          id={`select-${lib.name}`}
          rightIcon={`/libraries/${lib.name}` === pathname ? <FiCheck /> : undefined}
          onClick={() => {
            selectLibrary(lib);
            router.push(`/libraries/${lib.name}`);
          }}
          justifyContent="space-between"
          {...(!lib.version && {
            isDisabled: true,
            color: "gray.400",
          })}
        >
          {lib.name} {lib.subtext}
        </Button>
      ))}
    </Stack>
  );
}

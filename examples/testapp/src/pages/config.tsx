import { Container } from "@chakra-ui/react";
import { WIDTH_2XL } from "../components/Layout";
import dynamic from "next/dynamic";

const SDKConfig = dynamic(
  () =>
    import("../components/SDKConfig/SdkConfig").then((mod) => mod.SDKConfig),
  { ssr: false }
);

export default function Config() {
  return (
    <Container maxW={WIDTH_2XL} mb={8}>
      <SDKConfig />
    </Container>
  );
}

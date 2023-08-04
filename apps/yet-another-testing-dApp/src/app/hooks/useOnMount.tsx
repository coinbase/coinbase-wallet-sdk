import { useEffect } from "react";

export function useOnMount(callback: React.EffectCallback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(callback, []);
}

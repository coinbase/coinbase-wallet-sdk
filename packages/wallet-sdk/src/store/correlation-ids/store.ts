import { createStore } from 'zustand/vanilla';

type CorrelationIdsState = {
  correlationIds: Map<object, string>;
};

const correlationIdsStore = createStore<CorrelationIdsState>(() => ({
  correlationIds: new Map<object, string>(),
}));

export const correlationIds = {
  get: (key: object) => {
    const correlationId = correlationIdsStore.getState().correlationIds.get(key);
    return correlationId;
  },
  set: (key: object, correlationId: string) => {
    correlationIdsStore.setState((state) => {
      const newMap = new Map(state.correlationIds);
      newMap.set(key, correlationId);
      return { correlationIds: newMap };
    });
  },
  delete: (key: object) => {
    correlationIdsStore.setState((state) => {
      const newMap = new Map(state.correlationIds);
      newMap.delete(key);
      return { correlationIds: newMap };
    });
  },
  clear: () => {
    correlationIdsStore.setState({
      correlationIds: new Map<object, string>(),
    });
  },
};

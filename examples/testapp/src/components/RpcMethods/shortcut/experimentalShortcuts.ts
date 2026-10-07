import { ShortcutType } from './ShortcutType';

const experimentalRequestInfoShortcut: ShortcutType = {
  key: 'Experimental Request Info',
  data: {
    requests: [
      {
        type: 'email' as const,
        optional: true,
      },
      {
        type: 'physicalAddress' as const,
        optional: true,
      },
      {
        type: 'name' as const,
        optional: false,
      },
      {
        type: 'phoneNumber' as const,
        optional: false,
      },
    ],
  },
};

export const baseProfileShortcutsMap: Record<string, ShortcutType[]> = {
  experimental_requestInfo: [experimentalRequestInfoShortcut],
};

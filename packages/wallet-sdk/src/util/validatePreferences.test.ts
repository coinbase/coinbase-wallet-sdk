import { ToOwnerAccountFn } from ':store/store.js';
import { Preference } from '../core/provider/interface.js';
import { validatePreferences, validateSubAccount } from './validatePreferences.js';

describe('validatePreferences', () => {
  it('should not throw an error if preference is undefined', () => {
    expect(() => validatePreferences(undefined)).not.toThrow();
  });

  it('should not throw an error if preference is valid', () => {
    const validPreference: Preference = {
      options: 'all',
      attribution: {
        auto: true,
      },
    };
    expect(() => validatePreferences(validPreference)).not.toThrow();
  });

  it('should throw an error if options is invalid', () => {
    const invalidPreference: Preference = {
      // @ts-expect-error invalid option
      options: 'invalidOption',
      attribution: {
        auto: true,
      },
    };
    expect(() => validatePreferences(invalidPreference)).toThrow('Invalid options: invalidOption');
  });

  it('should not throw an error if attribution is undefined', () => {
    const validPreference: Preference = {
      options: 'all',
    };
    expect(() => validatePreferences(validPreference)).not.toThrow();
  });

  it('should throw an error if both auto and dataSuffix are defined in attribution', () => {
    const invalidPreference: Preference = {
      options: 'all',
      attribution: {
        auto: true,
        // @ts-expect-error passing two values to attribution
        dataSuffix: 'suffix',
      },
    };
    expect(() => validatePreferences(invalidPreference)).toThrow(
      'Attribution cannot contain both auto and dataSuffix properties'
    );
  });

  it('should not throw an error if only auto is defined in attribution', () => {
    const validPreference: Preference = {
      options: 'all',
      attribution: {
        auto: true,
      },
    };
    expect(() => validatePreferences(validPreference)).not.toThrow();
  });

  it('should not throw an error if only dataSuffix is defined in attribution', () => {
    const validPreference: Preference = {
      options: 'all',
      attribution: {
        dataSuffix: '0xsuffix',
      },
    };
    expect(() => validatePreferences(validPreference)).not.toThrow();
  });
});

describe('validateSubAccount', () => {
  it('should throw an error if toSubAccountSigner is not a function', () => {
    expect(() => validateSubAccount(undefined as any)).toThrow('toAccount is not a function');
  });

  it('should not throw an error if toSubAccountSigner is a function', () => {
    const toSubAccountSigner: ToOwnerAccountFn = () => Promise.resolve({} as any);
    expect(() => validateSubAccount(toSubAccountSigner)).not.toThrow();
  });
});

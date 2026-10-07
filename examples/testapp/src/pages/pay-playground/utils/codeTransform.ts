import { sanitizeCode } from './codeSanitizer';

// Transform and sanitize code with whitelist validation
export const transformAndSanitizeCode = (
  code: string
): {
  isValid: boolean;
  code: string;
  errors: Array<{ message: string; line?: number; column?: number }>;
} => {
  // First, sanitize the code using whitelist validation
  const sanitizationResult = sanitizeCode(code);

  if (!sanitizationResult.isValid) {
    return {
      isValid: false,
      code: '',
      errors: sanitizationResult.errors,
    };
  }

  return {
    isValid: true,
    code: sanitizationResult.sanitizedCode,
    errors: [],
  };
};

// Legacy function for backward compatibility (deprecated)
export const transformImports = (code: string): string => {
  const result = transformAndSanitizeCode(code);
  return result.isValid ? result.code : code;
};

// Helper function to safely stringify objects with circular references
export const safeStringify = (obj: unknown, indent = 2): string => {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    },
    indent
  );
};

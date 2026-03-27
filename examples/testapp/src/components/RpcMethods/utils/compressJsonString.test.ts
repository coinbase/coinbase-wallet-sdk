import { describe, expect, it } from 'vitest';

import { compressJsonString } from './compressJsonString';

describe('compressJsonString', () => {
  it('should handle empty object', () => {
    expect(compressJsonString('{}')).toBe('{}');
    expect(compressJsonString('{ }')).toBe('{}');
    expect(compressJsonString('{\n}')).toBe('{}');
  });

  it('should handle empty array', () => {
    expect(compressJsonString('[]')).toBe('[]');
    expect(compressJsonString('[ ]')).toBe('[]');
    expect(compressJsonString('[\n]')).toBe('[]');
  });

  it('should compress simple key-value pairs', () => {
    const input = `{
      "name": "John",
      "age": 30
    }`;
    expect(compressJsonString(input)).toBe('{"name":"John","age":30}');
  });

  it('should compress nested objects', () => {
    const input = `{
      "person": {
        "name": "John",
        "age": 30
      }
    }`;
    expect(compressJsonString(input)).toBe('{"person":{"name":"John","age":30}}');
  });

  it('should compress arrays', () => {
    const input = `{
      "numbers": [ 1, 2, 3 ],
      "names": [ "John", "Jane" ]
    }`;
    expect(compressJsonString(input)).toBe('{"numbers":[1,2,3],"names":["John","Jane"]}');
  });

  it('should compress nested arrays', () => {
    const input = `{
      "matrix": [
        [1, 2],
        [3, 4]
      ]
    }`;
    expect(compressJsonString(input)).toBe('{"matrix":[[1,2],[3,4]]}');
  });

  it('should handle mixed types', () => {
    const input = `{
      "string": "hello",
      "number": 42,
      "boolean": true,
      "null": null,
      "array": [1, "two", false],
      "object": {"key": "value"}
    }`;
    expect(compressJsonString(input)).toBe(
      '{"string":"hello","number":42,"boolean":true,"null":null,"array":[1,"two",false],"object":{"key":"value"}}'
    );
  });

  it('should handle multiple spaces between values', () => {
    expect(compressJsonString('{"a":    1,    "b":    2}')).toBe('{"a":1,"b":2}');
  });

  it('should handle tabs and newlines', () => {
    const input = '{\n\t"a":\t1,\n\t"b":\t2\n}';
    expect(compressJsonString(input)).toBe('{"a":1,"b":2}');
  });

  it('should preserve string content with spaces', () => {
    const input = '{"message": "Hello   World"}';
    expect(compressJsonString(input)).toBe('{"message":"Hello   World"}');
  });

  it('should handle empty strings', () => {
    expect(compressJsonString('')).toBe('');
  });

  it('should handle strings with special characters', () => {
    const input = `{
      "special": "\\n\\t\\r",
      "unicode": "\\u0041"
    }`;
    expect(compressJsonString(input)).toBe('{"special":"\\n\\t\\r","unicode":"\\u0041"}');
  });

  it('should handle various tab positions', () => {
    const inputs = [
      // Tabs between brackets
      '[\t1,\t2,\t3\t]',
      // Tabs between braces
      '{\t"a":\t1\t}',
      // Multiple tabs
      '{\t\t\t"a":\t\t\t1\t\t\t}',
      // Tabs in nested structures
      '{\t"obj":\t{\t"arr":\t[\t1\t]\t}\t}',
      // Tabs with newlines
      '{\t\n"a":\t\n1\t\n}',
      // Tabs before and after colons
      '{"a"\t:\t"b"}',
      // Tabs before and after commas
      '{"a":"b"\t,\t"c":"d"}',
    ];

    const expected = [
      '[1,2,3]',
      '{"a":1}',
      '{"a":1}',
      '{"obj":{"arr":[1]}}',
      '{"a":1}',
      '{"a":"b"}',
      '{"a":"b","c":"d"}',
    ];

    inputs.forEach((input, index) => {
      expect(compressJsonString(input)).toBe(expected[index]);
    });
  });

  it('should preserve tabs within string values', () => {
    const inputs = [
      '{"text":"hello\tworld"}',
      '{"multiline":"line1\tline2"}',
      '{"spaces":"hello \t world"}',
      '{"mixed":"tab\there\tand\there"}',
    ];

    // These should remain unchanged as tabs within strings are valid JSON
    inputs.forEach((input) => {
      expect(compressJsonString(input)).toBe(input);
    });
  });
});

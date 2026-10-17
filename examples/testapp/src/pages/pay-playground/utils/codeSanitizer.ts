import * as acorn from 'acorn';

// Define the whitelist of allowed operations
export const WHITELIST = {
  // Allowed SDK functions
  allowedFunctions: ['pay', 'getPaymentStatus'],

  // Allowed object properties and methods
  allowedObjects: {
    base: ['pay', 'getPaymentStatus'],
    console: ['log', 'error', 'warn', 'info'],
    Promise: ['resolve', 'reject', 'all', 'race'],
    Object: ['keys', 'values', 'entries', 'assign'],
    Array: ['isArray', 'from'],
    JSON: ['stringify', 'parse'],
    Math: ['floor', 'ceil', 'round', 'min', 'max', 'abs'],
  } as Record<string, string[]>,

  // Allowed keywords and statements
  allowedStatements: [
    'VariableDeclaration',
    'VariableDeclarator', // Added: Part of variable declarations
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'BlockStatement',
    'ExpressionStatement',
    'ReturnStatement',
    'IfStatement',
    'TryStatement',
    'CatchClause',
    'ThrowStatement',
    'AwaitExpression',
    'CallExpression',
    'MemberExpression',
    'Identifier',
    'Literal',
    'TemplateLiteral',
    'TemplateElement', // Added: Part of template literals
    'ObjectExpression',
    'ArrayExpression',
    'Property',
    'AssignmentExpression',
    'BinaryExpression',
    'UnaryExpression',
    'ConditionalExpression',
    'LogicalExpression',
    'UpdateExpression',
    'SpreadElement',
    'ForStatement', // Added: For loops
    'ForInStatement', // Added: For-in loops
    'ForOfStatement', // Added: For-of loops
    'WhileStatement', // Added: While loops
    'DoWhileStatement', // Added: Do-while loops
    'BreakStatement', // Added: Break statements
    'ContinueStatement', // Added: Continue statements
    'SwitchStatement', // Added: Switch statements
    'SwitchCase', // Added: Switch cases
    'AssignmentPattern', // Added: Destructuring assignments
    'ObjectPattern', // Added: Object destructuring
    'ArrayPattern', // Added: Array destructuring
    'RestElement', // Added: Rest parameters
    'ThisExpression', // Added: 'this' keyword
    'ChainExpression', // Added: Optional chaining
    'OptionalMemberExpression', // Added: Optional member access
    'OptionalCallExpression', // Added: Optional function calls
    'SequenceExpression', // Added: Comma operator
  ],

  // Disallowed global objects and functions
  disallowedGlobals: [
    'eval',
    'Function',
    'AsyncFunction',
    'GeneratorFunction',
    'AsyncGeneratorFunction',
    'require',
    'import',
    'export',
    'process',
    'global',
    'window',
    'document',
    'XMLHttpRequest',
    'fetch',
    'WebSocket',
    'Worker',
    'SharedWorker',
    'ServiceWorker',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'crypto',
    'location',
    'history',
    'navigator',
    '__dirname',
    '__filename',
    'module',
    'exports',
    'Buffer',
    'setInterval',
    'setTimeout',
    'setImmediate',
    'clearInterval',
    'clearTimeout',
    'clearImmediate',
  ],
};

interface ValidationError {
  message: string;
  line?: number;
  column?: number;
}

interface ASTNode {
  body?: ASTNode[];
  type?: string;
  loc?: { start: { line: number; column: number } };
  callee?: ASTNode;
  object?: ASTNode;
  property?: ASTNode;
  name?: string;
  value?: unknown;
  computed?: boolean;
  [key: string]: unknown;
}

export class CodeSanitizer {
  private errors: ValidationError[] = [];

  /**
   * Sanitize and validate the code based on whitelist
   */
  sanitize(code: string): {
    isValid: boolean;
    sanitizedCode: string;
    errors: ValidationError[];
  } {
    this.errors = [];

    try {
      // First, apply basic sanitization (remove imports, etc.)
      const preSanitized = this.applySanitization(code);

      // Wrap the code in an async function for parsing
      // This allows return statements and await expressions at the top level
      const wrappedCode = `async function __userCode__() {\n${preSanitized}\n}`;

      // Parse the wrapped code into an AST
      const ast = acorn.parse(wrappedCode, {
        ecmaVersion: 2020,
        sourceType: 'module',
        locations: true,
      });

      // Extract the function body for validation
      // The AST structure will be: Program -> FunctionDeclaration -> BlockStatement
      const program = ast as acorn.Program;
      const functionNode = program.body[0] as unknown as ASTNode;
      if (functionNode && functionNode.body) {
        // Validate the function body
        this.validateNode(functionNode.body as unknown as ASTNode);
      }

      // If validation passes, return the sanitized code
      if (this.errors.length === 0) {
        return {
          isValid: true,
          sanitizedCode: preSanitized,
          errors: [],
        };
      }

      return {
        isValid: false,
        sanitizedCode: '',
        errors: this.errors,
      };
    } catch (error) {
      // Parse error - try to extract meaningful line number
      if (error instanceof SyntaxError) {
        const match = error.message.match(/\((\d+):(\d+)\)/);
        let line;
        let column;

        if (match) {
          // Adjust line number since we wrapped the code
          line = Number.parseInt(match[1]) - 1;
          column = Number.parseInt(match[2]);
        }

        this.errors.push({
          message: error.message.replace(/\(\d+:\d+\)/, line ? `(${line}:${column})` : ''),
          line,
          column,
        });
      } else {
        this.errors.push({
          message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      return {
        isValid: false,
        sanitizedCode: '',
        errors: this.errors,
      };
    }
  }

  /**
   * Recursively validate AST nodes
   */
  private validateNode(node: ASTNode): void {
    if (!node) return;

    // Check if the node type is allowed
    if (!WHITELIST.allowedStatements.includes(node.type)) {
      this.errors.push({
        message: `Disallowed statement type: ${node.type}`,
        line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
        column: node.loc?.start.column,
      });
      return;
    }

    // Special validation for specific node types
    switch (node.type) {
      case 'CallExpression':
        this.validateCallExpression(node);
        break;

      case 'MemberExpression':
        this.validateMemberExpression(node);
        break;

      case 'Identifier':
        this.validateIdentifier(node);
        break;

      case 'NewExpression':
        this.errors.push({
          message: `Constructor calls are not allowed`,
          line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
          column: node.loc?.start.column,
        });
        return;
    }

    // Recursively validate child nodes
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'type') continue;

      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            this.validateNode(item as ASTNode);
          }
        });
      } else if (typeof child === 'object' && child !== null) {
        this.validateNode(child as ASTNode);
      }
    }
  }

  /**
   * Validate function calls
   */
  private validateCallExpression(node: ASTNode): void {
    // Check if it's a direct function call
    if (node.callee.type === 'Identifier') {
      const funcName = node.callee.name;

      // Check if it's an allowed SDK function
      if (!WHITELIST.allowedFunctions.includes(funcName)) {
        // Check if it's a disallowed global
        if (WHITELIST.disallowedGlobals.includes(funcName)) {
          this.errors.push({
            message: `Function '${funcName}' is not allowed`,
            line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
            column: node.loc?.start.column,
          });
        }
      }
    }

    // Check if it's a method call
    if (node.callee.type === 'MemberExpression') {
      this.validateMemberExpression(node.callee);
    }
  }

  /**
   * Validate member expressions (object.property)
   */
  private validateMemberExpression(node: ASTNode): void {
    // Get the object name
    let objectName = '';
    if (node.object.type === 'Identifier') {
      objectName = node.object.name;
    } else if (
      node.object.type === 'MemberExpression' &&
      node.object.object.type === 'Identifier'
    ) {
      objectName = node.object.object.name;
    }

    // Get the property name
    let propertyName = '';
    if (node.property.type === 'Identifier') {
      propertyName = node.computed ? '' : node.property.name;
    } else if (node.property.type === 'Literal') {
      propertyName = String(node.property.value);
    }

    // Validate against whitelist
    if (objectName && objectName in WHITELIST.allowedObjects) {
      const allowedProps = WHITELIST.allowedObjects[objectName];
      if (propertyName && !allowedProps.includes(propertyName)) {
        this.errors.push({
          message: `Property '${objectName}.${propertyName}' is not allowed`,
          line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
          column: node.loc?.start.column,
        });
      }
    } else if (objectName && WHITELIST.disallowedGlobals.includes(objectName)) {
      this.errors.push({
        message: `Object '${objectName}' is not allowed`,
        line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
        column: node.loc?.start.column,
      });
    }
  }

  /**
   * Validate identifiers
   */
  private validateIdentifier(node: ASTNode): void {
    // Skip validation for allowed functions and objects
    if (WHITELIST.allowedFunctions.includes(node.name)) return;
    if (node.name in WHITELIST.allowedObjects) return;

    // Check for disallowed globals
    if (WHITELIST.disallowedGlobals.includes(node.name)) {
      this.errors.push({
        message: `Identifier '${node.name}' is not allowed`,
        line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
        column: node.loc?.start.column,
      });
    }
  }

  /**
   * Apply sanitization transformations to the code
   */
  private applySanitization(code: string): string {
    let sanitized = code;

    // Remove import statements
    sanitized = sanitized.replace(/^\s*import\s+.*?(?:from\s+['"][^'"]+['"])?[;\s]*$/gm, '');

    // Remove multiline imports
    sanitized = sanitized.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '');

    // Remove export statements
    sanitized = sanitized.replace(/^\s*export\s+.*?[;\s]*$/gm, '');

    // Clean up extra newlines
    sanitized = sanitized.replace(/^\s*\n/gm, '');

    return sanitized;
  }
}

/**
 * Convenience function to sanitize code
 */
export function sanitizeCode(code: string): {
  isValid: boolean;
  sanitizedCode: string;
  errors: ValidationError[];
} {
  const sanitizer = new CodeSanitizer();
  return sanitizer.sanitize(code);
}

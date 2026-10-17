# Pay Playground

An interactive playground for testing the Base Pay SDK functions (`pay` and `getPaymentStatus`).

## Features

- **Interactive Code Editor**: Edit and execute payment code in real-time
- **Live Output**: See results, errors, and console output immediately
- **Quick Tips**: Helpful hints and examples for common use cases
- **Payer Info Toggle**: Easily switch between basic and payer info collection modes
- **Dual Function Support**: Test both `pay` and `getPaymentStatus` functions

## Layout

This page uses a custom layout without the main app header (SDK type switcher, environment selector, and Reset button) to provide a cleaner, focused experience for testing payment functionality.

## Components

- `CodeEditor`: Monaco-based code editor with syntax highlighting
- `Output`: Displays execution results, errors, and console logs
- `QuickTips`: Shows contextual help and examples
- `Header`: Simple header specific to the playground

## Usage

1. Navigate to `/pay-playground` in the testapp
2. Edit the code in the editor
3. Click "Run" to execute the code
4. View results in the output panel
5. Use Quick Tips for guidance on common patterns

## Development

The playground executes code in a sandboxed environment with access to the Base Pay SDK functions. Console output is captured and displayed in real-time.

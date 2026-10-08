# Testing Guide

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "test name"

# Run with coverage
npm run coverage
```

## Writing Tests
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases
- Mock external dependencies

## Test Coverage
Aim for >80% code coverage on critical paths.

# Migration Guide

## Overview
This document helps you migrate between major versions.

## Pre-Migration Checklist
- [ ] Backup current configuration
- [ ] Review breaking changes
- [ ] Test in staging environment
- [ ] Plan rollback strategy

## Migration Steps

### Step 1: Update Dependencies
```bash
npm update
```

### Step 2: Update Configuration
Review and update config files as needed.

### Step 3: Run Migrations
```bash
npm run migrate
```

### Step 4: Verify
Run tests and verify functionality.

## Rollback
If issues occur, restore from backup.

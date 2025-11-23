# PDA Vault

A Solana program that uses a Program-Derived Account (PDA) to hold and manage SPL tokens.

## What it does

- **Initialize**: Create a vault token account
- **Deposit**: Transfer tokens into the vault
- **Withdraw**: Transfer tokens out of the vault

## Quick Start

```bash
# Start validator
solana-test-validator

# Run tests
anchor test --skip-local-validator
```

## Program ID

```
A2qBxbgjy8X9GsGbtdCCkYd1nHXV8q2rx6ygit2gi35k
```

## Instructions

### `initialize_vault`
Creates a token account owned by the vault PDA.

### `deposit(amount)`
Transfers tokens from user to vault.

### `withdraw(amount)`
Transfers tokens from vault to user.

## Test Results

```
✔ Initialize vault
✔ Deposit tokens
✔ Withdraw tokens

3 passing
```

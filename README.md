# Blockchain-Secured Form Approval Smart Contract

A Solana smart contract built with Anchor framework that provides tamper-proof digital approval for form submissions using blockchain technology.

## Overview

This smart contract enables administrators to digitally approve or reject student-submitted forms with immutable blockchain records. When an admin approves a form, the system generates a SHA-256 hash of the submission data and records it on-chain along with the admin's address and timestamp.

## Features

- **Immutable Form Approval**: Once approved, form data cannot be tampered with
- **Admin Management**: Authority-controlled admin addition/removal system
- **Verification System**: Anyone can verify form approvals without system access
- **Metadata Support**: Optional metadata for additional form information
- **Access Control**: Only authorized admins can approve forms
- **Event Emission**: Contract emits events for transparency

## Architecture

### Core Components

1. **Config Module** (`src/config.rs`): Configuration constants and error definitions
2. **State Module** (`src/state.rs`): Account structures and data models
3. **Instructions Module** (`src/instructions.rs`): Account validation contexts
4. **Main Contract** (`src/lib.rs`): Core business logic and instruction handlers

### Account Structures

#### AdminConfig

- **Authority**: The master authority who can add/remove admins
- **Admins**: Vector of authorized admin public keys
- **Bump**: PDA bump seed

#### FormApproval

- **Form ID**: Unique identifier for the form
- **Form Hash**: SHA-256 hash of the form submission data
- **Signer**: Public key of the admin who approved the form
- **Approved At**: Timestamp when the form was approved
- **Metadata**: Optional additional information
- **Bump**: PDA bump seed

## Smart Contract Functions

### Administrative Functions

#### `initialize_admin_config()`

Initializes the admin configuration with the deployer as the first admin and authority.

#### `add_admin(new_admin: Pubkey)`

Adds a new admin to the system. Only callable by the authority.

#### `remove_admin(admin_to_remove: Pubkey)`

Removes an admin from the system. Only callable by the authority. Cannot remove the last admin.

### Form Approval Functions

#### `sign_form_submission(form_id: String, form_hash: [u8; 32], metadata: Option<String>)`

Creates a blockchain record of form approval with:

- Unique form ID
- SHA-256 hash of form data
- Admin signature
- Timestamp
- Optional metadata

#### `update_form_approval(form_id: String, metadata: String)`

Updates the metadata of an existing form approval. Only the original signer can update.

### Verification Functions

#### `verify_form_approval(form_id: String, expected_hash: [u8; 32]) -> bool`

Verifies if a form approval exists and matches the expected hash.

#### `get_form_approval_details(form_id: String) -> (String, [u8; 32], Pubkey, i64, String)`

Returns complete details of a form approval:

- Form ID
- Form hash
- Signer public key
- Approval timestamp
- Metadata

## Security Features

- **Access Control**: Only authorized admins can approve forms
- **Input Validation**: All inputs are validated for length and format
- **PDA Security**: Uses Program Derived Addresses for secure account management
- **Immutability**: Approved forms cannot be modified or deleted
- **Authority Protection**: Cannot remove the last admin to prevent lockout

## Error Handling

The contract includes comprehensive error handling for:

- `FormIdTooLong`: Form ID exceeds maximum length (64 characters)
- `MetadataTooLong`: Metadata exceeds maximum length (256 characters)
- `FormAlreadyApproved`: Attempt to approve the same form twice
- `UnauthorizedAdmin`: Non-admin attempting restricted operations
- `AdminAlreadyExists`: Adding an admin that already exists
- `AdminNotFound`: Removing an admin that doesn't exist
- `MaxAdminsReached`: Exceeding the maximum number of admins (10)
- `InvalidFormHash`: Using an invalid or zero hash
- `CannotRemoveLastAdmin`: Preventing authority lockout

## Development Setup

### Prerequisites

- Rust 1.70+
- Solana CLI 1.16+
- Anchor CLI 0.31+
- Node.js 18+
- Yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Build the contract:
   ```bash
   anchor build
   ```
4. Run tests:
   ```bash
   anchor test
   ```

### Local Development

1. Start local validator:
   ```bash
   solana-test-validator
   ```
2. Deploy to localnet:
   ```bash
   anchor deploy
   ```

## Testing

The contract includes comprehensive unit tests covering:

### Admin Configuration Tests

- ✅ Admin config initialization
- ✅ Adding new admins
- ✅ Preventing unauthorized admin additions
- ✅ Preventing duplicate admins
- ✅ Removing admins
- ✅ Preventing removal of last admin

### Form Approval Tests

- ✅ Successful form signing
- ✅ Preventing unauthorized form signing
- ✅ Invalid hash validation
- ✅ Form ID length validation
- ✅ Metadata updates
- ✅ Unauthorized update prevention

### Verification Tests

- ✅ Form approval verification
- ✅ Incorrect hash detection
- ✅ Form details retrieval

### Edge Cases

- ✅ Metadata length validation
- ✅ No metadata handling
- ✅ Double approval prevention

Run tests with:

```bash
anchor test
```

## Usage Examples

### Initialize Admin System

```typescript
await program.methods
  .initializeAdminConfig()
  .accounts({
    adminConfig: adminConfigPda,
    authority: authority.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Approve a Form

```typescript
const formHash = crypto.createHash('sha256').update(formData).digest();

await program.methods
  .signFormSubmission(formId, Array.from(formHash), metadata)
  .accounts({
    formApproval: formApprovalPda,
    adminConfig: adminConfigPda,
    admin: admin.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([admin])
  .rpc();
```

### Verify a Form

```typescript
const isValid = await program.methods
  .verifyFormApproval(formId, Array.from(expectedHash))
  .accounts({
    formApproval: formApprovalPda,
  })
  .view();
```

## Best Practices

1. **Hash Generation**: Always use SHA-256 for form data hashing
2. **Access Control**: Maintain strict admin authorization
3. **Error Handling**: Always handle potential errors gracefully
4. **PDA Derivation**: Use consistent seeds for PDA derivation
5. **Testing**: Comprehensive testing for all edge cases
6. **Metadata**: Use metadata for additional context but keep it concise

## Security Considerations

- Store sensitive data off-chain, only hashes on-chain
- Regularly audit admin lists
- Use secure key management for admin accounts
- Monitor blockchain events for transparency
- Implement client-side validation as additional protection

## Integration

### Backend Integration (NestJS)

```typescript
// Example service method
async approveForm(formId: string, formData: any, adminKeypair: Keypair) {
  const formHash = crypto.createHash('sha256').update(JSON.stringify(formData)).digest();

  const tx = await this.program.methods
    .signFormSubmission(formId, Array.from(formHash), metadata)
    .accounts({
      formApproval: formApprovalPda,
      adminConfig: adminConfigPda,
      admin: adminKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([adminKeypair])
    .rpc();

  return tx;
}
```

### Frontend Integration

Use `@solana/web3.js` and `@coral-xyz/anchor` to interact with the contract from your frontend application.

## License

This project is licensed under the ISC License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For questions or issues, please open an issue in the repository or contact the development team.

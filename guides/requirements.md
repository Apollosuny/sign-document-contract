# Blockchain-Secured Form Approval

## 1. Feature Name

Blockchain-Secured Form Approval

## 2. Actors

- **Admin**: Creates forms, reviews student submissions, and approves or rejects them.
- **Student**: Submits responses to predefined forms.
- **Smart Contract (Blockchain Layer)**: Stores tamper-proof records of approved forms.

## 3. Description

This feature enables administrators to digitally approve or reject student-submitted forms using a blockchain-based signature mechanism. When an admin approves a form, the system generates a hash of the submission data and records it on-chain along with the admin's address and timestamp.

This approach ensures:

- The submission content cannot be modified after approval.
- Approval time is precisely recorded and verifiable.
- The approval record is immutable and publicly verifiable.

## 4. Workflow

1. **Admin creates a form** with customizable fields.
2. **Student submits the form** via the frontend.
3. The submission is saved to the backend and flagged for admin review.
4. **Admin reviews** the submission and decides to approve or reject.
5. On approval:
   - A **SHA-256 hash** of the submission data is computed.
   - The hash, along with the admin's address and current timestamp, is **submitted to the blockchain** via a smart contract.
   - A transaction ID and confirmation details are returned.
6. The backend stores the `formId`, `hash`, `signer`, `txHash`, and `onChainTimestamp`.
7. Any party can **verify the approval** by comparing the form hash with the one stored on-chain.

## 5. Technical Considerations

- **Hashing Algorithm**: SHA-256
- **Blockchain Platform**: Solana (preferred), or EVM-compatible chains (e.g., Polygon)
- **Smart Contract Function**:
  ```solidity
  function signFormSubmission(bytes32 formHash) public {
      // Store hash, sender address, timestamp
  }
  ```
- **Backend (NestJS)**:
  - Computes form hash
  - Calls smart contract
  - Stores form metadata with blockchain references

## 6. Benefits

- Guarantees document authenticity and immutability
- Enables external verification without system access
- Prevents tampering and backdating of approvals
- Builds a transparent and auditable process for academic administration

---

This requirement supports secure digital transformation of school procedures by leveraging blockchain’s transparency and immutability for high-integrity form approval flows.

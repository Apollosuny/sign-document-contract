import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import * as crypto from 'crypto';

describe('sign-document-contract', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SignDocumentContract;

  // Test accounts
  const authority = provider.wallet;
  const admin1 = Keypair.generate();
  const admin2 = Keypair.generate();
  const unauthorizedUser = Keypair.generate();

  // Test data
  const testFormId = 'form_123';
  const testFormHash = crypto
    .createHash('sha256')
    .update('test form data')
    .digest();
  const testMetadata = 'Test form metadata';

  // PDAs
  let adminConfigPda: PublicKey;
  let adminConfigBump: number;
  let formApprovalPda: PublicKey;
  let formApprovalBump: number;

  before(async () => {
    // Derive PDAs
    [adminConfigPda, adminConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin_config')],
      program.programId
    );

    [formApprovalPda, formApprovalBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('form_approval'), Buffer.from(testFormId)],
      program.programId
    );

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(admin1.publicKey, 2e9);
    await provider.connection.requestAirdrop(admin2.publicKey, 2e9);
    await provider.connection.requestAirdrop(unauthorizedUser.publicKey, 2e9);

    // Wait for transactions to confirm
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe('Admin Configuration', () => {
    it('Initializes admin configuration successfully', async () => {
      const tx = await program.methods
        .initializeAdminConfig()
        .accounts({
          adminConfig: adminConfigPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify the admin config was created
      const adminConfig = await program.account.adminConfig.fetch(
        adminConfigPda
      );
      expect(adminConfig.authority.toString()).to.equal(
        authority.publicKey.toString()
      );
      expect(adminConfig.adminCount).to.equal(1);
      expect(adminConfig.admins[0].toString()).to.equal(
        authority.publicKey.toString()
      );
      expect(adminConfig.bump).to.equal(adminConfigBump);
    });

    it('Adds a new admin successfully', async () => {
      await program.methods
        .addAdmin(admin1.publicKey)
        .accounts({
          adminConfig: adminConfigPda,
          authority: authority.publicKey,
        })
        .rpc();

      const adminConfig = await program.account.adminConfig.fetch(
        adminConfigPda
      );
      expect(adminConfig.adminCount).to.equal(2);

      // Check that admin1 was added (either at index 0 or 1)
      const adminKeys = [
        adminConfig.admins[0].toString(),
        adminConfig.admins[1].toString(),
      ];
      expect(adminKeys).to.include(admin1.publicKey.toString());
    });

    it('Prevents unauthorized users from adding admins', async () => {
      try {
        await program.methods
          .addAdmin(admin2.publicKey)
          .accounts({
            adminConfig: adminConfigPda,
            authority: unauthorizedUser.publicKey,
          })
          .signers([unauthorizedUser])
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.toString()).to.include('UnauthorizedAdmin');
      }
    });

    it('Prevents adding duplicate admins', async () => {
      try {
        await program.methods
          .addAdmin(admin1.publicKey)
          .accounts({
            adminConfig: adminConfigPda,
            authority: authority.publicKey,
          })
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.toString()).to.include('AdminAlreadyExists');
      }
    });

    it('Removes an admin successfully', async () => {
      // First add admin2
      await program.methods
        .addAdmin(admin2.publicKey)
        .accounts({
          adminConfig: adminConfigPda,
          authority: authority.publicKey,
        })
        .rpc();

      // Then remove admin1
      await program.methods
        .removeAdmin(admin1.publicKey)
        .accounts({
          adminConfig: adminConfigPda,
          authority: authority.publicKey,
        })
        .rpc();

      const adminConfig = await program.account.adminConfig.fetch(
        adminConfigPda
      );

      // Check that admin1 is not in the active admins
      let admin1Found = false;
      for (let i = 0; i < adminConfig.adminCount; i++) {
        if (adminConfig.admins[i].toString() === admin1.publicKey.toString()) {
          admin1Found = true;
          break;
        }
      }
      expect(admin1Found).to.be.false;
    });

    it('Prevents removing the last admin', async () => {
      // Remove admin2, leaving only authority
      await program.methods
        .removeAdmin(admin2.publicKey)
        .accounts({
          adminConfig: adminConfigPda,
          authority: authority.publicKey,
        })
        .rpc();

      // Try to remove the last admin (authority)
      try {
        await program.methods
          .removeAdmin(authority.publicKey)
          .accounts({
            adminConfig: adminConfigPda,
            authority: authority.publicKey,
          })
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.toString()).to.include('CannotRemoveLastAdmin');
      }
    });
  });

  describe('Form Approval', () => {
    before(async () => {
      // Re-add admin1 for form approval tests
      await program.methods
        .addAdmin(admin1.publicKey)
        .accounts({
          adminConfig: adminConfigPda,
          authority: authority.publicKey,
        })
        .rpc();
    });

    it('Signs a form submission successfully', async () => {
      const beforeTimestamp = Math.floor(Date.now() / 1000);

      await program.methods
        .signFormSubmission(testFormId, Array.from(testFormHash), testMetadata)
        .accounts({
          formApproval: formApprovalPda,
          adminConfig: adminConfigPda,
          admin: admin1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin1])
        .rpc();

      // Verify the form approval was created
      const formApproval = await program.account.formApproval.fetch(
        formApprovalPda
      );
      expect(formApproval.formId).to.equal(testFormId);
      expect(Buffer.from(formApproval.formHash)).to.deep.equal(testFormHash);
      expect(formApproval.signer.toString()).to.equal(
        admin1.publicKey.toString()
      );
      expect(formApproval.approvedAt.toNumber()).to.be.greaterThanOrEqual(
        beforeTimestamp
      );
      expect(formApproval.metadata).to.equal(testMetadata);
      expect(formApproval.bump).to.equal(formApprovalBump);
    });

    it('Prevents unauthorized users from signing forms', async () => {
      const unauthorizedFormId = 'unauthorized_form';
      const [unauthorizedFormPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('form_approval'), Buffer.from(unauthorizedFormId)],
        program.programId
      );

      try {
        await program.methods
          .signFormSubmission(
            unauthorizedFormId,
            Array.from(testFormHash),
            null
          )
          .accounts({
            formApproval: unauthorizedFormPda,
            adminConfig: adminConfigPda,
            admin: unauthorizedUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.toString()).to.include('UnauthorizedAdmin');
      }
    });

    it('Prevents signing forms with invalid hash', async () => {
      const invalidFormId = 'invalid_form';
      const [invalidFormPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('form_approval'), Buffer.from(invalidFormId)],
        program.programId
      );
      const invalidHash = new Array(32).fill(0);

      try {
        await program.methods
          .signFormSubmission(invalidFormId, invalidHash, null)
          .accounts({
            formApproval: invalidFormPda,
            adminConfig: adminConfigPda,
            admin: admin1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin1])
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.toString()).to.include('InvalidFormHash');
      }
    });

    it('Prevents form ID that is too long', async () => {
      const longFormId = 'a'.repeat(65); // Exceeds MAX_FORM_ID_LENGTH (64)
      const [longFormPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('form_approval'), Buffer.from(longFormId)],
        program.programId
      );

      try {
        await program.methods
          .signFormSubmission(longFormId, Array.from(testFormHash), null)
          .accounts({
            formApproval: longFormPda,
            adminConfig: adminConfigPda,
            admin: admin1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin1])
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.toString()).to.include('FormIdTooLong');
      }
    });

    it('Updates form approval metadata successfully', async () => {
      const newMetadata = 'Updated metadata';

      await program.methods
        .updateFormApproval(testFormId, newMetadata)
        .accounts({
          formApproval: formApprovalPda,
          adminConfig: adminConfigPda,
          admin: admin1.publicKey,
        })
        .signers([admin1])
        .rpc();

      const formApproval = await program.account.formApproval.fetch(
        formApprovalPda
      );
      expect(formApproval.metadata).to.equal(newMetadata);
    });

    it('Prevents unauthorized users from updating metadata', async () => {
      try {
        await program.methods
          .updateFormApproval(testFormId, 'Unauthorized update')
          .accounts({
            formApproval: formApprovalPda,
            adminConfig: adminConfigPda,
            admin: unauthorizedUser.publicKey,
          })
          .signers([unauthorizedUser])
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.toString()).to.include('UnauthorizedAdmin');
      }
    });

    it('Verifies form approval successfully', async () => {
      const result = await program.methods
        .verifyFormApproval(testFormId, Array.from(testFormHash))
        .accounts({
          formApproval: formApprovalPda,
        })
        .view();

      expect(result).to.be.true;
    });

    it('Returns false for incorrect hash verification', async () => {
      const wrongHash = crypto
        .createHash('sha256')
        .update('wrong data')
        .digest();

      const result = await program.methods
        .verifyFormApproval(testFormId, Array.from(wrongHash))
        .accounts({
          formApproval: formApprovalPda,
        })
        .view();

      expect(result).to.be.false;
    });

    it('Gets form approval details successfully', async () => {
      const [formId, formHash, signer, approvedAt, metadata] =
        await program.methods
          .getFormApprovalDetails(testFormId)
          .accounts({
            formApproval: formApprovalPda,
          })
          .view();

      expect(formId).to.equal(testFormId);
      expect(Buffer.from(formHash)).to.deep.equal(testFormHash);
      expect(signer.toString()).to.equal(admin1.publicKey.toString());
      expect(approvedAt.toNumber()).to.be.greaterThan(0);
      expect(metadata).to.equal('Updated metadata'); // From previous test
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('Prevents metadata that is too long', async () => {
      const longMetadata = 'a'.repeat(257); // Exceeds MAX_METADATA_LENGTH (256)

      try {
        await program.methods
          .updateFormApproval(testFormId, longMetadata)
          .accounts({
            formApproval: formApprovalPda,
            adminConfig: adminConfigPda,
            admin: admin1.publicKey,
          })
          .signers([admin1])
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.toString()).to.include('MetadataTooLong');
      }
    });

    it('Handles form submission with no metadata', async () => {
      const noMetadataFormId = 'no_metadata_form';
      const [noMetadataFormPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('form_approval'), Buffer.from(noMetadataFormId)],
        program.programId
      );

      await program.methods
        .signFormSubmission(noMetadataFormId, Array.from(testFormHash), null)
        .accounts({
          formApproval: noMetadataFormPda,
          adminConfig: adminConfigPda,
          admin: admin1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin1])
        .rpc();

      const formApproval = await program.account.formApproval.fetch(
        noMetadataFormPda
      );
      expect(formApproval.metadata).to.equal('');
    });

    it('Prevents double approval of the same form', async () => {
      try {
        await program.methods
          .signFormSubmission(testFormId, Array.from(testFormHash), null)
          .accounts({
            formApproval: formApprovalPda,
            adminConfig: adminConfigPda,
            admin: admin1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin1])
          .rpc();

        expect.fail('Should have thrown an error');
      } catch (error) {
        // This should fail because the account already exists
        expect(error.toString()).to.include('already in use');
      }
    });
  });
});

use anchor_lang::prelude::*;

pub mod config;
pub mod state;
pub mod instructions;

use config::*;
use instructions::*;

declare_id!("7xMFfY7wEggjbVTQvtLYXcnAsNBFxiBDSx6ohtuxSYXt");

#[program]
pub mod sign_document_contract {
    use super::*;

    /// Initialize the admin configuration with the first admin
    pub fn initialize_admin_config(ctx: Context<InitializeAdminConfig>) -> Result<()> {
        let admin_config = &mut ctx.accounts.admin_config;
        
        admin_config.authority = ctx.accounts.authority.key();
        admin_config.admins = [Pubkey::default(); 10];
        admin_config.admins[0] = ctx.accounts.authority.key();
        admin_config.admin_count = 1;
        admin_config.bump = ctx.bumps.admin_config;
        
        msg!("Admin config initialized with authority: {}", ctx.accounts.authority.key());
        Ok(())
    }

    /// Sign a form submission with blockchain approval
    pub fn sign_form_submission(
        ctx: Context<SignFormSubmission>,
        form_id: String,
        form_hash: [u8; 32],
        metadata: Option<String>,
    ) -> Result<()> {
        // Validate inputs
        require!(
            form_id.len() <= Config::MAX_FORM_ID_LENGTH,
            FormApprovalError::FormIdTooLong
        );
        
        if let Some(ref meta) = metadata {
            require!(
                meta.len() <= Config::MAX_METADATA_LENGTH,
                FormApprovalError::MetadataTooLong
            );
        }
        
        require!(
            form_hash != [0u8; 32],
            FormApprovalError::InvalidFormHash
        );

        let form_approval = &mut ctx.accounts.form_approval;
        let clock = Clock::get()?;
        
        // Initialize the form approval account
        form_approval.form_id = form_id.clone();
        form_approval.form_hash = form_hash;
        form_approval.signer = ctx.accounts.admin.key();
        form_approval.approved_at = clock.unix_timestamp;
        form_approval.metadata = metadata.unwrap_or_default();
        form_approval.bump = ctx.bumps.form_approval;
        
        msg!(
            "Form {} approved by admin {} at timestamp {}",
            form_id,
            ctx.accounts.admin.key(),
            clock.unix_timestamp
        );
        
        Ok(())
    }

    /// Update metadata for an existing form approval
    pub fn update_form_approval(
        ctx: Context<UpdateFormApproval>,
        _form_id: String,
        metadata: String,
    ) -> Result<()> {
        require!(
            metadata.len() <= Config::MAX_METADATA_LENGTH,
            FormApprovalError::MetadataTooLong
        );
        
        let form_approval = &mut ctx.accounts.form_approval;
        form_approval.metadata = metadata;
        
        msg!("Form approval metadata updated by admin: {}", ctx.accounts.admin.key());
        Ok(())
    }

    /// Add a new admin to the system
    pub fn add_admin(ctx: Context<AddAdmin>, new_admin: Pubkey) -> Result<()> {
        let admin_config = &mut ctx.accounts.admin_config;
        admin_config.add_admin(new_admin)?;
        
        msg!("New admin added: {}", new_admin);
        Ok(())
    }

    /// Remove an admin from the system
    pub fn remove_admin(ctx: Context<RemoveAdmin>, admin_to_remove: Pubkey) -> Result<()> {
        let admin_config = &mut ctx.accounts.admin_config;
        admin_config.remove_admin(&admin_to_remove)?;
        
        msg!("Admin removed: {}", admin_to_remove);
        Ok(())
    }

    /// Verify a form approval (read-only function)
    pub fn verify_form_approval(
        ctx: Context<VerifyFormApproval>,
        _form_id: String,
        expected_hash: [u8; 32],
    ) -> Result<bool> {
        let form_approval = &ctx.accounts.form_approval;
        let is_valid = form_approval.form_hash == expected_hash;
        
        msg!(
            "Form verification result: {} (expected: {:?}, actual: {:?})",
            is_valid,
            expected_hash,
            form_approval.form_hash
        );
        
        Ok(is_valid)
    }

    /// Get form approval details (read-only function)
    pub fn get_form_approval_details(
        ctx: Context<VerifyFormApproval>,
        _form_id: String,
    ) -> Result<(String, [u8; 32], Pubkey, i64, String)> {
        let form_approval = &ctx.accounts.form_approval;
        
        Ok((
            form_approval.form_id.clone(),
            form_approval.form_hash,
            form_approval.signer,
            form_approval.approved_at,
            form_approval.metadata.clone(),
        ))
    }
}

/// Events emitted by the contract
#[event]
pub struct FormApproved {
    pub form_id: String,
    pub form_hash: [u8; 32],
    pub signer: Pubkey,
    pub approved_at: i64,
}

#[event]
pub struct AdminAdded {
    pub admin: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct AdminRemoved {
    pub admin: Pubkey,
    pub authority: Pubkey,
}

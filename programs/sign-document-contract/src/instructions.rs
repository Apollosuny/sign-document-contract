use anchor_lang::prelude::*;
use crate::state::*;
use crate::config::*;

/// Context for initializing the admin configuration
#[derive(Accounts)]
pub struct InitializeAdminConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = AdminConfig::space(),
        seeds = [Config::ADMIN_CONFIG_SEED],
        bump
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Context for signing a form submission
#[derive(Accounts)]
#[instruction(form_id: String)]
pub struct SignFormSubmission<'info> {
    #[account(
        init,
        payer = admin,
        space = FormApproval::space(form_id.len(), 0),
        seeds = [Config::FORM_APPROVAL_SEED, form_id.as_bytes()],
        bump
    )]
    pub form_approval: Account<'info, FormApproval>,
    
    #[account(
        seeds = [Config::ADMIN_CONFIG_SEED],
        bump = admin_config.bump,
        constraint = admin_config.is_admin(&admin.key()) @ FormApprovalError::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Context for updating form approval with metadata
#[derive(Accounts)]
#[instruction(form_id: String)]
pub struct UpdateFormApproval<'info> {
    #[account(
        mut,
        seeds = [Config::FORM_APPROVAL_SEED, form_id.as_bytes()],
        bump = form_approval.bump,
        constraint = form_approval.signer == admin.key() @ FormApprovalError::UnauthorizedAdmin
    )]
    pub form_approval: Account<'info, FormApproval>,
    
    #[account(
        seeds = [Config::ADMIN_CONFIG_SEED],
        bump = admin_config.bump,
        constraint = admin_config.is_admin(&admin.key()) @ FormApprovalError::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    pub admin: Signer<'info>,
}

/// Context for adding a new admin
#[derive(Accounts)]
pub struct AddAdmin<'info> {
    #[account(
        mut,
        seeds = [Config::ADMIN_CONFIG_SEED],
        bump = admin_config.bump,
        constraint = admin_config.authority == authority.key() @ FormApprovalError::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    pub authority: Signer<'info>,
}

/// Context for removing an admin
#[derive(Accounts)]
pub struct RemoveAdmin<'info> {
    #[account(
        mut,
        seeds = [Config::ADMIN_CONFIG_SEED],
        bump = admin_config.bump,
        constraint = admin_config.authority == authority.key() @ FormApprovalError::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    pub authority: Signer<'info>,
}

/// Context for verifying a form approval
#[derive(Accounts)]
#[instruction(form_id: String)]
pub struct VerifyFormApproval<'info> {
    #[account(
        seeds = [Config::FORM_APPROVAL_SEED, form_id.as_bytes()],
        bump = form_approval.bump
    )]
    pub form_approval: Account<'info, FormApproval>,
}

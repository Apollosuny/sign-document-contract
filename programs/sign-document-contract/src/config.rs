use anchor_lang::prelude::*;

/// Configuration constants for the form approval system
pub struct Config;

impl Config {
    /// Maximum length for form ID strings
    pub const MAX_FORM_ID_LENGTH: usize = 64;
    
    /// Maximum length for additional metadata
    pub const MAX_METADATA_LENGTH: usize = 256;
    
    /// Seed for the form approval account derivation
    pub const FORM_APPROVAL_SEED: &'static [u8] = b"form_approval";
    
    /// Seed for the admin config account derivation
    pub const ADMIN_CONFIG_SEED: &'static [u8] = b"admin_config";
    
    /// Maximum number of admins allowed
    pub const MAX_ADMINS: usize = 10;
}

/// Error codes for the smart contract
#[error_code]
pub enum FormApprovalError {
    #[msg("Form ID is too long")]
    FormIdTooLong,
    
    #[msg("Metadata is too long")]
    MetadataTooLong,
    
    #[msg("Form already approved")]
    FormAlreadyApproved,
    
    #[msg("Unauthorized admin")]
    UnauthorizedAdmin,
    
    #[msg("Admin already exists")]
    AdminAlreadyExists,
    
    #[msg("Admin not found")]
    AdminNotFound,
    
    #[msg("Maximum number of admins reached")]
    MaxAdminsReached,
    
    #[msg("Invalid form hash")]
    InvalidFormHash,
    
    #[msg("Cannot remove the last admin")]
    CannotRemoveLastAdmin,
}

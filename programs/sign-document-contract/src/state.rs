use anchor_lang::prelude::*;

/// State account for form approvals
#[account]
pub struct FormApproval {
    /// Unique identifier for the form
    pub form_id: String,
    
    /// SHA-256 hash of the form submission data
    pub form_hash: [u8; 32],
    
    /// Public key of the admin who approved the form
    pub signer: Pubkey,
    
    /// Timestamp when the form was approved on-chain
    pub approved_at: i64,
    
    /// Optional metadata for additional information
    pub metadata: String,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl FormApproval {
    /// Calculate the space required for the account
    pub const fn space(form_id_len: usize, metadata_len: usize) -> usize {
        8 + // discriminator
        4 + form_id_len + // form_id (String)
        32 + // form_hash ([u8; 32])
        32 + // signer (Pubkey)
        8 + // approved_at (i64)
        4 + metadata_len + // metadata (String)
        1 // bump (u8)
    }
}

/// State account for admin configuration
#[account]
pub struct AdminConfig {
    /// List of authorized admin public keys (fixed size array)
    pub admins: [Pubkey; 10],
    
    /// Number of active admins
    pub admin_count: u8,
    
    /// Authority who can add/remove admins
    pub authority: Pubkey,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl AdminConfig {
    /// Calculate the space required for the account
    pub const fn space() -> usize {
        8 + // discriminator
        (32 * 10) + // admins ([Pubkey; 10])
        1 + // admin_count (u8)
        32 + // authority (Pubkey)
        1 // bump (u8)
    }
    
    /// Check if a public key is an authorized admin
    pub fn is_admin(&self, pubkey: &Pubkey) -> bool {
        for i in 0..self.admin_count as usize {
            if self.admins[i] == *pubkey {
                return true;
            }
        }
        false
    }
    
    /// Add a new admin if not already present
    pub fn add_admin(&mut self, admin: Pubkey) -> Result<()> {
        if self.is_admin(&admin) {
            return Err(crate::config::FormApprovalError::AdminAlreadyExists.into());
        }
        
        if self.admin_count >= crate::config::Config::MAX_ADMINS as u8 {
            return Err(crate::config::FormApprovalError::MaxAdminsReached.into());
        }
        
        self.admins[self.admin_count as usize] = admin;
        self.admin_count += 1;
        Ok(())
    }
    
    /// Remove an admin if present
    pub fn remove_admin(&mut self, admin: &Pubkey) -> Result<()> {
        if self.admin_count <= 1 {
            return Err(crate::config::FormApprovalError::CannotRemoveLastAdmin.into());
        }
        
        // Find the admin to remove
        let mut found_index = None;
        for i in 0..self.admin_count as usize {
            if self.admins[i] == *admin {
                found_index = Some(i);
                break;
            }
        }
        
        let index = found_index.ok_or(crate::config::FormApprovalError::AdminNotFound)?;
        
        // Move the last admin to the removed position
        if index < (self.admin_count - 1) as usize {
            self.admins[index] = self.admins[(self.admin_count - 1) as usize];
        }
        
        // Clear the last position and decrement count
        self.admins[(self.admin_count - 1) as usize] = Pubkey::default();
        self.admin_count -= 1;
        
        Ok(())
    }
}

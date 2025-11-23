use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};

declare_id!("A2qBxbgjy8X9GsGbtdCCkYd1nHXV8q2rx6ygit2gi35k");

#[program]
pub mod pda_vault {
    use super::*;

    pub fn initialize_vault(context: Context<InitializeVault>) -> Result<()> {
        let vault_account = &context.accounts.vault_token_account;
        let mint = &context.accounts.mint;
        let token_program = &context.accounts.token_program;
        let rent = &context.accounts.rent;

        let cpi_accounts = anchor_spl::token::InitializeAccount {
            account: vault_account.clone(),
            mint: mint.clone(),
            authority: vault_account.clone(),
            rent: rent.to_account_info(),
        };
        let cpi_program = token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        anchor_spl::token::initialize_account(cpi_ctx)?;

        msg!("Vault account successfully initialized at : {}", vault_account.key());
        Ok(())
    }
    pub fn deposit(context: Context<UseVault>, amount: u64) -> Result<()> {
        let signer = &context.accounts.signer;
        let signer_token_account = &context.accounts.signer_token_account;
        let vault_token_account = &context.accounts.vault_token_account;
        let token_program = &context.accounts.token_program;

        // Transfer from signer to vault (signer authorizes)
        let cpi_accounts = Transfer {
            from: signer_token_account.clone(),
            to: vault_token_account.clone(),
            authority: signer.to_account_info(),
        };
        let cpi_program = token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        msg!("Successfully deposited {} tokens in the vault", amount);
        Ok(())
    }
    pub fn withdraw(context: Context<UseVault>, amount: u64) -> Result<()> {
        let vault_token_account = &context.accounts.vault_token_account;
        let signer_token_account = &context.accounts.signer_token_account;
        let token_program = &context.accounts.token_program;
        let vault_bump = context.bumps.vault_token_account;

        // Transfer from vault to signer - vault PDA must authorize this
        let seeds = &[b"vault".as_ref(), &[vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: vault_token_account.clone(),
            to: signer_token_account.clone(),
            authority: vault_token_account.clone(),
        };
        let cpi_program = token_program.to_account_info();
        token::transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            amount,
        )?;

        msg!("Successfully Withdrew {} tokens from the vault", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: mint is not deserialized by the program.
    pub mint: AccountInfo<'info>,

    #[account(
        init,
        seeds = [b"vault".as_ref()],
        bump,
        payer = signer,
        owner = token_program.key(),
        space = 165,
    )]
    /// CHECK: Raw SPL token account data for the vault.
    pub vault_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UseVault<'info> {
    pub signer: Signer<'info>,
    /// CHECK: mint is not deserialized here.
    pub mint: AccountInfo<'info>,

    /// CHECK: The signer's SPL token account. We don't deserialize it here;
    #[account(mut)]
    pub signer_token_account: AccountInfo<'info>,

    /// CHECK: PDA vault token account (SPL TokenAccount). It's a PDA-owned
    #[account(mut, seeds = [b"vault".as_ref()], bump)]
    pub vault_token_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}
use anchor_lang::prelude::*;
// use anchor_spl::token::{self, TokenAccount, Transfer};
use std::convert::Into;

#[program]
mod trusted_properties {
	use super::*;

	/* ==========================================================================
								Instructions
	===========================================================================*/

	pub fn initialize_rent_contract(
		ctx: Context<InitializeRentContract>,
		security_deposit: u64,
		rent_amount: u64,
		duration: u8,
		start_month: u8,
		start_year: u16,
	) -> ProgramResult {

		let rent_data = &mut ctx.accounts.rent_agreement_account;

		if rent_amount == 0 {
			msg!("[TrustedProperties] ERROR: Incorrect rent amount ({})", rent_amount);
			return Err(ErrorCode::InvalidInstructionParameter.into());
		}

		if duration == 0 || duration > 60 {
			msg!("[TrustedProperties] ERROR: Incorrect agreement duration in months ({})", duration);
			return Err(ErrorCode::InvalidInstructionParameter.into());
		}

		rent_data.status = AgreementStatus::DepositPending as u8;
		rent_data.owner_pubkey = *ctx.accounts.owner.key;
		rent_data.tenant_pubkey = *ctx.accounts.tenant.key;
		rent_data.security_deposit = security_deposit;
		rent_data.rent_amount = rent_amount;
		rent_data.duration = duration;
		rent_data.start_month = start_month;
		rent_data.start_year = start_year;
		rent_data.remaining_payments = duration;
		rent_data.remaining_security_deposit = 0;
		rent_data.duration_extension_request = 0;

		Ok(())
	}


	pub fn deposit_security(
		ctx: Context<DepositSecurity>,
		security_deposit_amount: u64
	) -> ProgramResult {

		let rent_data = &mut ctx.accounts.rent_agreement_account;

		// msg!("SECURITY DEPOSIT::: {}", security_deposit_amount);

		if !rent_data.is_security_deposit_pending() {
			msg!("[TrustedProperties] ERROR: Security already deposited");
			return Err(ErrorCode::SecurityAlreadyDeposited.into());
		}

		rent_data.remaining_security_deposit = security_deposit_amount;
		rent_data.status = AgreementStatus::Active as u8;

		Ok(())
	}
}



/* ==========================================================================
							Accounts for Instructions
===========================================================================*/

#[derive(Accounts)]
pub struct InitializeRentContract<'info> {
	#[account(zero)]	// (init, payer = owner, space = 1 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 2 + 1 + 8)]		// (zero)
	pub rent_agreement_account: ProgramAccount<'info, RentAgreementAccount>,
	pub owner: AccountInfo<'info>,
	pub tenant: AccountInfo<'info>,
	pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DepositSecurity<'info> {
	#[account(mut)]
	pub rent_agreement_account: ProgramAccount<'info, RentAgreementAccount>,
	pub tenant: AccountInfo<'info>,
}



/* ==========================================================================
							Account States (Data)
===========================================================================*/

#[account]
pub struct RentAgreementAccount {

	/// Agreement status (active, complete, terminated, etc)
	pub status: u8,

	/// Property owner account's public-key
	pub owner_pubkey: Pubkey,

	/// Tenant account's public-key
	pub tenant_pubkey: Pubkey,

	/// Security-deposit escrow account's public-key
	// pub security_escrow_pubkey: Pubkey,

	/// Minimum security deposit (in Lamports) to be made by the tenant before the contract begins
	pub security_deposit: u64,

	/// Rent amount per month (in Lamports)
	pub rent_amount: u64,

	/// Duration of the agreement (in months)
	pub duration: u8,

	/// Count of monthly payments due
	pub remaining_payments: u8,

	/// Count of monthly payments due
	pub remaining_security_deposit: u64,

	/// Contract start month (1-12)
	pub start_month: u8,

	/// Contract start year (eg: 2021)
	pub start_year: u16,

	/// Duration (in months) for contract extension requested by Tenant
	pub duration_extension_request: u8
}

impl RentAgreementAccount {

	/// Is initial security_deposit pending by the tenant?
	pub fn is_security_deposit_pending(&self) -> bool {
		self.status == AgreementStatus::DepositPending as u8
	}

	/// Is the rent-agreement complete (i.e, all payments done for the agreed duration)?
	pub fn is_completed(&self) -> bool {
		self.status == AgreementStatus::Completed as u8
	}

	/// Is the rent-agreement terminated?
	pub fn is_terminated(&self) -> bool {
		self.status == AgreementStatus::Terminated as u8
	}
}


#[derive(Copy, Clone)]
pub enum AgreementStatus {
	Uninitialized = 0,
	DepositPending,
	Active,
	Completed,
	Terminated,
}


/* ==========================================================================
							Error Types
===========================================================================*/
#[error]
pub enum ErrorCode {
	#[msg("Invalid Instruction")]
	InvalidInstruction,

	#[msg("Incorrect Payment Amount")]
	IncorrectPaymentAmount,

	#[msg("Full Rent Already Paid")]
	RentAlreadyFullyPaid,

	#[msg("Security Amount Already Deposited")]
	SecurityAlreadyDeposited,

	#[msg("Rent Agreement Already Terminated")]
	RentAgreementTerminated,

	#[msg("Invalid Agreement Status")]
	InvalidAgreementStatus,

	#[msg("Invalid Instruction Parameter")]
	InvalidInstructionParameter,
}


const assert = require("assert");
const anchor = require("@project-serum/anchor");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;


describe("trusted-properties", () => {

	// Use a local provider.
	const provider = anchor.Provider.local();

	// Configure the client to use the local cluster.
	anchor.setProvider(provider);

	let _rentAgreementAccount;

	// const ownerPubkey = new PublicKey("EJBCNzigNdKMiCueXNaYn3CccMJqmB8DLPZKgfeTWQrh");
	// const tenantPubkey = new PublicKey("EGikG1URSBTi3Dc2AHwTV4HBDWu1KmbcD63rTbYWv9Cu");


	it("Creates and initializes a RentAgreementAccount", async () => {
		// The program to execute.
		const program = anchor.workspace.TrustedProperties;

		// The Account to create.
		const rentAgreementAccount = anchor.web3.Keypair.generate();

		// Atomically create the new account and initialize it with the program.
		// #region code-simplified
		const tx_init = await program.rpc.initializeRentContract(
			new anchor.BN(1000),		// Security deposit
			new anchor.BN(500),			// Rent amount
			new anchor.BN(2),			// duration
			new anchor.BN(10),			// start_month
			new anchor.BN(2021),		// start_year
			{
				accounts: {
					rentAgreementAccount: rentAgreementAccount.publicKey,
					rent: anchor.web3.SYSVAR_RENT_PUBKEY,
					owner: provider.wallet.publicKey,
					tenant: provider.wallet.publicKey,
					systemProgram: SystemProgram.programId,
				},
				signers: [rentAgreementAccount],
				instructions: [await program.account.rentAgreementAccount.createInstruction(rentAgreementAccount)],
			}
		);
		// #endregion code-simplified

		// Fetch the newly created account from the cluster.
		const account = await program.account.rentAgreementAccount.fetch(rentAgreementAccount.publicKey);

		// console.log(">>>> ACC: ", account);

		// Check it's state was initialized.
		assert.ok(account.securityDeposit.eq(new anchor.BN(1000)));
		assert.ok(account.duration == 2);
		assert.ok(account.remainingPayments == 2);

		let agreementBalance = (
			await program.provider.connection.getAccountInfo(rentAgreementAccount.publicKey)
		).lamports;

		// Store the account for the next test.
		_rentAgreementAccount = rentAgreementAccount;

		console.log("⭐ Account Created: ", {
			account: account,
			pubKey: _rentAgreementAccount.publicKey,
			agreementBalance: agreementBalance,
		});
	});


	it("Pays security-deposit to a previously created RentAgreementAccount", async () => {

		const rentAgreementAccount = _rentAgreementAccount;

		// #region update-test

		// The program to execute.
		const program = anchor.workspace.TrustedProperties;

		let payerBeforeBalance = (
			await program.provider.connection.getAccountInfo(provider.wallet.publicKey)
		).lamports;

		console.log("⭐ Before Transfer:: ", {
			rentAgreementAccount: rentAgreementAccount.publicKey,
			tenant: provider.wallet.publicKey,						// TODO: Change to tenant
			// tenantAuthority: provider.wallet.publicKey,			// TODO: Change to tenant (?)
			tokenProgram: TOKEN_PROGRAM_ID,
			payerBeforeBalance: payerBeforeBalance,
		});

		// Invoke the update rpc.
		try {
			await program.rpc.depositSecurity(new anchor.BN(1000), {
				accounts: {
					rentAgreementAccount: rentAgreementAccount.publicKey,
					tenant: provider.wallet.publicKey,						// TODO: Change to tenant
					// tenantAuthority: provider.wallet.publicKey,			// TODO: Change to tenant (?)
					tokenProgram: SystemProgram.programId,	// TOKEN_PROGRAM_ID,
				},
				signers: [provider.wallet.publicKey],						// TODO: Change to tenant
			});
		} catch (err) {
			console.error("[ERROR] depositSecurity: ", err);
		}

		// Fetch the newly updated account.
		const account = await program.account.rentAgreementAccount.fetch(rentAgreementAccount.publicKey);

		// console.log(">>>>>>>>>>>>>>> ACC: ", account);

		// Check it's state was mutated.
		assert.ok(new anchor.BN(account.status).eq(new anchor.BN(2)));

		let agreementBalance = (
			await program.provider.connection.getAccountInfo(rentAgreementAccount.publicKey)
		).lamports;
		let payerAfterBalance = (
			await program.provider.connection.getAccountInfo(provider.wallet.publicKey)
		).lamports;


		console.log("⭐ Account Updated (security deposit): ", {
			account: account,
			dep: account?.securityDeposit?.toString(),
			dep_remaining: account?.remainingSecurityDeposit?.toString(),
			pubKey: _rentAgreementAccount.publicKey,
			agreementBalance: agreementBalance,
			payerBeforeBalance: payerBeforeBalance,
			payerAfterBalance: payerAfterBalance,
		});

		// #endregion update-test
	});
});

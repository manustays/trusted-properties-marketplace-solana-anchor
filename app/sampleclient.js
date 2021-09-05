const anchor = require("@project-serum/anchor");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

// client.js is used to introduce the reader to generating clients from IDLs.
// It is not expected users directly test with this example. For a more
// ergonomic example, see `tests/trusted-properties.js` in this workspace.


// Use a local cluster as provider.
const provider = anchor.Provider.local();

// Configure the client to use the local cluster.
anchor.setProvider(provider);

const program = anchor.workspace.TrustedProperties;
let account;
let agreementBalance, payerBeforeBalance, payerAfterBalance;



async function main() {
	// // #region main
	// // Read the generated IDL.
	// const idl = JSON.parse(require('fs').readFileSync('./target/idl/basic_1.json', 'utf8'));

	// // Address of the deployed program.
	// const programId = new anchor.web3.PublicKey('Bi9UBv8iQ4LLhTqXGLvwpSZiwZ62ZxMmCaEBXtnSisPd');

	// // Generate the program client from IDL.
	// const program = new anchor.Program(idl, programId);

	// // Execute the RPC.
	// await program.rpc.initialize();
	// // #endregion main



	// ============== CREATE CONTRACT =====================================

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
	account = await program.account.rentAgreementAccount.fetch(rentAgreementAccount.publicKey);

	// console.log(">>>> ACC: ", account);

	agreementBalance = (
		await program.provider.connection.getAccountInfo(rentAgreementAccount.publicKey)
	).lamports;

	console.log("⭐ Account Created: ", {
		account: account,
		pubKey: rentAgreementAccount.publicKey,
		agreementBalance: agreementBalance,
	});


	// ============== DEPOSIT SECURITY =====================================

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
	account = await program.account.rentAgreementAccount.fetch(rentAgreementAccount.publicKey);

	// console.log(">>>>>>>>>>>>>>> ACC: ", account);

	agreementBalance = (
		await program.provider.connection.getAccountInfo(rentAgreementAccount.publicKey)
	).lamports;
	payerAfterBalance = (
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

}

console.log('Running client.');
main().then(() => console.log('Success'));

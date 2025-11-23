import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PdaVault } from "../target/types/pda_vault";
import { getAccount, createMint, createAccount, mintTo } from "@solana/spl-token";

describe("pda-vault", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.pdaVault as Program<PdaVault>;
  const connection = provider.connection;

  const DECIMALS = 6;
  const INITIAL_SUPPLY = 1_000_000 * Math.pow(10, DECIMALS); // 1M tokens
  const DEPOSIT_AMOUNT = 100; // 100 tokens
  const WITHDRAW_AMOUNT = 50; // 50 tokens

  let mint: anchor.web3.PublicKey;
  let signerTokenAccount: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    const payer = provider.publicKey;
    const payerKeypair = (provider.wallet as any).payer;

    console.log("\n=== Setting up test environment ===");

    // Create mint
    mint = await createMint(connection, payerKeypair, payer, payer, DECIMALS);
    console.log("Created mint:", mint.toString());

    // Create signer token account
    signerTokenAccount = await createAccount(connection, payerKeypair, mint, payer);
    console.log("Created signer token account:", signerTokenAccount.toString());

    // Mint tokens to signer
    await mintTo(connection, payerKeypair, mint, signerTokenAccount, payerKeypair, INITIAL_SUPPLY);
    console.log("Minted", INITIAL_SUPPLY / Math.pow(10, DECIMALS), "tokens");

    // Derive vault PDA
    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    vaultTokenAccount = vaultPDA;
    console.log("Vault PDA:", vaultTokenAccount.toString());
  });

  it("Initialize vault", async () => {
    const payer = provider.publicKey;
    console.log("\n=== Initialize Vault ===");

    // Check if vault already exists and is properly initialized
    const vaultAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
    
    if (vaultAccountInfo && vaultAccountInfo.data.length === 165) {
      console.log("✓ Vault already initialized, verifying...");
      try {
        const vaultData = await getAccount(connection, vaultTokenAccount);
        console.log("✓ Vault is properly initialized as token account");
        return;
      } catch (e) {
        console.log("Vault exists but is not initialized, reinitializing...");
      }
    }

    const tx = await (program.methods
      .initializeVault() as any)
      .accounts({
        signer: payer,
        mint: mint,
        vaultTokenAccount: vaultTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Initialize Tx:", tx);

    // Verify vault account was created and initialized
    const vaultData = await getAccount(connection, vaultTokenAccount);
    console.log("✓ Vault initialized - mint:", vaultData.mint.toString());
    console.log("✓ Vault initialized - authority:", vaultData.owner.toString());
  });

  it("Deposit tokens", async () => {
    const payer = provider.publicKey;
    console.log("\n=== Deposit Tokens ===");

    // Check balance before
    const accountBefore = await getAccount(connection, signerTokenAccount);
    console.log("Balance before deposit:", accountBefore.amount.toString());

    const tx = await (program.methods
      .deposit(new anchor.BN(DEPOSIT_AMOUNT)) as any)
      .accounts({
        signer: payer,
        mint: mint,
        signerTokenAccount: signerTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Deposit Tx:", tx);

    // Check balance after
    const accountAfter = await getAccount(connection, signerTokenAccount);
    console.log("Balance after deposit:", accountAfter.amount.toString());

    const vaultAccount = await getAccount(connection, vaultTokenAccount);
    console.log("Vault balance:", vaultAccount.amount.toString());
    console.log("✓ Deposited", DEPOSIT_AMOUNT, "tokens");
  });

  it("Withdraw tokens", async () => {
    const payer = provider.publicKey;
    console.log("\n=== Withdraw Tokens ===");

    // Check balance before
    const accountBefore = await getAccount(connection, signerTokenAccount);
    console.log("Balance before withdraw:", accountBefore.amount.toString());

    const vaultBefore = await getAccount(connection, vaultTokenAccount);
    console.log("Vault balance before withdraw:", vaultBefore.amount.toString());

    const tx = await (program.methods
      .withdraw(new anchor.BN(WITHDRAW_AMOUNT)) as any)
      .accounts({
        signer: payer,
        mint: mint,
        signerTokenAccount: signerTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Withdraw Tx:", tx);

    // Check balance after
    const accountAfter = await getAccount(connection, signerTokenAccount);
    console.log("Balance after withdraw:", accountAfter.amount.toString());

    const vaultAfter = await getAccount(connection, vaultTokenAccount);
    console.log("Vault balance after withdraw:", vaultAfter.amount.toString());
    console.log("✓ Withdrew", WITHDRAW_AMOUNT, "tokens");
  });
});

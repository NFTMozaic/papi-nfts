import { extractEvent } from "./utils/event";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";

describe("Collection Start and End Blocks", () => {
  test(`Mint not started`, async ({ api, signers }) => {
    const { alice: owner, charlie, dave } = signers;
    const currentBlock = await api.query.System.Number.getValue();

    // Create collection with specific settings
    const createCollectionTx = await api.tx.Nfts.create({
      admin: MultiAddress.Id(owner.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: { type: "Public", value: undefined },
          price: undefined,
          start_block: currentBlock + 10,
          end_block: currentBlock + 100,
        },
        settings: 0n,
      },
    }).signAndSubmit(owner);

    const nftsCreatedEvent = extractEvent(
      createCollectionTx,
      "Nfts",
      "Created"
    );

    const collectionId = nftsCreatedEvent.collection as number;

    // 2. Non-issuer cannot mint because the current block is before the start block
    const mintNonIssuerTx = await api.tx.Nfts.mint({
      collection: collectionId,
      item: 1,
      mint_to: MultiAddress.Id(charlie.address),
      witness_data: undefined,
    }).signAndSubmit(charlie);

    expect(mintNonIssuerTx.ok).toBe(false);
    expect((mintNonIssuerTx.dispatchError?.value as any).value.type).toBe(
      "MintNotStarted"
    );
  });

  test(`Mint finished`, async ({ api, signers }) => {
    const { alice: owner, charlie } = signers;
    const currentBlock = await api.query.System.Number.getValue();

    // Create collection with specific settings
    const createCollectionTx = await api.tx.Nfts.create({
      admin: MultiAddress.Id(owner.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: { type: "Public", value: undefined },
          price: undefined,
          start_block: currentBlock - 100,
          end_block: currentBlock - 1,
        },
        settings: 0n,
      },
    }).signAndSubmit(owner);

    const nftsCreatedEvent = extractEvent(
      createCollectionTx,
      "Nfts",
      "Created"
    );

    const collectionId = nftsCreatedEvent.collection as number;

    // 2. Non-issuer cannot mint because the current block is after the end block
    const mintNonIssuerTx = await api.tx.Nfts.mint({
      collection: collectionId,
      item: 1,
      mint_to: MultiAddress.Id(charlie.address),
      witness_data: undefined,
    }).signAndSubmit(charlie);

    expect(mintNonIssuerTx.ok).toBe(false);
    expect((mintNonIssuerTx.dispatchError?.value as any).value.type).toBe(
      "MintEnded"
    );
  });
});

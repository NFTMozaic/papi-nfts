import { extractEvent } from "./utils/event";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";

describe("Collection Mint Type", () => {
  test(`Issuer`, async ({ api, signers }) => {
    const { alice: owner, bob: issuer, charlie } = signers;

    // Create collection with specific settings
    const createCollectionTx = await api.tx.Nfts.create({
      admin: MultiAddress.Id(owner.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: { type: "Issuer", value: undefined },
          price: undefined,
          start_block: undefined,
          end_block: undefined,
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

    // 1. Owner can mint
    const mintTx = await api.tx.Nfts.mint({
      collection: collectionId,
      item: 0,
      mint_to: MultiAddress.Id(issuer.address),
      witness_data: undefined
    }).signAndSubmit(owner);

    expect(mintTx.ok).toBe(true);

    // 2. Non-issuer cannot mint
    const mintNonIssuerTx = await api.tx.Nfts.mint({
      collection: collectionId,
      item: 1,
      mint_to: MultiAddress.Id(charlie.address),
      witness_data: undefined
    }).signAndSubmit(charlie);

    expect(mintNonIssuerTx.ok).toBe(false);
  });

  test(`Public`, async ({ api, signers }) => {
    const { alice: owner, bob: issuer, charlie, dave } = signers;

    // Create collection with specific settings
    const createCollectionTx = await api.tx.Nfts.create({
      admin: MultiAddress.Id(owner.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: { type: "Public", value: undefined },
          price: undefined,
          start_block: undefined,
          end_block: undefined,
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

    // 1. Issuer can mint
    const mintTx = await api.tx.Nfts.mint({
      collection: collectionId,
      item: 0,
      mint_to: MultiAddress.Id(issuer.address),
      witness_data: undefined
    }).signAndSubmit(issuer);

    expect(mintTx.ok).toBe(true);

    // 2. Non-issuer can mint too
    const mintNonIssuerTx = await api.tx.Nfts.mint({
      collection: collectionId,
      item: 1,
      mint_to: MultiAddress.Id(charlie.address),
      witness_data: undefined
    }).signAndSubmit(charlie);

    expect(mintNonIssuerTx.ok).toBe(true);
  });

  test(`HolderOf`, async ({ api, signers }) => {
    const { alice, charlie, dave } = signers;

    // Create collection with specific settings
    const createCollectionTx = await api.tx.Nfts.create({
      admin: MultiAddress.Id(alice.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: { type: "Issuer", value: undefined },
          price: undefined,
          start_block: undefined,
          end_block: undefined,
        },
        settings: 0n,
      },
    }).signAndSubmit(alice);

    const nftsCreatedEvent = extractEvent(
      createCollectionTx,
      "Nfts",
      "Created"
    );

    const firstCollectionId = nftsCreatedEvent.collection as number;

    // 1. Owner mints a token to charlie
    const mintTx = await api.tx.Nfts.mint({
      collection: firstCollectionId,
      item: 0,
      mint_to: MultiAddress.Id(charlie.address),
      witness_data: undefined
    }).signAndSubmit(alice);

    expect(mintTx.ok).toBe(true);

    // Create HolderOf collection
    const createHolderOfCollectionTx = await api.tx.Nfts.create({
      admin: MultiAddress.Id(alice.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: { type: "HolderOf", value: firstCollectionId },
          price: undefined,
          start_block: undefined,
          end_block: undefined,
        },
        settings: 0n,
      },
    }).signAndSubmit(alice);

    const secondCollectionId = extractEvent(
      createHolderOfCollectionTx,
      "Nfts",
      "Created"
    ).collection as number;

    // 1. Charlie can mint because she is a holder of the first collection NFT
    const charlieMintTx = await api.tx.Nfts.mint({
      collection: secondCollectionId,
      item: 0,
      mint_to: MultiAddress.Id(charlie.address),
      witness_data: {owned_item: 0} // Charlie should provide witness of the first collection NFT
    }).signAndSubmit(charlie);

    expect(charlieMintTx.ok).toBe(true);

    // 2. Dave cannot mint because he is not a holder of the first collection NFT
    // cannot mint without providing witness data
    const daveMintTx = await api.tx.Nfts.mint({
      collection: secondCollectionId,
      item: 1,
      mint_to: MultiAddress.Id(dave.address),
      witness_data: undefined
    }).signAndSubmit(dave);

    expect(daveMintTx.ok).toBe(false);
    expect((daveMintTx.dispatchError?.value as any).value.type).toBe("WitnessRequired");
    
    // cannot mint with wrong witness data
    const daveMintTx2 = await api.tx.Nfts.mint({
      collection: secondCollectionId,
      item: 1,
      mint_to: MultiAddress.Id(dave.address),
      witness_data: {owned_item: 0}
    }).signAndSubmit(dave);
    
    expect(daveMintTx2.ok).toBe(false);
    expect((daveMintTx2.dispatchError?.value as any).value.type).toBe("BadWitness");
  });
});

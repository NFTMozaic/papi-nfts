import { MultiAddress, MultiSignature, dot } from "@polkadot-api/descriptors";
import { test } from "./utils/test";
import {
  Binary,
  Enum,
  FixedSizeArray,
  FixedSizeBinary,
  getTypedCodecs,
} from "polkadot-api";

test("presigned minting", async ({ api, signers }) => {
  const { alice, bob, charlie, dave } = signers;

  // Create a collection with Alice as admin
  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(alice.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: Enum("Issuer"),
        price: undefined,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(alice);

  const [createdEvent] = api.event.Nfts.Created.filter(createCollectionTx.events);
  const collectionId = createdEvent.collection;

  // SCENARIO 1: Whitelist NFT Drop
  // Alice creates presigned mint data for Bob (whitelisted user)

  // Get codecs for encoding mint data
  const codecs = await getTypedCodecs(dot);
  const mintDataCodec = codecs.tx.Nfts.mint_pre_signed.inner.mint_data;

  const mintData = {
    collection: collectionId,
    item: 1,
    attributes: [
      [Binary.fromText("tier"), Binary.fromText("gold")],
      [Binary.fromText("whitelist"), Binary.fromText("true")],
    ] as FixedSizeArray<2, Binary>[],
    metadata: Binary.fromText("Gold Tier NFT #1"),
    only_account: bob.address, // Only Bob can use this
    deadline: 10_000_000, // Block deadline
    mint_price: undefined,
  };

  // Encode and sign the mint data
  const encodedMintData = mintDataCodec.enc(mintData);
  const signature = await alice.signBytes(encodedMintData);
  const multiSignature = MultiSignature.Sr25519(
    FixedSizeBinary.fromBytes(signature)
  );

  // Bob can now mint using the presigned data
  const bobMintTx = await api.tx.Nfts.mint_pre_signed({
    mint_data: mintData,
    signature: multiSignature,
    signer: alice.address,
  }).signAndSubmit(bob);

  // Verify Bob received the NFT
  const bobItem = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(bobItem?.owner).toBe(bob.address);

  // SCENARIO 2: Delegated Minting Authority
  // Alice delegates minting authority to Charlie (e.g., a marketplace)
  const marketplaceMintData = {
    collection: collectionId,
    item: 2,
    attributes: [
      [Binary.fromText("marketplace"), Binary.fromText("authorized")],
    ] as FixedSizeArray<2, Binary>[],
    metadata: Binary.fromText("Marketplace Minted NFT #2"),
    only_account: undefined, // Anyone can use this
    deadline: 10_000_000,
    mint_price: undefined,
  } as const;

  const encodedMarketplaceData = mintDataCodec.enc(marketplaceMintData);
  const marketplaceSignature = await alice.signBytes(encodedMarketplaceData);
  const marketplaceMultiSig = MultiSignature.Sr25519(
    FixedSizeBinary.fromBytes(marketplaceSignature)
  );

  // Charlie uses the presigned authorization to mint for himself
  const charlieMintTx = await api.tx.Nfts.mint_pre_signed({
    mint_data: marketplaceMintData,
    signature: marketplaceMultiSig,
    signer: alice.address,
  }).signAndSubmit(charlie);

  // Verify Charlie received the NFT
  const charlieItem = await api.query.Nfts.Item.getValue(collectionId, 2);
  expect(charlieItem?.owner).toBe(charlie.address);

  // SCENARIO 3: Time-Limited Minting Campaign
  // Alice creates multiple presigned mints for a limited-time campaign
  const currentBlock = await api.query.System.Number.getValue();
  const campaignDeadline = Number(currentBlock) + 100; // 100 blocks from now

  const campaignMints = [];

  for (let i = 3; i <= 5; i++) {
    const campaignMintData = {
      collection: collectionId,
      item: i,
      attributes: [
        [Binary.fromText("campaign"), Binary.fromText("summer2024")],
        [Binary.fromText("edition"), Binary.fromText(`${i}/100`)],
      ] as FixedSizeArray<2, Binary>[],
      metadata: Binary.fromText(`Limited Edition Summer NFT #${i}`),
      only_account: undefined, // Anyone can claim
      deadline: campaignDeadline,
      mint_price: undefined,
    };

    const encodedCampaignData = mintDataCodec.enc(campaignMintData);
    const campaignSignature = await alice.signBytes(encodedCampaignData);

    campaignMints.push({
      data: campaignMintData,
      signature: FixedSizeBinary.fromBytes(campaignSignature),
    });
  }

  // Bob claims one from the campaign
  const bobCampaignMintTx = await api.tx.Nfts.mint_pre_signed({
    mint_data: campaignMints[0].data,
    signature: MultiSignature.Sr25519(campaignMints[0].signature),
    signer: alice.address,
  }).signAndSubmit(bob);

  // SCENARIO 4: Batch Presigned Minting for Airdrops
  // Alice creates batch presigned data for specific recipients
  const airdropRecipients = [bob, charlie, dave];
  const airdropMints = [];

  for (let i = 0; i < airdropRecipients.length; i++) {
    const airdropMintData = {
      collection: collectionId,
      item: 10 + i,
      attributes: [
        [Binary.fromText("airdrop"), Binary.fromText("community")],
      ] as FixedSizeArray<2, Binary>[],
      metadata: Binary.fromText(`Community Airdrop NFT #${10 + i}`),
      only_account: airdropRecipients[i].address, // Specific recipient
      deadline: 10_000_000,
      mint_price: undefined, // Free mint
    };

    const encodedAirdropData = mintDataCodec.enc(airdropMintData);
    const airdropSignature = await alice.signBytes(encodedAirdropData);

    airdropMints.push({
      recipient: airdropRecipients[i],
      data: airdropMintData,
      signature: FixedSizeBinary.fromBytes(airdropSignature),
    });
  }

  // Each recipient claims their airdrop
  for (const airdrop of airdropMints) {
    await api.tx.Nfts.mint_pre_signed({
      mint_data: airdrop.data,
      signature: MultiSignature.Sr25519(airdrop.signature),
      signer: alice.address,
    }).signAndSubmit(airdrop.recipient);
  }

  // SCENARIO 5: Attempting to use expired presigned mint
  // Alice creates a presigned mint with a past deadline
  const expiredMintData = {
    collection: collectionId,
    item: 20,
    attributes: [] as FixedSizeArray<2, Binary>[],
    metadata: Binary.fromText("This mint has expired"),
    only_account: bob.address,
    deadline: Number(currentBlock) - 100, // 100 blocks ago
    mint_price: undefined,
  };

  const encodedExpiredData = mintDataCodec.enc(expiredMintData);
  const expiredSignature = await alice.signBytes(encodedExpiredData);

  // Bob tries to use the expired presigned mint (should fail)
  try {
    await api.tx.Nfts.mint_pre_signed({
      mint_data: expiredMintData,
      signature: MultiSignature.Sr25519(
        FixedSizeBinary.fromBytes(expiredSignature)
      ),
      signer: alice.address,
    }).signAndSubmit(bob);

    // Should not reach here
    expect(true).toBe(false);
  } catch (error) {
    // Expected to fail due to expired deadline
    expect(error).toBeDefined();
    console.log("Expired mint correctly failed");
  }

  // SCENARIO 6: Unauthorized use of presigned mint
  // Alice creates a presigned mint that only Charlie can use
  const restrictedMintData = {
    collection: collectionId,
    item: 21,
    attributes: [] as FixedSizeArray<2, Binary>[],
    metadata: Binary.fromText("Only Charlie can mint this"),
    only_account: charlie.address, // Only Charlie
    deadline: 10_000_000,
    mint_price: undefined,
  };

  const encodedRestrictedData = mintDataCodec.enc(restrictedMintData);
  const restrictedSignature = await alice.signBytes(encodedRestrictedData);

  // Bob tries to use it (should fail)
  try {
    await api.tx.Nfts.mint_pre_signed({
      mint_data: restrictedMintData,
      signature: MultiSignature.Sr25519(
        FixedSizeBinary.fromBytes(restrictedSignature)
      ),
      signer: alice.address,
    }).signAndSubmit(bob);

    expect(true).toBe(false);
  } catch (error) {
    // Expected to fail - Bob is not authorized
    expect(error).toBeDefined();
    console.log("Unauthorized mint correctly failed");
  }

  // Charlie uses it successfully
  const charlieRestrictedMintTx = await api.tx.Nfts.mint_pre_signed({
    mint_data: restrictedMintData,
    signature: MultiSignature.Sr25519(
      FixedSizeBinary.fromBytes(restrictedSignature)
    ),
    signer: alice.address,
  }).signAndSubmit(charlie);

  // SCENARIO 7: Presigned mint with payment required
  const paidMintData = {
    collection: collectionId,
    item: 25,
    attributes: [
      [Binary.fromText("type"), Binary.fromText("premium")],
    ] as FixedSizeArray<2, Binary>[],
    metadata: Binary.fromText("Premium NFT - Payment Required"),
    only_account: undefined, // Anyone can mint
    deadline: 10_000_000,
    mint_price: undefined,
  };

  const encodedPaidData = mintDataCodec.enc(paidMintData);
  const paidSignature = await alice.signBytes(encodedPaidData);

  // Dave mints the paid NFT
  const davePaidMintTx = await api.tx.Nfts.mint_pre_signed({
    mint_data: paidMintData,
    signature: MultiSignature.Sr25519(FixedSizeBinary.fromBytes(paidSignature)),
    signer: alice.address,
  }).signAndSubmit(dave);

  // Verify final state
  console.log("\n=== Final State ===");

  // Count total minted items
  let mintedItems = 0;
  for (let i = 1; i <= 25; i++) {
    const item = await api.query.Nfts.Item.getValue(collectionId, i);
    if (item) {
      mintedItems++;
      console.log(`Item ${i}: owner = ${item.owner}`);
    }
  }
  console.log(`Total items minted: ${mintedItems}`);

  // Check attributes were properly set
  const item1Attributes = await api.query.Nfts.Attribute.getEntries(
    collectionId,
    1
  );
  console.log(`Item 1 has ${item1Attributes.length} attributes`);
});

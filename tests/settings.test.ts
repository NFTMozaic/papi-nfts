import { Binary } from "polkadot-api";
import { extractEvent } from "./utils/event";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";

describe("Collection Settings", () => {
  testCases.forEach(({ name, settings, expectedBehavior }) => {
    test(`Collection settings: ${name}`, async ({ api, signers }) => {
      const { alice } = signers;

      // Create collection with specific settings
      const createCollectionTx = await api.tx.Nfts.create({
        admin: MultiAddress.Id(alice.address),
        config: {
          max_supply: 1000,
          mint_settings: {
            default_item_settings: 0n,
            mint_type: { type: "Issuer", value: undefined },
            price: 10n,
            start_block: undefined,
            end_block: undefined,
          },
          settings: settings,
        },
      }).signAndSubmit(alice);

      const nftsCreatedEvent = extractEvent(
        createCollectionTx,
        "Nfts",
        "Created"
      );

      const collectionId = nftsCreatedEvent.collection as number;

      // 1. Test max supply change capability
      const setMaxSupplyTx = await api.tx.Nfts.set_collection_max_supply({
        max_supply: 500,
        collection: collectionId,
      }).signAndSubmit(alice);

      expect(setMaxSupplyTx.ok).toBe(expectedBehavior.canChangeMaxSupply);

      // 2. Test metadata change capability
      const changeMetadataTx = await api.tx.Nfts.set_collection_metadata({
        collection: collectionId,
        data: Binary.fromText("new metadata"),
      }).signAndSubmit(alice);

      expect(changeMetadataTx.ok).toBe(expectedBehavior.canChangeMetadata);

      // 3. Test attributes change capability
      const changeAttributeTx = await api.tx.Nfts.set_attribute({
        collection: collectionId,
        maybe_item: undefined,
        namespace: { type: "CollectionOwner", value: undefined },
        key: Binary.fromText("new_attr"),
        value: Binary.fromText("new_value"),
      }).signAndSubmit(alice);

      expect(changeAttributeTx.ok).toBe(expectedBehavior.canChangeAttributes);

      // 4. Test item transferrability by minting and attempting transfer
      const mintTx = await api.tx.Nfts.mint({
        collection: collectionId,
        item: 1,
        mint_to: MultiAddress.Id(alice.address),
        witness_data: { owned_item: undefined, mint_price: 10n },
      }).signAndSubmit(alice); // Admin mints

      expect(mintTx.ok).toBe(true);

      const transferTx = await api.tx.Nfts.transfer({
        collection: collectionId,
        item: 1,
        dest: MultiAddress.Id(alice.address),
      }).signAndSubmit(alice);

      expect(transferTx.ok).toBe(expectedBehavior.itemsTransferrable);

      console.log(`✓ ${name}: ${expectedBehavior.description}`);
    });
  });
});

const testCases = [
  {
    name: "0: All settings unlocked (default)",
    settings: 0n, // 0000 - No bits set
    expectedBehavior: {
      canChangeMaxSupply: true,
      canChangeMetadata: true,
      canChangeAttributes: true,
      itemsTransferrable: true,
      description: "All capabilities should be available",
    },
  },
  {
    name: "1: Items non-transferrable only",
    settings: 1n, // 0001 - Transferrable bit set
    expectedBehavior: {
      canChangeMaxSupply: true,
      canChangeMetadata: true,
      canChangeAttributes: true,
      itemsTransferrable: false,
      description: "Items should be soul-bound (non-transferrable)",
    },
  },
  {
    name: "2: Metadata locked only",
    settings: 2n, // 0010 - UnlockedMetadata bit set
    expectedBehavior: {
      canChangeMaxSupply: true,
      canChangeMetadata: false,
      canChangeAttributes: true,
      itemsTransferrable: true,
      description: "Only metadata should be locked",
    },
  },
  {
    name: "3: Metadata locked + Items non-transferrable",
    settings: 3n, // 0011 - UnlockedMetadata + Transferrable bits set
    expectedBehavior: {
      canChangeMaxSupply: true,
      canChangeMetadata: false,
      canChangeAttributes: true,
      itemsTransferrable: false,
      description: "Metadata locked and items soul-bound",
    },
  },
  {
    name: "4: Attributes locked only",
    settings: 4n, // 0100 - UnlockedAttributes bit set
    expectedBehavior: {
      canChangeMaxSupply: true,
      canChangeMetadata: true,
      canChangeAttributes: false,
      itemsTransferrable: true,
      description: "Only attributes should be locked",
    },
  },
  {
    name: "5: Attributes locked + Items non-transferrable",
    settings: 5n, // 0101 - UnlockedAttributes + Transferrable bits set
    expectedBehavior: {
      canChangeMaxSupply: true,
      canChangeMetadata: true,
      canChangeAttributes: false,
      itemsTransferrable: false,
      description: "Attributes locked and items soul-bound",
    },
  },
  {
    name: "6: Metadata and Attributes locked",
    settings: 6n, // 0110 - UnlockedMetadata + UnlockedAttributes bits set
    expectedBehavior: {
      canChangeMaxSupply: true,
      canChangeMetadata: false,
      canChangeAttributes: false,
      itemsTransferrable: true,
      description: "Metadata and attributes locked",
    },
  },
  {
    name: "7: Metadata and Attributes locked + Items non-transferrable",
    settings: 7n, // 0111 - UnlockedMetadata + UnlockedAttributes + Transferrable bits set
    expectedBehavior: {
      canChangeMaxSupply: true,
      canChangeMetadata: false,
      canChangeAttributes: false,
      itemsTransferrable: false,
      description: "Metadata and attributes locked, items soul-bound",
    },
  },
  {
    name: "8: Max supply locked only",
    settings: 8n, // 1000 - UnlockedMaxSupply bit set
    expectedBehavior: {
      canChangeMaxSupply: false,
      canChangeMetadata: true,
      canChangeAttributes: true,
      itemsTransferrable: true,
      description: "Only max supply should be locked",
    },
  },
  {
    name: "9: Max supply locked + Items non-transferrable",
    settings: 9n, // 1001 - UnlockedMaxSupply + Transferrable bits set
    expectedBehavior: {
      canChangeMaxSupply: false,
      canChangeMetadata: true,
      canChangeAttributes: true,
      itemsTransferrable: false,
      description: "Max supply locked and items soul-bound",
    },
  },
  {
    name: "10: Max supply and Metadata locked",
    settings: 10n, // 1010 - UnlockedMaxSupply + UnlockedMetadata bits set
    expectedBehavior: {
      canChangeMaxSupply: false,
      canChangeMetadata: false,
      canChangeAttributes: true,
      itemsTransferrable: true,
      description: "Max supply and metadata locked",
    },
  },
  {
    name: "11: Max supply and Metadata locked + Items non-transferrable",
    settings: 11n, // 1011 - UnlockedMaxSupply + UnlockedMetadata + Transferrable bits set
    expectedBehavior: {
      canChangeMaxSupply: false,
      canChangeMetadata: false,
      canChangeAttributes: true,
      itemsTransferrable: false,
      description: "Max supply and metadata locked, items soul-bound",
    },
  },
  {
    name: "12: Max supply and Attributes locked",
    settings: 12n, // 1100 - UnlockedMaxSupply + UnlockedAttributes bits set
    expectedBehavior: {
      canChangeMaxSupply: false,
      canChangeMetadata: true,
      canChangeAttributes: false,
      itemsTransferrable: true,
      description: "Max supply and attributes locked",
    },
  },
  {
    name: "13: Max supply and Attributes locked + Items non-transferrable",
    settings: 13n, // 1101 - UnlockedMaxSupply + UnlockedAttributes + Transferrable bits set
    expectedBehavior: {
      canChangeMaxSupply: false,
      canChangeMetadata: true,
      canChangeAttributes: false,
      itemsTransferrable: false,
      description: "Max supply and attributes locked, items soul-bound",
    },
  },
  {
    name: "14: All settings locked except transferrable",
    settings: 14n, // 1110 - UnlockedMaxSupply + UnlockedMetadata + UnlockedAttributes bits set
    expectedBehavior: {
      canChangeMaxSupply: false,
      canChangeMetadata: false,
      canChangeAttributes: false,
      itemsTransferrable: true,
      description: "Everything locked except items remain transferrable",
    },
  },
  {
    name: "15: All settings locked (fully restricted)",
    settings: 15n, // 1111 - All bits set
    expectedBehavior: {
      canChangeMaxSupply: false,
      canChangeMetadata: false,
      canChangeAttributes: false,
      itemsTransferrable: false,
      description: "Everything locked and items soul-bound",
    },
  },
];

import { test } from "./utils/test";
import { dot, MultiAddress, MultiSignature } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";
import { Binary, FixedSizeArray, FixedSizeBinary, getTypedCodecs } from "polkadot-api";

test("Item (NFT) attributes presigned", async ({ api, signers }) => {
  const { alice, bob } = signers;
  const codec = await getTypedCodecs(dot);
  const attributeDataCodec = codec.tx.Nfts.set_attributes_pre_signed.inner.data;

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

  // nfts.Created event is emitted when the collection is created
  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  // collection id can be extracted from the event
  const collectionId = nftsCreatedEvent.collection as number;

  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  expect(createItemTx.ok).toBe(true);

  // Alice as Admin presigns attributes for the item off-chain
  const data = {
    collection: collectionId,
    item: 1,
    deadline: 10_000_000,
    namespace: {type: "CollectionOwner", value: undefined},
    attributes: [
      [Binary.fromText("Experience"), Binary.fromText("300")],
      [Binary.fromText("Power"), Binary.fromText("200")],
    ] as FixedSizeArray<2, Binary>[],
  } as const;

  const encoded = attributeDataCodec.enc(data);
  const signature = await alice.signBytes(encoded);

  // Bob can now set the attributes using the presigned data
  const setAttributesPresignedTx = await api.tx.Nfts.set_attributes_pre_signed({
    data,
    signature: MultiSignature.Sr25519(FixedSizeBinary.fromBytes(signature)),
    signer: alice.address,
  }).signAndSubmit(bob);

  expect(setAttributesPresignedTx.ok).toBe(true);
});

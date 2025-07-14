import { sr25519CreateDerive, withNetworkAccount } from "@polkadot-labs/hdkd";
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { getPolkadotSigner, PolkadotSigner } from "polkadot-api/signer";

export interface PolkadotSignerWithAddress extends PolkadotSigner {
  address: string;
}

export const getSignerFromMnemonic = (mnemonic: string): PolkadotSignerWithAddress => {
  const entropy = mnemonicToEntropy(DEV_PHRASE);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  const hdkdKeyPair = withNetworkAccount(derive(mnemonic), 0);

  const s = getPolkadotSigner(
    hdkdKeyPair.publicKey,
    "Sr25519",
    hdkdKeyPair.sign,
  );

  return {...s, address: hdkdKeyPair.ss58Address};
};

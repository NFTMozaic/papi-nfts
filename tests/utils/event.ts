import { TxFinalizedPayload } from "polkadot-api";

export const extractEvent = (
  transaction: TxFinalizedPayload,
  section: string,
  name: string
) => {
  const event = transaction.events.find(
    (e) => e.type === section && e.value.type === name
  );
  if (!event) {
    throw new Error(`Event ${name} not found in transaction`);
  }
  return event.value.value;
};

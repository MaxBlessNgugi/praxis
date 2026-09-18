import { useCallback } from 'react';
import { buildGivingReceipt, printDocument, proseDate } from '../lib/documents';
import { useAuth } from '../lib/auth';
import { useChurchIdentity } from './useChurchIdentity';
import type { OfferingDto, TitheDto } from '../lib/api';

/**
 * A giver's receipt, printed from a transaction that already exists.
 *
 * The number is the ledger's own transaction code rather than a counter kept by this screen, so a
 * second copy of a receipt carries the same number and no receipt can claim a gift the books do not
 * hold. Printing reads the record and writes nothing.
 */
export function useGivingReceipt() {
  const { church } = useChurchIdentity();
  const { user } = useAuth();
  const generatedBy = user?.name ?? 'the church office';

  const printTithe = useCallback(
    (tithe: TitheDto) =>
      printDocument(
        buildGivingReceipt({
          church,
          generatedBy,
          receipt: {
            number: tithe.txCode,
            issuedOn: tithe.receivedAt,
            receivedFrom: tithe.donorName,
            kind: 'Tithe',
            designation: tithe.category,
            amount: tithe.amount,
            method: tithe.method,
            reference: tithe.reference,
            envelopeNo: tithe.envelopeNo,
            receivedBy: tithe.recordedBy?.name ?? null,
          },
        }),
      ),
    [church, generatedBy],
  );

  const printOffering = useCallback(
    (offering: OfferingDto) =>
      printDocument(
        buildGivingReceipt({
          church,
          generatedBy,
          receipt: {
            number: offering.txCode,
            issuedOn: offering.receivedAt,
            receivedFrom: offering.category,
            kind: 'Offering',
            designation: offering.notes,
            amount: offering.amount,
            method: offering.method,
            reference: offering.reference,
            collectedAt: offering.service
              ? `${offering.service.title} · ${proseDate(offering.service.heldAt)}`
              : null,
            receivedBy: offering.recordedBy?.name ?? null,
          },
        }),
      ),
    [church, generatedBy],
  );

  return { printTithe, printOffering };
}

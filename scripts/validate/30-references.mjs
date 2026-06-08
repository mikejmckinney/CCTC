import { createReferenceVerificationContext, verifyItemReferences } from '../lib/verify-references.mjs';
import { isPlainObject } from './lib.mjs';

export async function validateReferencesForItems(allItems, { allowMissingIndex = false, referenceWarnings = [] } = {}) {
  const errors = [];
  const context = await createReferenceVerificationContext({ allowMissingIndex, referenceWarnings });

  for (const entry of allItems) {
    if (!isPlainObject(entry.item)) {
      continue;
    }
    await verifyItemReferences(entry.item, entry.location, context, errors);
  }

  return { errors, context };
}

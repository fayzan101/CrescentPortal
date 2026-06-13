export const ITEM_FIELD_LIMITS = {
  itemName: { min: 2, max: 256 },
  sku: { min: 3, max: 64 },
  ssnSidn: { max: 128 },
  description: { max: 512 },
  reorderLevel: { max: 999999 },
  amount: { max: 999999999.99 },
};

export const ALLOWED_UOM_VALUES = [
  'PCS',
  'KG',
  'G',
  'LTR',
  'ML',
  'BOX',
  'PKG',
  'MTR',
  'SQM',
  'TON',
  'DOZEN',
  'EACH',
];

/** Example payload that passes all Add New Item validations */
export const EXAMPLE_VALID_ITEM = {
  itemName: 'Motorbike Mini Tracker - Unit',
  sku: 'IMEI-860123456789013',
  categoryId: '1',
  subCategoryId: '1',
  groupId: '1',
  uom: 'PCS',
  ssnSidn: 'SSN-PK-MT-0001 / SIDN-0001',
  reorderLevel: '10',
  expiryDate: '2027-12-31',
  amount: '2800.00',
  taxAmount: '504.00',
  totalAmount: '3304.00',
  description: '4G GPS tracker for motorcycles.',
  isActive: true,
};

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-_]{2,63}$/;

function parseAmount(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalId(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidDateString(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isTodayOrFutureDate(value) {
  if (!isValidDateString(value)) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= today;
}

function hasValidDecimalPlaces(value, maxPlaces = 2) {
  const raw = String(value ?? '').trim();
  if (!raw) return true;
  const parts = raw.replace(/[^0-9.]/g, '').split('.');
  return !parts[1] || parts[1].length <= maxPlaces;
}

/**
 * Validates inventory item form data.
 * @returns {{ valid: boolean, errors: string[], fieldErrors: Record<string, string> }}
 */
export function validateInventoryItemForm(data, options = {}) {
  const {
    requirePricing = true,
    requireExpiry = true,
    allowedUoms = ALLOWED_UOM_VALUES,
  } = options;

  const fieldErrors = {};
  const addError = (field, message) => {
    if (!fieldErrors[field]) fieldErrors[field] = message;
  };

  const itemName = String(data.itemName ?? '').replace(/\s+/g, ' ').trim();
  if (!itemName) {
    addError('itemName', 'Item name is required.');
  } else if (itemName.length < ITEM_FIELD_LIMITS.itemName.min) {
    addError('itemName', `Item name must be at least ${ITEM_FIELD_LIMITS.itemName.min} characters.`);
  } else if (itemName.length > ITEM_FIELD_LIMITS.itemName.max) {
    addError('itemName', `Item name must be at most ${ITEM_FIELD_LIMITS.itemName.max} characters.`);
  }

  const sku = String(data.sku ?? '').toUpperCase().replace(/[^A-Z0-9-_]/g, '');
  if (!sku) {
    addError('sku', 'SKU / IMEI is required.');
  } else if (sku.length < ITEM_FIELD_LIMITS.sku.min || sku.length > ITEM_FIELD_LIMITS.sku.max) {
    addError('sku', `SKU / IMEI must be ${ITEM_FIELD_LIMITS.sku.min}-${ITEM_FIELD_LIMITS.sku.max} characters.`);
  } else if (!SKU_PATTERN.test(sku)) {
    addError('sku', 'SKU / IMEI may only use letters, numbers, dash, or underscore.');
  }

  if (!parseOptionalId(data.categoryId)) {
    addError('categoryId', 'Category is required.');
  }

  if (!parseOptionalId(data.groupId)) {
    addError('groupId', 'Item group is required.');
  }

  const subCategoryId = parseOptionalId(data.subCategoryId);
  if (data.subCategoryId && !subCategoryId) {
    addError('subCategoryId', 'Subcategory must be a valid selection.');
  }

  const uom = String(data.uom ?? '').trim().toUpperCase();
  if (!uom) {
    addError('uom', 'UOM is required.');
  } else if (!allowedUoms.includes(uom)) {
    addError('uom', 'UOM must be selected from the list.');
  }

  if (requireExpiry) {
    if (!data.expiryDate) {
      addError('expiryDate', 'Item expiry date is required.');
    } else if (!isValidDateString(data.expiryDate)) {
      addError('expiryDate', 'Item expiry must be a valid date.');
    } else if (!isTodayOrFutureDate(data.expiryDate)) {
      addError('expiryDate', 'Item expiry must be today or a future date.');
    }
  } else if (data.expiryDate && !isValidDateString(data.expiryDate)) {
    addError('expiryDate', 'Item expiry must be a valid date.');
  }

  if (data.reorderLevel === '' || data.reorderLevel === null || data.reorderLevel === undefined) {
    addError('reorderLevel', 'Reorder level is required.');
  } else {
    const reorderLevel = Number(data.reorderLevel);
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
      addError('reorderLevel', 'Reorder level must be a whole number of 0 or greater.');
    } else if (reorderLevel > ITEM_FIELD_LIMITS.reorderLevel.max) {
      addError('reorderLevel', `Reorder level must be at most ${ITEM_FIELD_LIMITS.reorderLevel.max}.`);
    }
  }

  if (requirePricing) {
    const amount = parseAmount(data.amount);
    if (data.amount === '' || data.amount === null || data.amount === undefined) {
      addError('amount', 'Amount is required.');
    } else if (amount === null) {
      addError('amount', 'Amount must be a valid number.');
    } else if (amount < 0) {
      addError('amount', 'Amount cannot be negative.');
    } else if (amount > ITEM_FIELD_LIMITS.amount.max) {
      addError('amount', `Amount must be at most ${ITEM_FIELD_LIMITS.amount.max.toFixed(2)}.`);
    } else if (!hasValidDecimalPlaces(data.amount)) {
      addError('amount', 'Amount may have at most 2 decimal places.');
    }

    const taxAmount = parseAmount(data.taxAmount);
    if (data.taxAmount === '' || data.taxAmount === null || data.taxAmount === undefined) {
      addError('taxAmount', 'Tax amount is required.');
    } else if (taxAmount === null) {
      addError('taxAmount', 'Tax amount must be a valid number.');
    } else if (taxAmount < 0) {
      addError('taxAmount', 'Tax amount cannot be negative.');
    } else if (taxAmount > ITEM_FIELD_LIMITS.amount.max) {
      addError('taxAmount', `Tax amount must be at most ${ITEM_FIELD_LIMITS.amount.max.toFixed(2)}.`);
    } else if (!hasValidDecimalPlaces(data.taxAmount)) {
      addError('taxAmount', 'Tax amount may have at most 2 decimal places.');
    }

    if (amount !== null && taxAmount !== null && amount >= 0 && taxAmount >= 0) {
      const expectedTotal = Number((amount + taxAmount).toFixed(2));
      const providedTotal = parseAmount(data.totalAmount);
      if (providedTotal !== null && Math.abs(providedTotal - expectedTotal) > 0.009) {
        addError('totalAmount', 'Total amount must equal amount plus tax amount.');
      }
    }
  }

  const ssnSidn = String(data.ssnSidn ?? '').trim();
  if (ssnSidn.length > ITEM_FIELD_LIMITS.ssnSidn.max) {
    addError('ssnSidn', `SSN/SIDN must be at most ${ITEM_FIELD_LIMITS.ssnSidn.max} characters.`);
  }

  const description = String(data.description ?? '').trim();
  if (description.length > ITEM_FIELD_LIMITS.description.max) {
    addError('description', `Description must be at most ${ITEM_FIELD_LIMITS.description.max} characters.`);
  }

  const errors = Object.values(fieldErrors);
  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

export function formatInventoryItemValidationErrors(fieldErrors) {
  const labels = {
    itemName: 'Item Name',
    sku: 'SKU / IMEI',
    categoryId: 'Category',
    subCategoryId: 'Subcategory',
    groupId: 'Item Group',
    uom: 'UOM',
    expiryDate: 'Item Expiry',
    reorderLevel: 'Reorder Level',
    amount: 'Amount',
    taxAmount: 'Tax Amount',
    totalAmount: 'Total Amount',
    ssnSidn: 'SSN/SIDN',
    description: 'Description',
  };

  return Object.entries(fieldErrors).map(([field, message]) => {
    const label = labels[field] || field;
    return message.includes(label) ? message : `${label}: ${message}`;
  });
}

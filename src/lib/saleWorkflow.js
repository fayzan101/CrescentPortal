export const STAGE_FORM_MAP = {
  SALES: 'addSale',
  ACCOUNTS: 'accountsApproval',
  OPERATIONS: 'operationsProcess',
  TECHNICIAN: 'installation',
};

export const FORM_STAGE_MAP = {
  addSale: 'SALES',
  accountsApproval: 'ACCOUNTS',
  operationsProcess: 'OPERATIONS',
  installation: 'TECHNICIAN',
};

export function getStageStatusMap(sale) {
  const map = {};
  (sale?.stageStatuses || []).forEach((entry) => {
    map[entry.stageCode] = entry.status;
  });
  return map;
}

export function resolveActiveFormForSale(sale) {
  const sm = getStageStatusMap(sale);
  if (['PENDING', 'IN_PROGRESS'].includes(sm.SALES)) return 'addSale';
  if (['IN_PROGRESS', 'HELD', 'PENDING'].includes(sm.ACCOUNTS)) return 'accountsApproval';
  if (['IN_PROGRESS', 'PENDING'].includes(sm.OPERATIONS)) return 'operationsProcess';
  if (['IN_PROGRESS', 'PENDING', 'COMPLETED'].includes(sm.TECHNICIAN)) return 'installation';
  return 'addSale';
}

export function isFormAccessible(formKey, sale) {
  if (!sale) return formKey === 'addSale';

  const sm = getStageStatusMap(sale);
  switch (formKey) {
    case 'addSale':
      return ['PENDING', 'IN_PROGRESS'].includes(sm.SALES);
    case 'accountsApproval':
      return sm.SALES === 'COMPLETED' && ['IN_PROGRESS', 'HELD', 'PENDING'].includes(sm.ACCOUNTS);
    case 'operationsProcess':
      return sm.ACCOUNTS === 'COMPLETED' && ['IN_PROGRESS', 'PENDING'].includes(sm.OPERATIONS);
    case 'installation':
      return sm.OPERATIONS === 'COMPLETED' && ['IN_PROGRESS', 'PENDING', 'COMPLETED'].includes(sm.TECHNICIAN);
    default:
      return false;
  }
}

export function formatStageLabel(stageCode, status) {
  if (!stageCode || !status) return '';
  return `${stageCode}: ${status}`;
}

export function saleStageSummary(sale) {
  return (sale?.stageStatuses || [])
    .map((entry) => formatStageLabel(entry.stageCode, entry.status))
    .join(' · ');
}

export function formatDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

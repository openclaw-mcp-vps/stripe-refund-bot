export function getRefundPolicyDays(): number {
  const parsed = Number.parseInt(process.env.REFUND_POLICY_DAYS ?? "30", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 30;
  }
  return parsed;
}

export function isWithinRefundPolicy(purchasedAt: Date, policyDays: number): boolean {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - policyDays);
  return purchasedAt >= cutoff;
}

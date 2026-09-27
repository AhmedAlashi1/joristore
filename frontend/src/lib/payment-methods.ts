export type PaymentMethodConfig = {
  id: string;
  enabled: boolean;
  label_ar: string;
  label_en: string;
  instructions_ar: string;
  instructions_en: string;
  requires_receipt: boolean;
  qr_image?: string | null;
};

export function paymentMethodLabel(method: PaymentMethodConfig, ar: boolean): string {
  return ar ? method.label_ar : method.label_en;
}

export function paymentMethodInstructions(method: PaymentMethodConfig, ar: boolean): string {
  return ar ? method.instructions_ar : method.instructions_en;
}

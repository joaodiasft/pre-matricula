import { EnrollmentStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

export const EnrollmentStatusCopy: Record<EnrollmentStatus, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Enviada",
  UNDER_REVIEW: "Em análise",
  WAITING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Confirmada",
  WAITLISTED: "Lista de espera",
  REJECTED: "Recusada",
};

export const PaymentMethodCopy: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CARD: "Cartão",
  BOLETO: "Boleto",
  PRESENTIAL: "Pagamento presencial",
};

export const PaymentStatusCopy: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
};

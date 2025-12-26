import {
  REGISTRATION_DISCOUNT_DEADLINE_DAY,
  REGISTRATION_FEE,
  REGISTRATION_FEE_DISCOUNT_PERCENTAGE,
} from "@/lib/constants";

export function registrationDiscountActive(today = new Date()) {
  return today.getDate() <= REGISTRATION_DISCOUNT_DEADLINE_DAY;
}

export function computeRegistrationFee(today = new Date()) {
  const discount = registrationDiscountActive(today);
  const value = discount
    ? REGISTRATION_FEE * REGISTRATION_FEE_DISCOUNT_PERCENTAGE
    : REGISTRATION_FEE;
  return {
    value,
    hasDiscount: discount,
  };
}

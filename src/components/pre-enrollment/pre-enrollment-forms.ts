import { z } from "zod";
import { basicInfoSchema } from "@/lib/validators/enrollment";

export const formSchema = basicInfoSchema;
export type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

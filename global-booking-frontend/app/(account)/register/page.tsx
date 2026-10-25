import { pageMetadata } from "@/lib/utils/metadata";
import { LuxuryRegisterForm } from "./register-form";

export const metadata = pageMetadata(
  "Register Practice",
  "Register your healthcare practice, doctor portfolio, or hospital facility on Global Booking."
);

export default function RegisterPage() {
  return <LuxuryRegisterForm />;
}

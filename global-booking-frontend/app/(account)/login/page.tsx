import { pageMetadata } from "@/lib/utils/metadata";
import { LuxuryLoginForm } from "./login-form";

export const metadata = pageMetadata(
    "Sign In",
    "Sign in to access your Global Booking healthcare practice portal."
);

export default function LoginPage() {
    return <LuxuryLoginForm />;
}

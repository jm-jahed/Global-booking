import { pageMetadata } from "@/lib/utils/metadata";
import { LuxuryLoginForm } from "./login-form";

export const metadata = pageMetadata(
    "Sign In",
    "Sign in to access your luxury Global Booking executive portal."
);

export default function LoginPage() {
    return <LuxuryLoginForm />;
}

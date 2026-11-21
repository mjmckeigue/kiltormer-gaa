import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return <AuthShell title="Request coach access"><AuthForm mode="signup" /></AuthShell>;
}

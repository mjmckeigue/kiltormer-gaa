import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return <AuthShell title="Reset your password"><AuthForm mode="forgot" /></AuthShell>;
}

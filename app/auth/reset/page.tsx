import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return <AuthShell title="Choose a new password"><AuthForm mode="reset" /></AuthShell>;
}

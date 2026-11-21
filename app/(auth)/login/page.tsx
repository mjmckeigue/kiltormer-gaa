import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return <AuthShell title="Coaches' log in"><AuthForm mode="login" /></AuthShell>;
}

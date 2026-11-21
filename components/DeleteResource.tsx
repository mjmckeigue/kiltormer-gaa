"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteResource({ id, path }: { id: string; path: string | null }) {
  const router = useRouter();
  async function del() {
    if (!confirm("Delete this resource for everyone?")) return;
    const supabase = createClient();
    if (path) await supabase.storage.from("resources").remove([path]);
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) return alert(error.message);
    router.push("/hub"); router.refresh();
  }
  return <button onClick={del} className="btn-danger">Delete</button>;
}

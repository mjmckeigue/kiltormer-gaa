import Image from "next/image";

export default function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-club to-club-dark p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-col items-center text-center">
          <Image src="/crest.png" alt="Cill Tormóir crest" width={72} height={90} priority />
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-gold">Kiltormer GAA</p>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

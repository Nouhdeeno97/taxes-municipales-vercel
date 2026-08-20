import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, KeyRound, Landmark, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const branding = trpc.municipal.branding.useQuery(undefined, { staleTime: 60_000 });
  const brand = branding.data;
  const login = trpc.auth.localLogin.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/");
    },
  });

  useEffect(() => { if (!loading && user) setLocation("/"); }, [loading, user, setLocation]);

  return <main className="relative min-h-screen overflow-hidden bg-[#071d43] px-5 py-8 sm:grid sm:place-items-center">
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(96,165,250,.42),transparent_34%),radial-gradient(circle_at_92%_88%,rgba(14,165,233,.26),transparent_31%)]" />
    <section className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/15 bg-white/95 shadow-2xl md:grid-cols-[.92fr,1.08fr]">
      <div className="hidden p-10 text-white md:flex md:flex-col" style={{ background: `linear-gradient(135deg, ${brand?.primaryColor ?? "#0b3b86"}, #0b5bd3 56%, #5da5ff)` }}><div className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/30">{brand?.logoUrl ? <img src={brand.logoUrl} alt="Logo municipal" className="size-full object-contain p-1" /> : <Landmark className="size-7" />}</div><p className="mt-12 text-xs font-bold uppercase tracking-[.2em] text-blue-100">{brand?.name ?? "Mairie"}</p><h1 className="mt-3 text-4xl font-bold leading-tight">Toutes les taxes municipales, dans un seul outil.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-blue-50">{brand?.platformName ?? "Gestion des taxes municipales"} permet de configurer les taxes actuelles et futures, puis de suivre les redevables, obligations, encaissements, reçus, versements et contrôles.</p><div className="mt-auto space-y-3 pt-12 text-sm"><p className="flex items-center gap-3"><ShieldCheck className="size-5 text-cyan-100" />Accès contrôlé par rôle et permission</p><p className="flex items-center gap-3"><Building2 className="size-5 text-cyan-100" />Taxes configurables sans refaire la plateforme</p></div></div>
      <div className="p-6 sm:p-10"><div className="md:hidden"><div className="grid size-12 place-items-center overflow-hidden rounded-xl text-white" style={{ backgroundColor: brand?.primaryColor ?? "#0f5cdb" }}>{brand?.logoUrl ? <img src={brand.logoUrl} alt="Logo municipal" className="size-full object-contain p-1" /> : <Landmark className="size-6" />}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-blue-700">{brand?.platformName ?? "Plateforme municipale"}</p></div><Card className="border-0 bg-transparent shadow-none"><CardHeader className="px-0"><CardTitle className="text-3xl tracking-tight text-slate-950">Connexion municipale</CardTitle><CardDescription className="pt-2 text-sm leading-6 text-slate-600">Utilisez l’identifiant et le mot de passe remis par l’administration de votre mairie.</CardDescription></CardHeader><CardContent className="px-0"><form className="space-y-5" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); login.mutate({ localUsername: String(data.get("localUsername")), password: String(data.get("password")) }); }}><div className="space-y-2"><Label htmlFor="local-username">Identifiant</Label><Input id="local-username" name="localUsername" autoComplete="username" placeholder="Ex. agent.municipal" required disabled={login.isPending} /></div><div className="space-y-2"><Label htmlFor="local-password">Mot de passe</Label><Input id="local-password" name="password" type="password" autoComplete="current-password" required disabled={login.isPending} /></div>{login.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">{login.error.message}</p>}<Button type="submit" disabled={login.isPending} className="h-11 w-full bg-blue-700 hover:bg-blue-800"><KeyRound className="mr-2 size-4" />{login.isPending ? "Vérification…" : "Se connecter"}</Button></form><div className="my-7 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou<span className="h-px flex-1 bg-slate-200" /></div><Button type="button" variant="outline" onClick={() => startLogin()} className="h-10 w-full border-blue-200 text-blue-800 hover:bg-blue-50">Se connecter avec Manus</Button><p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Votre session municipale dure au maximum 12 heures. Si votre compte est désactivé, archivé ou que son mot de passe est réinitialisé, l’accès est automatiquement coupé.</p></CardContent></Card></div>
    </section>
  </main>;
}

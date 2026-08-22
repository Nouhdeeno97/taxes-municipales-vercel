import { useEffect, useState } from "react";
import { Building2, CheckCircle2, ImageUp, Monitor, Moon, Palette, Save, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type AppearanceMode = "LIGHT" | "DARK" | "SYSTEM";

const modes: Array<{ value: AppearanceMode; title: string; detail: string; Icon: typeof Sun }> = [
  { value: "LIGHT", title: "Mode clair", detail: "Interface lumineuse et contrastée pour les opérations de journée.", Icon: Sun },
  { value: "DARK", title: "Mode sombre", detail: "Réduit l’éblouissement dans les salles peu éclairées.", Icon: Moon },
  { value: "SYSTEM", title: "Selon l’appareil", detail: "Suit le réglage clair ou sombre du poste de travail.", Icon: Monitor },
];

function applyPreview(primaryColor: string, appearanceMode: AppearanceMode) {
  const root = document.documentElement;
  root.style.setProperty("--municipality-primary", primaryColor);
  root.style.setProperty("--municipality-primary-soft", `${primaryColor}18`);
  const dark = appearanceMode === "DARK" || (appearanceMode === "SYSTEM" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export default function PlatformSettingsPage() {
  const utils = trpc.useUtils();
  const settings = trpc.municipal.platformSettings.get.useQuery();
  const [name, setName] = useState(""); const [platformName, setPlatformName] = useState(""); const [primaryColor, setPrimaryColor] = useState("#0F5CDB"); const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>("LIGHT");
  const update = trpc.municipal.platformSettings.update.useMutation({
    onSuccess: () => { toast.success("Paramètres de la plateforme enregistrés."); utils.municipal.platformSettings.get.invalidate(); utils.municipal.activeMunicipality.invalidate(); utils.municipal.branding.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const uploadLogo = trpc.municipal.platformSettings.uploadLogo.useMutation({
    onSuccess: () => { toast.success("Logo municipal mis à jour."); utils.municipal.platformSettings.get.invalidate(); utils.municipal.activeMunicipality.invalidate(); utils.municipal.branding.invalidate(); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!settings.data) return;
    setName(settings.data.name); setPlatformName(settings.data.platformName); setPrimaryColor(settings.data.primaryColor); setAppearanceMode(settings.data.appearanceMode);
  }, [settings.data]);
  useEffect(() => { applyPreview(primaryColor, appearanceMode); }, [primaryColor, appearanceMode]);

  const upload = (file?: File) => {
    if (!file) return;
    if (!/image\/(png|jpeg|webp)/.test(file.type)) { toast.error("Choisissez un logo PNG, JPEG ou WebP."); return; }
    if (file.size > 1_000_000) { toast.error("Le logo doit peser au maximum 1 Mo."); return; }
    const reader = new FileReader();
    reader.onload = () => uploadLogo.mutate({ dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  if (settings.isLoading) return <div className="space-y-5"><Skeleton className="h-28 w-full" /><Skeleton className="h-72 w-full" /></div>;
  if (settings.error) return <Card className="border-red-200"><CardHeader><CardTitle>Paramétrage réservé</CardTitle><CardDescription>{settings.error.message}</CardDescription></CardHeader><CardContent><Button type="button" variant="outline" onClick={() => settings.refetch()}>Réessayer le chargement</Button></CardContent></Card>;

  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-3xl border border-blue-200 bg-[linear-gradient(130deg,#0b3b86,#0f5cdb_55%,#5da5ff)] px-6 py-7 text-white shadow-[0_18px_42px_rgba(15,92,219,.22)] md:px-8">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-100">Administration de la plateforme</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Personnalisez l’identité de votre mairie</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">Ces réglages apparaissent sur la connexion, dans la navigation et dans les écrans de travail. Ils permettent de déployer la même plateforme pour toute taxe municipale, sous l’identité de votre mairie.</p>
    </section>

    <div className="grid gap-6 lg:grid-cols-[1.35fr,.9fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-blue-700" />Identité institutionnelle</CardTitle><CardDescription>Indiquez ce que les agents et les redevables doivent reconnaître immédiatement.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="grid gap-2"><Label htmlFor="municipality-name">Nom de la mairie</Label><Input id="municipality-name" value={name} onChange={event => setName(event.target.value)} placeholder="Ex. Mairie de Libreville" /></div>
        <div className="grid gap-2"><Label htmlFor="platform-name">Nom de la plateforme</Label><Input id="platform-name" value={platformName} onChange={event => setPlatformName(event.target.value)} placeholder="Ex. Gestion des taxes municipales" /><p className="text-xs text-slate-500">Conseil : privilégiez un nom large, car la plateforme couvre les taxes actuelles et futures de la mairie.</p></div>
        <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-4"><div className="flex flex-wrap items-center gap-4"><div className="grid size-16 place-items-center overflow-hidden rounded-2xl border border-blue-200 bg-white">{settings.data?.logoUrl ? <img src={settings.data.logoUrl} alt="Logo municipal" className="size-full object-contain p-1" /> : <Building2 className="size-7 text-blue-700" />}</div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-950">Logo de la mairie</p><p className="mt-1 text-xs leading-5 text-slate-600">PNG, JPEG ou WebP, 1 Mo maximum. Le logo est stocké de façon sécurisée et apparaît dans l’identité de la plateforme.</p></div><Button type="button" variant="outline" disabled={uploadLogo.isPending} onClick={() => document.getElementById("municipality-logo")?.click()}><ImageUp className="mr-2 size-4" />{uploadLogo.isPending ? "Import…" : "Choisir un logo"}</Button><input id="municipality-logo" className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => upload(event.target.files?.[0])} /></div></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Palette className="size-5 text-blue-700" />Couleur principale</CardTitle><CardDescription>Utilisée sur les éléments d’identité et les actions importantes.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-3"><input aria-label="Sélecteur de couleur principale" type="color" value={primaryColor} onChange={event => setPrimaryColor(event.target.value.toUpperCase())} className="size-12 cursor-pointer rounded-xl border border-blue-200 bg-white p-1" /><Input value={primaryColor} onChange={event => setPrimaryColor(event.target.value.toUpperCase())} maxLength={7} className="font-mono uppercase" /></div><div className="rounded-xl p-4 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>Aperçu de la couleur municipale</div><p className="text-xs leading-5 text-slate-500">Utilisez un bleu, vert ou autre ton suffisamment foncé pour conserver une bonne lisibilité sur fond blanc.</p></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Mode d’affichage</CardTitle><CardDescription>Choisissez le contraste général appliqué à tous les agents de cette mairie.</CardDescription></CardHeader><CardContent><RadioGroup value={appearanceMode} onValueChange={value => setAppearanceMode(value as AppearanceMode)} className="grid gap-3 md:grid-cols-3">{modes.map(({ value, title, detail, Icon }) => <Label key={value} htmlFor={`mode-${value}`} className={`cursor-pointer rounded-2xl border p-4 transition ${appearanceMode === value ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"}`}><div className="flex items-start gap-3"><RadioGroupItem id={`mode-${value}`} value={value} className="mt-1" /><Icon className="mt-0.5 size-5 text-blue-700" /><span><span className="block font-semibold text-slate-950">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{detail}</span></span></div></Label>)}</RadioGroup></CardContent></Card>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"><p className="flex items-center gap-2 text-sm text-emerald-900"><CheckCircle2 className="size-5" />Chaque changement est enregistré dans le journal d’audit de la mairie.</p><Button type="button" className="bg-blue-700 hover:bg-blue-800" disabled={update.isPending || name.trim().length < 3 || platformName.trim().length < 3 || !/^#[0-9A-F]{6}$/.test(primaryColor)} onClick={() => update.mutate({ name: name.trim(), platformName: platformName.trim(), primaryColor, appearanceMode })}><Save className="mr-2 size-4" />{update.isPending ? "Enregistrement…" : "Enregistrer les paramètres"}</Button></div>
  </div>;
}

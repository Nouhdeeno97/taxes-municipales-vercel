import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useOfflineCreate } from "@/hooks/useOfflineCreate";
import { BadgeInfo, Calculator, CircleCheck, FilePlus2, Link2, Power, SlidersHorizontal, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { previewTaxAmount } from "@shared/taxCalculation";

type ErrorLike = { message: string };
type ActivityLocationType = "ZONE" | "MARKET" | "MARKET_LOCATION" | "MOBILE" | "CUSTOM";
const today = () => new Date().toISOString().slice(0, 10);
const money = new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 });
const selectStyle = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";
const locationTypeLabels: Record<ActivityLocationType, string> = { ZONE: "Zone", MARKET: "Marché", MARKET_LOCATION: "Emplacement", MOBILE: "Activité mobile", CUSTOM: "Adresse personnalisée" };

function TaxEstimatePreview() {
  const [baseAmount, setBaseAmount] = useState(1000);
  const [exemptionPercent, setExemptionPercent] = useState(0);
  const [penaltyPercent, setPenaltyPercent] = useState(0);
  const [daysLate, setDaysLate] = useState(0);
  const estimate = previewTaxAmount({ baseAmount, exemptionRate: exemptionPercent / 100, penaltyRate: penaltyPercent / 100, daysLate });

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2"><Calculator className="size-5 text-blue-700" /><CardTitle className="text-base">Prévisualiser le calcul</CardTitle></div>
        <CardDescription>Vérifiez le montant avant de créer ou d’affecter une règle. Cette estimation ne crée aucune obligation.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          <div><Label>Montant de base (XAF)</Label><Input type="number" min="0" value={baseAmount} onChange={event => setBaseAmount(Number(event.target.value) || 0)} className="mt-1" /></div>
          <div><Label>Exonération (%)</Label><Input type="number" min="0" max="100" value={exemptionPercent} onChange={event => setExemptionPercent(Number(event.target.value) || 0)} className="mt-1" /></div>
          <div><Label>Pénalité (%)</Label><Input type="number" min="0" max="100" value={penaltyPercent} onChange={event => setPenaltyPercent(Number(event.target.value) || 0)} className="mt-1" /></div>
          <div><Label>Jours de retard</Label><Input type="number" min="0" value={daysLate} onChange={event => setDaysLate(Number(event.target.value) || 0)} className="mt-1" /></div>
        </div>
        <div className="mt-4 grid gap-2 rounded-xl border border-blue-200 bg-white p-3 text-sm md:grid-cols-4">
          <p>Base : <strong>{money.format(estimate.baseAmount)} XAF</strong></p>
          <p>Exonération : <strong>- {money.format(estimate.exemptionAmount)} XAF</strong></p>
          <p>Pénalité : <strong>+ {money.format(estimate.penaltyAmount)} XAF</strong></p>
          <p className="text-blue-900">À percevoir : <strong>{money.format(estimate.totalAmount)} XAF</strong></p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaxationWorkspace() {
  const catalog = trpc.municipal.catalog.options.useQuery();
  const rules = trpc.municipal.taxation.rules.useQuery();
  const obligations = trpc.municipal.taxation.obligations.useQuery();
  const utils = trpc.useUtils();
  const offline = useOfflineCreate();
  const [activityQuery, setActivityQuery] = useState("");
  const [selectAllActivities, setSelectAllActivities] = useState(false);
  const [selectedActivityTypeIds, setSelectedActivityTypeIds] = useState<string[]>([]);
  const [selectedActivityLocationTypes, setSelectedActivityLocationTypes] = useState<ActivityLocationType[]>([]);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const activitySearch = trpc.municipal.activities.search.useQuery({ query: activityQuery || undefined, page: 0 }, { enabled: activityQuery.trim().length >= 2 });
  const activityLots = trpc.municipal.activities.selectionLots.useQuery();
  const refreshCatalog = () => {
    utils.municipal.catalog.options.invalidate();
    utils.municipal.taxation.rules.invalidate();
    utils.municipal.taxation.obligations.invalidate();
  };
  const createTaxCategory = trpc.municipal.catalog.createTaxCategory.useMutation({ onSuccess: () => { toast.success("Catégorie de taxe créée."); refreshCatalog(); }, onError: (error: ErrorLike) => toast.error(error.message) });
  const createTaxType = trpc.municipal.catalog.createTaxType.useMutation({ onSuccess: () => { toast.success("Type de taxe municipal créé."); refreshCatalog(); }, onError: (error: ErrorLike) => toast.error(error.message) });
  const setTaxTypeActive = trpc.municipal.catalog.setTaxTypeActive.useMutation({ onSuccess: result => { toast.success(result.isActive ? "Type de taxe activé." : "Type de taxe désactivé : il ne pourra plus être sélectionné pour de nouvelles règles."); refreshCatalog(); }, onError: (error: ErrorLike) => toast.error(error.message) });
  const createPeriodicity = trpc.municipal.catalog.createPeriodicity.useMutation({ onSuccess: () => { toast.success("Périodicité créée."); refreshCatalog(); }, onError: (error: ErrorLike) => toast.error(error.message) });
  const createRule = trpc.municipal.taxation.createRule.useMutation({ onSuccess: () => { toast.success("Règle fiscale créée. Affectez-la maintenant à une activité concernée."); refreshCatalog(); }, onError: (error: ErrorLike) => toast.error(error.message) });
  const setRuleActive = trpc.municipal.taxation.setRuleActive.useMutation({ onSuccess: result => { toast.success(result.isActive ? "Règle fiscale activée." : "Règle fiscale désactivée : aucune obligation future ne sera générée par cette règle."); refreshCatalog(); }, onError: (error: ErrorLike) => toast.error(error.message) });
  const assignSelection = trpc.municipal.taxation.assignRuleToSelection.useMutation({ onSuccess: result => { toast.success(`${result.assignedCount} affectation(s) créée(s) sur ${result.targetCount} activité(s).`); utils.municipal.activities.list.invalidate(); }, onError: (error: ErrorLike) => toast.error(error.message) });
  const generateSelection = trpc.municipal.taxation.generateForSelection.useMutation({ onSuccess: result => { toast.success(result.createdCount ? `${result.createdCount} obligation(s) générée(s) sur ${result.targetCount} activité(s).` : "Aucune nouvelle obligation : vérifiez que la règle est affectée aux activités et que la période n’est pas déjà générée."); if (result.notAssignedCount) toast.message(`${result.notAssignedCount} activité(s) ignorée(s) : la règle n’y est pas encore affectée.`); utils.municipal.taxation.obligations.invalidate(); }, onError: (error: ErrorLike) => toast.error(error.message) });
  const taxTypes = catalog.data?.taxTypes ?? [];
  const activeTaxTypes = taxTypes.filter(type => type.isActive);
  const localCreates = offline.queue.filter(item => item.entityType === "offline.create").map(item => ({ id: item.entityId, ...(item.payload as { command: string; payload: Record<string, unknown> }) }));
  const taxCategoryOptions = [...(catalog.data?.taxCategories ?? []), ...localCreates.filter(item => item.command === "TAX_CATEGORY").map(item => ({ id: item.id, label: String(item.payload.label) }))];
  const taxTypeOptions = [...activeTaxTypes, ...localCreates.filter(item => item.command === "TAX_TYPE").map(item => ({ id: item.id, label: String(item.payload.label), isActive: true }))];
  const periodicityOptions = [...(catalog.data?.periodicities?.filter(item => item.isActive) ?? []), ...localCreates.filter(item => item.command === "PERIODICITY").map(item => ({ id: item.id, label: String(item.payload.label), isActive: true }))];
  const selection = { all: selectAllActivities, activityTypeIds: selectedActivityTypeIds, activityLocationTypes: selectedActivityLocationTypes, activityIds: selectedActivityIds };
  const hasSelection = selection.all || selection.activityTypeIds.length > 0 || selection.activityLocationTypes.length > 0 || selection.activityIds.length > 0;
  const toggleSelection = <T extends string>(value: T, selected: T[], setSelected: (values: T[]) => void) => setSelected(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 p-6 text-white shadow-[0_16px_34px_rgba(30,64,175,.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-100">Fiscalité municipale configurable</p>
            <h1 className="mt-2 text-3xl font-bold">Toutes les taxes de la mairie, aujourd’hui et demain</h1>
            <p className="mt-3 text-sm leading-6 text-blue-50">Cet espace ne se limite pas aux marchés. Créez ici une taxe de stationnement, d’occupation du domaine public, de publicité, de licence, de marché ou tout autre prélèvement décidé par la mairie. Une nouvelle taxe se paramètre dans l’interface, sans refaire le système.</p>
          </div>
          <Badge className="border border-white/25 bg-white/15 px-3 py-1.5 text-white"><Sparkles className="mr-1.5 size-3.5" />Catalogue évolutif</Badge>
        </div>
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl border border-white/15 bg-white/10 p-3"><span className="block text-xs uppercase tracking-wide text-blue-100">Types actifs</span><strong className="mt-1 block text-2xl">{activeTaxTypes.length}</strong></div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-3"><span className="block text-xs uppercase tracking-wide text-blue-100">Règles actives</span><strong className="mt-1 block text-2xl">{rules.data?.filter(({ rule }) => rule.isActive).length ?? 0}</strong></div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-3"><span className="block text-xs uppercase tracking-wide text-blue-100">Obligations suivies</span><strong className="mt-1 block text-2xl">{obligations.data?.length ?? 0}</strong></div>
        </div>
      </section>

      <Card className="border-sky-200 bg-sky-50/70">
        <CardContent className="flex gap-3 p-4 text-sm leading-6 text-slate-700"><BadgeInfo className="mt-0.5 size-5 shrink-0 text-blue-700" /><p><strong className="text-slate-950">Comment ajouter une taxe future :</strong> créez sa catégorie si nécessaire, créez le type de taxe, choisissez sa périodicité, définissez la règle tarifaire puis affectez la règle aux activités concernées. Désactivez une taxe ou une règle si elle n’est plus appliquée ; l’historique des obligations et reçus reste conservé.</p></CardContent>
      </Card>

      <TaxEstimatePreview />

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="border-blue-100">
          <CardHeader><Badge className="w-fit bg-blue-700">Étape 1</Badge><CardTitle className="mt-3">Catalogue des taxes</CardTitle><CardDescription>Construisez ou mettez à jour les éléments réutilisables par toutes les taxes municipales.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-2 rounded-xl bg-slate-50 p-3" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const payload = { code: String(data.get("code")), label: String(data.get("label")) }; if (!offline.online) { offline.defer("TAX_CATEGORY", payload, `Catégorie de taxe ${payload.label}`); toast.success("Catégorie enregistrée localement."); } else createTaxCategory.mutate(payload); event.currentTarget.reset(); }}>
              <p className="text-sm font-semibold">Catégorie de taxe</p><Input name="code" placeholder="Ex. DOMAINE_PUBLIC" required /><Input name="label" placeholder="Ex. Occupation du domaine public" required /><Button type="submit" size="sm" className="w-full bg-blue-700 hover:bg-blue-800">Ajouter une catégorie</Button>
            </form>
            <form className="space-y-2 rounded-xl bg-slate-50 p-3" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const payload = { categoryId: String(data.get("categoryId")) || undefined, code: String(data.get("code")), label: String(data.get("label")) }; if (!offline.online) { offline.defer("TAX_TYPE", payload, `Type de taxe ${payload.label}`); toast.success("Type de taxe enregistré localement."); } else createTaxType.mutate(payload); event.currentTarget.reset(); }}>
              <p className="text-sm font-semibold">Nouveau type de taxe</p>
              <select name="categoryId" className={selectStyle}><option value="">Sans catégorie</option>{taxCategoryOptions.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select>
              <Input name="code" placeholder="Ex. TAXE_AFFICHAGE" required /><Input name="label" placeholder="Ex. Taxe sur affichage publicitaire" required /><Button type="submit" size="sm" variant="outline" className="w-full">Ajouter le type</Button>
            </form>
            <form className="space-y-2 rounded-xl bg-slate-50 p-3" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const payload = { code: String(data.get("code")), label: String(data.get("label")), calendarUnit: String(data.get("unit")) as "DAY" | "WEEK" | "MONTH" | "QUARTER" | "SEMESTER" | "YEAR" | "CUSTOM", intervalCount: 1 }; if (!offline.online) { offline.defer("PERIODICITY", payload, `Périodicité ${payload.label}`); toast.success("Périodicité enregistrée localement."); } else createPeriodicity.mutate(payload); event.currentTarget.reset(); }}>
              <p className="text-sm font-semibold">Périodicité</p><Input name="code" placeholder="Ex. MENSUEL" required /><Input name="label" placeholder="Ex. Tous les mois" required />
              <select name="unit" className={selectStyle}><option value="DAY">Jour</option><option value="WEEK">Semaine</option><option value="MONTH">Mois</option><option value="QUARTER">Trimestre</option><option value="SEMESTER">Semestre</option><option value="YEAR">Année</option></select>
              <Button type="submit" size="sm" variant="outline" className="w-full">Ajouter la périodicité</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-blue-100 xl:col-span-2">
          <CardHeader><Badge className="w-fit bg-blue-700">Étape 2</Badge><CardTitle className="mt-3">Créer une règle tarifaire</CardTitle><CardDescription>Une règle définit un montant, une échéance et une périodicité. Elle peut servir à une activité de marché, à une activité mobile, à une occupation de voirie ou à tout autre cas déclaré.</CardDescription></CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const payload = { taxTypeId: String(data.get("taxTypeId")), periodicityId: String(data.get("periodicityId")), code: String(data.get("code")), label: String(data.get("label")), baseAmount: Number(data.get("baseAmount")), graceDays: Number(data.get("graceDays") || 0), penaltyRate: Number(data.get("penaltyRate") || 0) / 100, validFrom: new Date(String(data.get("validFrom"))) }; if (!offline.online) { offline.defer("TAX_RULE", payload, `Règle fiscale ${payload.label}`); toast.success("Règle fiscale enregistrée localement."); } else createRule.mutate(payload); event.currentTarget.reset(); }}>
              <div><Label>Type de taxe actif</Label><select name="taxTypeId" className={selectStyle} required><option value="">Sélectionner</option>{taxTypeOptions.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></div>
              <div><Label>Périodicité</Label><select name="periodicityId" className={selectStyle} required><option value="">Sélectionner</option>{periodicityOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
              <div><Label>Code</Label><Input name="code" placeholder="Ex. PUB_MENSUEL" required className="mt-1" /></div>
              <div><Label>Libellé de la règle</Label><Input name="label" placeholder="Ex. Affichage publicitaire mensuel" required className="mt-1" /></div>
              <div><Label>Montant de base (XAF)</Label><Input name="baseAmount" type="number" min="1" step="1" required className="mt-1" /></div>
              <div><Label>Date d’effet</Label><Input name="validFrom" type="date" defaultValue={today()} required className="mt-1" /></div>
              <div><Label>Jours de grâce</Label><Input name="graceDays" type="number" min="0" defaultValue="0" className="mt-1" /></div>
              <div><Label>Pénalité (%)</Label><Input name="penaltyRate" type="number" min="0" max="100" defaultValue="0" className="mt-1" /></div>
              <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-slate-700"><strong className="text-blue-950">Étape suivante :</strong> créez d’abord la règle avec son montant. Choisissez ensuite les activités à l’aide des cases de l’étape 3 ; le ciblage ne modifie jamais le montant tarifaire.</div>
              <div className="md:col-span-2"><Button type="submit" disabled={createRule.isPending} className="bg-blue-700 hover:bg-blue-800"><SlidersHorizontal className="mr-2 size-4" />Créer la règle fiscale</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-100">
        <CardHeader><Badge className="w-fit bg-blue-700">Étape 3</Badge><CardTitle className="mt-3">Choisir les activités concernées</CardTitle><CardDescription>Cochez toutes les activités, un ou plusieurs lots par type d’activité ou type de localisation, puis complétez si nécessaire avec une recherche par identifiant national/fiscal, référence ou nom. Cette sélection sera utilisée à l’étape 4 ou 5.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-950"><input type="checkbox" checked={selectAllActivities} onChange={event => setSelectAllActivities(event.target.checked)} className="size-4 accent-blue-700" />Toutes les activités actives</label>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-950">Lots par type d’activité</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{activityLots.data?.activityTypes.map(type => <label key={type.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700"><input type="checkbox" checked={selectedActivityTypeIds.includes(type.id)} onChange={() => toggleSelection(type.id, selectedActivityTypeIds, setSelectedActivityTypeIds)} className="size-4 accent-blue-700" /><span>{type.label} <strong className="text-slate-500">({type.count})</strong></span></label>) ?? <p className="text-sm text-slate-500">Aucun type avec activité active.</p>}</div></div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-950">Lots par type de localisation</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{activityLots.data?.locationTypes.map(item => <label key={item.locationType} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700"><input type="checkbox" checked={selectedActivityLocationTypes.includes(item.locationType)} onChange={() => toggleSelection(item.locationType, selectedActivityLocationTypes, setSelectedActivityLocationTypes)} className="size-4 accent-blue-700" /><span>{locationTypeLabels[item.locationType] ?? item.locationType} <strong className="text-slate-500">({item.count})</strong></span></label>) ?? <p className="text-sm text-slate-500">Aucun type de localisation disponible.</p>}</div></div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4"><Label>Rechercher une ou plusieurs activités précises</Label><Input value={activityQuery} onChange={event => setActivityQuery(event.target.value)} placeholder="Identifiant national ou fiscal, référence, nom du redevable, libellé d’activité" className="mt-2" /><div className="mt-3 grid gap-2">{activityQuery.trim().length >= 2 && !activitySearch.data?.rows.length ? <p className="text-sm text-slate-500">Aucune activité trouvée.</p> : activitySearch.data?.rows.map(({ activity, taxpayer }) => <label key={activity.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selectedActivityIds.includes(activity.id)} onChange={() => toggleSelection(activity.id, selectedActivityIds, setSelectedActivityIds)} className="mt-0.5 size-4 accent-blue-700" /><span><strong className="text-slate-950">{activity.reference} · {activity.label}</strong><span className="mt-1 block text-slate-500">{taxpayer?.nationalId ?? taxpayer?.taxId ?? taxpayer?.reference ?? "Redevable sans identifiant renseigné"}</span></span></label>)}</div></div>
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Sélection actuelle : <strong>{selectAllActivities ? "toutes les activités actives" : `${selectedActivityTypeIds.length} type(s) d’activité, ${selectedActivityLocationTypes.length} type(s) de localisation et ${selectedActivityIds.length} activité(s) précise(s)`}</strong>. Les lots sont traités par paquets de 200 activités ; relancez l’action si un message indique qu’un lot suivant reste à traiter.</p>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-blue-100"><CardHeader><Badge className="w-fit bg-blue-700">Étape 4</Badge><CardTitle className="mt-3">Affecter la règle aux activités cochées</CardTitle><CardDescription>Cette action relie la règle tarifaire choisie aux activités sélectionnées. Le montant de la règle reste inchangé.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const input = { taxRuleId: String(data.get("taxRuleId")), startDate: new Date(String(data.get("startDate"))), selection, offset: 0, limit: 200 }; if (!hasSelection) return toast.error("Cochez au moins un lot ou une activité à l’étape 3."); if (!offline.online) return toast.error("Reconnectez-vous pour affecter un lot : le serveur contrôle les doublons avant l’écriture."); assignSelection.mutate(input); }}><div className="md:col-span-2"><Label>Règle tarifaire active</Label><select name="taxRuleId" className={selectStyle} required><option value="">Sélectionner une règle</option>{rules.data?.filter(({ rule }) => rule.isActive).map(({ rule }) => <option key={rule.id} value={rule.id}>{rule.label} · {money.format(Number(rule.baseAmount))} XAF</option>)}</select></div><div><Label>Date de début</Label><Input name="startDate" type="date" defaultValue={today()} className="mt-1" required /></div><div className="flex items-end"><Button type="submit" disabled={assignSelection.isPending || !hasSelection} className="w-full bg-blue-700 hover:bg-blue-800"><Link2 className="mr-2 size-4" />Affecter au lot</Button></div></form></CardContent></Card>
        <Card className="border-blue-100"><CardHeader><Badge className="w-fit bg-blue-700">Étape 5</Badge><CardTitle className="mt-3">Générer les obligations des activités cochées</CardTitle><CardDescription>Choisissez la même règle et la période à appeler. Seules les activités auxquelles cette règle a été affectée recevront une obligation, sans doublon.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const input = { taxRuleId: String(data.get("taxRuleId")), periodStart: new Date(String(data.get("periodStart"))), periodEnd: new Date(String(data.get("periodEnd"))), dueDate: new Date(String(data.get("dueDate"))), selection, offset: 0, limit: 200 }; if (!hasSelection) return toast.error("Cochez au moins un lot ou une activité à l’étape 3."); if (!offline.online) return toast.error("Reconnectez-vous pour générer un lot : le serveur contrôle les montants et les doublons."); generateSelection.mutate(input); }}><div className="md:col-span-2"><Label>Règle tarifaire active</Label><select name="taxRuleId" className={selectStyle} required><option value="">Sélectionner une règle</option>{rules.data?.filter(({ rule }) => rule.isActive).map(({ rule }) => <option key={rule.id} value={rule.id}>{rule.label} · {money.format(Number(rule.baseAmount))} XAF</option>)}</select></div><div><Label>Début de période</Label><Input name="periodStart" type="date" defaultValue={today()} className="mt-1" required /></div><div><Label>Fin de période</Label><Input name="periodEnd" type="date" defaultValue={today()} className="mt-1" required /></div><div><Label>Échéance</Label><Input name="dueDate" type="date" defaultValue={today()} className="mt-1" required /></div><div className="flex items-end"><Button type="submit" disabled={generateSelection.isPending || !hasSelection} className="w-full bg-blue-700 hover:bg-blue-800"><Calculator className="mr-2 size-4" />Générer les obligations</Button></div></form></CardContent></Card>
      </div>

      <Card className="border-blue-100">
        <CardHeader><CardTitle>Catalogue actif et règles enregistrées</CardTitle><CardDescription>Activez ou désactivez une taxe selon les décisions municipales. La désactivation protège l’historique : elle empêche seulement les nouvelles règles et générations concernées.</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div><p className="mb-3 font-semibold text-slate-900">Types de taxes municipales</p><div className="space-y-2">{taxTypes.length ? taxTypes.map(type => <div key={type.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="font-medium text-slate-950">{type.label}</p><p className="mt-1 font-mono text-xs text-slate-500">{type.code}</p></div><div className="flex items-center gap-2"><Badge className={type.isActive ? "bg-emerald-700" : "bg-slate-500"}>{type.isActive ? "Actif" : "Inactif"}</Badge><Button type="button" size="sm" variant="outline" disabled={setTaxTypeActive.isPending} onClick={() => setTaxTypeActive.mutate({ taxTypeId: type.id, isActive: !type.isActive })}><Power className="mr-1.5 size-3.5" />{type.isActive ? "Désactiver" : "Activer"}</Button></div></div>) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Aucun type de taxe créé. Commencez par ajouter le prélèvement municipal à gérer.</p>}</div></div>
            <div><p className="mb-3 font-semibold text-slate-900">Règles fiscales</p><div className="space-y-2">{rules.data?.length ? rules.data.map(({ rule, taxType, periodicity }) => <div key={rule.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="font-medium text-slate-950">{rule.label}</p><p className="mt-1 text-sm text-slate-600">{taxType.label} · {periodicity.label} · <strong>{money.format(Number(rule.baseAmount))} XAF</strong></p></div><div className="flex items-center gap-2"><Badge className={rule.isActive ? "bg-emerald-700" : "bg-slate-500"}>{rule.isActive ? "Active" : "Inactive"}</Badge><Button type="button" size="sm" variant="outline" disabled={setRuleActive.isPending} onClick={() => setRuleActive.mutate({ taxRuleId: rule.id, isActive: !rule.isActive })}><Power className="mr-1.5 size-3.5" />{rule.isActive ? "Désactiver" : "Activer"}</Button></div></div>) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Aucune règle créée.</p>}</div></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100"><CardHeader><div className="flex items-center gap-2"><CircleCheck className="size-5 text-emerald-700" /><CardTitle>Obligations générées</CardTitle></div><CardDescription>Ce tableau confirme le résultat de la chaîne fiscale. Le montant initial reste affiché même lorsqu’une obligation est intégralement réglée.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Référence</TableHead><TableHead>Montant initial</TableHead><TableHead>Reste dû</TableHead><TableHead>État</TableHead></TableRow></TableHeader><TableBody>{obligations.data?.length ? obligations.data.map(({ obligation }) => <TableRow key={obligation.id}><TableCell className="font-mono text-xs text-blue-800">{obligation.reference}</TableCell><TableCell>{money.format(Number(obligation.expectedAmount))} XAF</TableCell><TableCell>{money.format(Number(obligation.remainingAmount))} XAF</TableCell><TableCell><Badge variant="outline">{obligation.status}</Badge></TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">Aucune obligation générée.</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card>
    </div>
  );
}

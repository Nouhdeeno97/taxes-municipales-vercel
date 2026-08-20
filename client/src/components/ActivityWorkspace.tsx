import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOfflineCreate } from "@/hooks/useOfflineCreate";
import { trpc } from "@/lib/trpc";
import { makeActivityTypeCode } from "@shared/activityTypeCode";
import { BookOpen, Plus, RotateCcw, Search, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type LocationType = "MARKET" | "ZONE" | "MARKET_LOCATION" | "MOBILE" | "CUSTOM";
type TaxpayerCandidate = { id: string; reference: string; firstName: string | null; lastName: string | null; legalName: string | null; nationalId: string | null; taxId: string | null };

const taxpayerLabel = (taxpayer: Pick<TaxpayerCandidate, "reference" | "firstName" | "lastName" | "legalName">) =>
  `${taxpayer.reference} · ${taxpayer.legalName || `${taxpayer.lastName ?? ""} ${taxpayer.firstName ?? ""}`.trim()}`;

export function ActivityWorkspace() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const offline = useOfflineCreate();
  const list = trpc.municipal.activities.list.useQuery();
  const catalog = trpc.municipal.catalog.options.useQuery();
  const territory = trpc.municipal.territory.tree.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [locationType, setLocationType] = useState<LocationType>("MARKET");
  const [typeMode, setTypeMode] = useState<"existing" | "new">("existing");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryCode, setNewCategoryCode] = useState("");
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeCode, setNewTypeCode] = useState("");
  const [taxpayerSearch, setTaxpayerSearch] = useState("");
  const [selectedTaxpayer, setSelectedTaxpayer] = useState<TaxpayerCandidate | null>(null);

  const canManageCatalog = user?.role === "admin";
  const taxpayerMatches = trpc.municipal.taxpayers.searchForActivity.useQuery(
    { query: taxpayerSearch.trim() },
    { enabled: taxpayerSearch.trim().length >= 2 && !selectedTaxpayer },
  );
  const create = trpc.municipal.activities.create.useMutation({
    onSuccess: result => {
      toast.success(result.initialObligationCount ? `Activité enregistrée : ${result.initialObligationCount} obligation(s) initiale(s) générée(s).` : "Activité enregistrée. Aucune règle active ne correspond encore à cette activité.");
      void utils.municipal.activities.list.invalidate();
      void utils.municipal.taxation.obligations.invalidate();
      setShowForm(false);
      setSelectedTaxpayer(null);
    },
    onError: error => toast.error(error.message),
  });
  const createCategory = trpc.municipal.catalog.createActivityCategory.useMutation();
  const createType = trpc.municipal.catalog.createActivityType.useMutation();

  const addActivityType = async () => {
    if (!canManageCatalog) return toast.error("La création d’un type d’activité est réservée aux administrateurs.");
    if (!newTypeLabel.trim()) return toast.error("Saisissez le libellé du nouveau type d’activité.");
    let effectiveCategoryId = categoryId;
    if (!offline.online) {
      if (effectiveCategoryId === "__NEW__") {
        if (!newCategoryLabel.trim()) return toast.error("Saisissez le libellé de la nouvelle catégorie.");
        effectiveCategoryId = offline.defer("ACTIVITY_CATEGORY", { code: newCategoryCode.trim() || makeActivityTypeCode(newCategoryLabel, "CAT"), label: newCategoryLabel.trim() }, `Catégorie ${newCategoryLabel.trim()}`);
      }
      if (!effectiveCategoryId) return toast.error("Sélectionnez ou créez une catégorie avant d’ajouter le type.");
      const localTypeId = offline.defer("ACTIVITY_TYPE", { categoryId: effectiveCategoryId, code: newTypeCode.trim() || makeActivityTypeCode(newTypeLabel), label: newTypeLabel.trim() }, `Type d’activité ${newTypeLabel.trim()}`);
      setActivityTypeId(localTypeId);
      setTypeMode("existing");
      setNewTypeLabel("");
      setNewTypeCode("");
      return toast.success("Type d’activité enregistré localement et en attente de synchronisation.");
    }
    try {
      if (effectiveCategoryId === "__NEW__") {
        if (!newCategoryLabel.trim()) return toast.error("Saisissez le libellé de la nouvelle catégorie.");
        const category = await createCategory.mutateAsync({ code: newCategoryCode.trim() || makeActivityTypeCode(newCategoryLabel, "CAT"), label: newCategoryLabel.trim() });
        effectiveCategoryId = category.id;
      }
      if (!effectiveCategoryId) return toast.error("Sélectionnez ou créez une catégorie avant d’ajouter le type.");
      const type = await createType.mutateAsync({ categoryId: effectiveCategoryId, code: newTypeCode.trim() || makeActivityTypeCode(newTypeLabel), label: newTypeLabel.trim() });
      await utils.municipal.catalog.options.invalidate();
      setActivityTypeId(type.id);
      setTypeMode("existing");
      setNewTypeLabel("");
      setNewTypeCode("");
      toast.success(`Type d’activité « ${type.label} » ajouté et sélectionné.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création du type impossible.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTaxpayer) return toast.error("Recherchez puis sélectionnez le redevable avant d’enregistrer l’activité.");
    if (!activityTypeId) return toast.error("Sélectionnez ou ajoutez un type d’activité.");
    const data = new FormData(event.currentTarget);
    const payload = {
      taxpayerId: selectedTaxpayer.id,
      activityTypeId,
      label: String(data.get("label")),
      locationType,
      zoneId: locationType === "ZONE" ? String(data.get("zoneId")) : undefined,
      marketId: locationType === "MARKET" ? String(data.get("marketId")) : undefined,
      marketLocationId: locationType === "MARKET_LOCATION" ? String(data.get("marketLocationId")) : undefined,
      address: locationType === "CUSTOM" ? String(data.get("address") || "") || undefined : undefined,
      startedAt: new Date(String(data.get("startedAt"))),
    };
    if (!offline.online) {
      offline.defer("ACTIVITY", payload, `Activité ${payload.label}`);
      setShowForm(false);
      return toast.success("Activité enregistrée localement et en attente de synchronisation.");
    }
    create.mutate(payload);
  };

  const pendingCount = offline.queue.filter(item => item.entityType === "offline.create" && (item.payload as { command?: string }).command === "ACTIVITY").length;

  return <>
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-[radial-gradient(circle_at_top_right,_rgba(191,219,254,.88),_transparent_38%),linear-gradient(135deg,_#ffffff,_#f1f6ff)] px-6 py-6 shadow-[0_12px_30px_rgba(30,64,175,.06)]">
      <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="inline-flex rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.17em] text-blue-700 shadow-sm">Cycle d’exploitation</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Activités</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Déclarez une activité à partir d’un redevable recherché : référence, identifiant national, identifiant fiscal ou nom.</p></div><Button onClick={() => setShowForm(value => !value)} className="bg-blue-700 hover:bg-blue-800"><Plus className="mr-2 size-4" />Nouvelle activité</Button></div>
    </section>

    {showForm && <Card className="mb-6 border-blue-100"><CardHeader><CardTitle>Déclarer une activité</CardTitle><CardDescription>La recherche est effectuée sur le serveur et limitée aux résultats utiles : aucune liste exhaustive de redevables n’est chargée.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
      <div className="relative md:col-span-3"><Label>Redevable</Label>{selectedTaxpayer ? <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><span><strong>{taxpayerLabel(selectedTaxpayer)}</strong>{selectedTaxpayer.nationalId ? ` · IDN ${selectedTaxpayer.nationalId}` : ""}{selectedTaxpayer.taxId ? ` · NIF ${selectedTaxpayer.taxId}` : ""}</span><Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedTaxpayer(null); setTaxpayerSearch(""); }}><X className="mr-1 size-3.5" />Modifier</Button></div> : <><div className="relative mt-2"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input value={taxpayerSearch} onChange={event => setTaxpayerSearch(event.target.value)} className="pl-9" placeholder="Référence, identifiant national, identifiant fiscal ou nom" autoComplete="off" /></div><p className="mt-1 text-xs text-slate-500">Saisissez au moins 2 caractères.</p>{taxpayerMatches.isFetching && <p className="mt-2 text-xs text-slate-500">Recherche en cours…</p>}{taxpayerSearch.trim().length >= 2 && !taxpayerMatches.isFetching && <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">{taxpayerMatches.data?.length ? taxpayerMatches.data.map(row => <button key={row.id} type="button" className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-blue-50" onClick={() => { setSelectedTaxpayer(row); setTaxpayerSearch(""); }}><strong className="text-slate-900">{taxpayerLabel(row)}</strong><span className="ml-2 text-xs text-slate-500">{row.nationalId ? `IDN ${row.nationalId}` : row.taxId ? `NIF ${row.taxId}` : ""}</span></button>) : <p className="p-3 text-sm text-slate-500">Aucun redevable actif trouvé.</p>}</div>}</>}</div>
      <div className="md:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><Label>Type d’activité</Label>{canManageCatalog && <Button type="button" size="sm" variant="outline" onClick={() => setTypeMode(mode => mode === "new" ? "existing" : "new")}>{typeMode === "new" ? <><RotateCcw className="mr-2 size-3.5" />Choisir dans la liste</> : <><BookOpen className="mr-2 size-3.5" />Ajouter un type</>}</Button>}</div>{typeMode === "existing" ? <select value={activityTypeId} onChange={event => setActivityTypeId(event.target.value)} required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner un type</option>{catalog.data?.activityTypes.map(({ type, category }) => <option key={type.id} value={type.id}>{category.label} · {type.label}</option>)}</select> : <div className="mt-2 grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-2"><div><Label>Catégorie</Label><select value={categoryId} onChange={event => setCategoryId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Sélectionner une catégorie</option>{catalog.data?.activityCategories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}<option value="__NEW__">+ Créer une catégorie</option></select></div>{categoryId === "__NEW__" && <><div><Label>Libellé de catégorie</Label><Input value={newCategoryLabel} onChange={event => setNewCategoryLabel(event.target.value)} className="mt-1 bg-white" /></div><div><Label>Code de catégorie</Label><Input value={newCategoryCode} onChange={event => setNewCategoryCode(event.target.value)} className="mt-1 bg-white" placeholder="Généré si vide" /></div></>}<div><Label>Libellé du type</Label><Input value={newTypeLabel} onChange={event => setNewTypeLabel(event.target.value)} className="mt-1 bg-white" /></div><div><Label>Code du type</Label><Input value={newTypeCode} onChange={event => setNewTypeCode(event.target.value)} className="mt-1 bg-white" placeholder="Généré si vide" /></div><div className="md:col-span-2"><Button type="button" disabled={createCategory.isPending || createType.isPending} onClick={addActivityType}>Ajouter et sélectionner ce type</Button></div></div>}</div>
      <div><Label htmlFor="activityLabel">Libellé de l’activité</Label><Input id="activityLabel" name="label" required className="mt-2" placeholder="Ex. Kiosque rue principale" /></div>
      <div><Label>Type de localisation</Label><select value={locationType} onChange={event => setLocationType(event.target.value as LocationType)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="MARKET">Marché</option><option value="MARKET_LOCATION">Emplacement</option><option value="ZONE">Zone</option><option value="MOBILE">Mobile</option><option value="CUSTOM">Adresse personnalisée</option></select></div>
      {locationType === "MARKET" && <div><Label>Marché</Label><select name="marketId" required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner</option>{territory.data?.markets.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></div>}
      {locationType === "MARKET_LOCATION" && <div><Label>Emplacement</Label><select name="marketLocationId" required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner</option>{territory.data?.locations.map(row => <option key={row.id} value={row.id}>{row.code} · {row.label}</option>)}</select></div>}
      {locationType === "ZONE" && <div><Label>Zone</Label><select name="zoneId" required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner</option>{territory.data?.zones.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></div>}
      {locationType === "CUSTOM" && <div><Label htmlFor="address">Adresse</Label><Input id="address" name="address" required className="mt-2" /></div>}
      <div><Label htmlFor="startedAt">Début d’activité</Label><Input id="startedAt" name="startedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="mt-2" /></div>
      <div className="flex items-end"><Button type="submit" disabled={create.isPending}>{create.isPending ? "Enregistrement…" : "Enregistrer l’activité"}</Button></div>
    </form></CardContent></Card>}

    <Card className="border-blue-100"><CardHeader><CardTitle>Registre des activités</CardTitle><CardDescription>Chaque activité conserve son redevable, son type, son territoire et son statut.</CardDescription></CardHeader><CardContent>{pendingCount > 0 && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{pendingCount} activité(s) locale(s) en attente de synchronisation.</div>}{list.error ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{list.error.message}</p> : list.isLoading ? <p className="text-sm text-slate-500">Chargement…</p> : !list.data?.length ? <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-8 text-center text-sm text-blue-900">Aucune activité enregistrée. Recherchez un redevable puis déclarez son activité.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Référence</TableHead><TableHead>Libellé</TableHead><TableHead>Redevable</TableHead><TableHead>Marché</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader><TableBody>{list.data.map(({ activity, taxpayer, market }) => <TableRow key={activity.id}><TableCell className="font-mono text-xs text-blue-800">{activity.reference}</TableCell><TableCell className="font-medium">{activity.label}</TableCell><TableCell>{taxpayer?.legalName || `${taxpayer?.lastName ?? ""} ${taxpayer?.firstName ?? ""}`}</TableCell><TableCell>{market?.name ?? activity.address ?? "—"}</TableCell><TableCell><Badge variant="outline">{activity.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
  </>;
}

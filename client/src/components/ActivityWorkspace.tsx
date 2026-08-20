import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { makeActivityTypeCode } from "@shared/activityTypeCode";
import { trpc } from "@/lib/trpc";
import { useOfflineCreate } from "@/hooks/useOfflineCreate";
import { BookOpen, Plus, RotateCcw } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const money = (value: number | string | null | undefined) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(Number(value ?? 0));
type LocationType = "MARKET" | "ZONE" | "MARKET_LOCATION" | "MOBILE" | "CUSTOM";

export function ActivityWorkspace() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const list = trpc.municipal.activities.list.useQuery();
  const taxpayers = trpc.municipal.taxpayers.list.useQuery();
  const catalog = trpc.municipal.catalog.options.useQuery();
  const territory = trpc.municipal.territory.tree.useQuery();
  const offline = useOfflineCreate();
  const [showForm, setShowForm] = useState(false);
  const [locationType, setLocationType] = useState<LocationType>("MARKET");
  const [typeMode, setTypeMode] = useState<"existing" | "new">("existing");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryCode, setNewCategoryCode] = useState("");
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeCode, setNewTypeCode] = useState("");
  const canManageCatalog = user?.role === "admin";
  const create = trpc.municipal.activities.create.useMutation({ onSuccess: result => { toast.success(result.initialObligationCount ? `Activité enregistrée : ${result.initialObligationCount} obligation fiscale a été générée.` : "Activité enregistrée. Aucune règle fiscale compatible : affectez une règle dans Fiscalité puis générez l’obligation."); utils.municipal.activities.list.invalidate(); utils.municipal.taxation.obligations.invalidate(); setShowForm(false); }, onError: error => toast.error(error.message) });
  const createCategory = trpc.municipal.catalog.createActivityCategory.useMutation();
  const createType = trpc.municipal.catalog.createActivityType.useMutation();
  const addingType = createCategory.isPending || createType.isPending;

  const addActivityType = async () => {
    if (!newTypeLabel.trim()) return toast.error("Saisissez le libellé du nouveau type d’activité.");
    if (!offline.online) {
      if (!canManageCatalog) return toast.error("La création d’un type d’activité est réservée aux administrateurs.");
      let effectiveCategoryId = categoryId;
      if (effectiveCategoryId === "__NEW__") {
        if (!newCategoryLabel.trim()) return toast.error("Saisissez le libellé de la nouvelle catégorie.");
        effectiveCategoryId = offline.defer("ACTIVITY_CATEGORY", { code: newCategoryCode.trim() || makeActivityTypeCode(newCategoryLabel, "CAT"), label: newCategoryLabel.trim() }, `Catégorie ${newCategoryLabel.trim()}`);
      }
      if (!effectiveCategoryId) return toast.error("Sélectionnez ou créez une catégorie avant d’ajouter le type.");
      const localTypeId = offline.defer("ACTIVITY_TYPE", { categoryId: effectiveCategoryId, code: newTypeCode.trim() || makeActivityTypeCode(newTypeLabel), label: newTypeLabel.trim() }, `Type d’activité ${newTypeLabel.trim()}`);
      setActivityTypeId(localTypeId); setTypeMode("existing"); setNewTypeLabel(""); setNewTypeCode(""); setNewCategoryLabel(""); setNewCategoryCode("");
      return toast.success("Type d’activité enregistré localement et en attente de synchronisation.");
    }
    try {
      let effectiveCategoryId = categoryId;
      if (effectiveCategoryId === "__NEW__") {
        if (!newCategoryLabel.trim()) return toast.error("Saisissez le libellé de la nouvelle catégorie.");
        const category = await createCategory.mutateAsync({ code: newCategoryCode.trim() || makeActivityTypeCode(newCategoryLabel, "CAT"), label: newCategoryLabel.trim() });
        effectiveCategoryId = category.id;
      }
      if (!effectiveCategoryId) return toast.error("Sélectionnez ou créez une catégorie avant d’ajouter le type.");
      const type = await createType.mutateAsync({ categoryId: effectiveCategoryId, code: newTypeCode.trim() || makeActivityTypeCode(newTypeLabel), label: newTypeLabel.trim() });
      toast.success(`Type d’activité « ${type.label} » ajouté et sélectionné.`);
      await utils.municipal.catalog.options.invalidate();
      setActivityTypeId(type.id);
      setTypeMode("existing");
      setNewTypeLabel(""); setNewTypeCode(""); setNewCategoryLabel(""); setNewCategoryCode("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Création du type impossible."); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activityTypeId) return toast.error("Sélectionnez ou ajoutez un type d’activité.");
    const data = new FormData(event.currentTarget);
    const payload = { taxpayerId: String(data.get("taxpayerId")), activityTypeId, label: String(data.get("label")), locationType, zoneId: locationType === "ZONE" ? String(data.get("zoneId")) : undefined, marketId: locationType === "MARKET" ? String(data.get("marketId")) : undefined, marketLocationId: locationType === "MARKET_LOCATION" ? String(data.get("marketLocationId")) : undefined, address: locationType === "CUSTOM" ? String(data.get("address") || "") || undefined : undefined, startedAt: new Date(String(data.get("startedAt"))) };
    if (!offline.online) { offline.defer("ACTIVITY", payload, `Activité ${payload.label}`); setShowForm(false); return toast.success("Activité enregistrée localement et en attente de synchronisation."); }
    create.mutate(payload);
  };
  return <><section className="relative mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-[radial-gradient(circle_at_top_right,_rgba(191,219,254,.88),_transparent_38%),linear-gradient(135deg,_#ffffff,_#f1f6ff)] px-6 py-6 shadow-[0_12px_30px_rgba(30,64,175,.06)]"><div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="inline-flex rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.17em] text-blue-700 shadow-sm">Cycle d’exploitation</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Activités</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Déclarez une activité pour un redevable. Un type existant peut être sélectionné ; un administrateur peut aussi ajouter un type réutilisable sans quitter ce parcours.</p></div><Button onClick={() => setShowForm(value => !value)} className="bg-blue-700 hover:bg-blue-800"><Plus className="mr-2 size-4" />Nouvelle activité</Button></div></section>
    {showForm && <Card className="mb-6 border-blue-100"><CardHeader><CardTitle>Déclarer une activité</CardTitle><CardDescription>Le type détermine les règles fiscales éligibles. Lorsque le territoire et la règle correspondent, l’obligation initiale est générée automatiquement.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-3"><div><Label>Redevable</Label><select name="taxpayerId" required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner</option>{taxpayers.data?.filter(row => row.status === "ACTIVE").map(row => <option key={row.id} value={row.id}>{row.reference} · {row.legalName || `${row.lastName ?? ""} ${row.firstName ?? ""}`}</option>)}</select></div><div className="md:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><Label>Type d’activité</Label>{canManageCatalog && <Button type="button" size="sm" variant="outline" onClick={() => setTypeMode(mode => mode === "new" ? "existing" : "new")}>{typeMode === "new" ? <><RotateCcw className="mr-2 size-3.5" />Choisir dans la liste</> : <><BookOpen className="mr-2 size-3.5" />Ajouter un type</>}</Button>}</div>{typeMode === "existing" ? <><select value={activityTypeId} onChange={event => setActivityTypeId(event.target.value)} required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner un type</option>{catalog.data?.activityTypes.map(({ type, category }) => <option key={type.id} value={type.id}>{category.label} · {type.label}</option>)}</select>{!canManageCatalog && <p className="mt-2 text-xs text-slate-500">Un type manque ? Un administrateur peut l’ajouter depuis ce même champ.</p>}</> : <div className="mt-2 grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-2"><div><Label>Catégorie</Label><select value={categoryId} onChange={event => setCategoryId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Sélectionner une catégorie</option>{catalog.data?.activityCategories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}<option value="__NEW__">+ Créer une catégorie</option></select></div>{categoryId === "__NEW__" && <><div><Label>Libellé de catégorie</Label><Input value={newCategoryLabel} onChange={event => setNewCategoryLabel(event.target.value)} className="mt-1 bg-white" placeholder="Ex. Services urbains" /></div><div><Label>Code de catégorie (facultatif)</Label><Input value={newCategoryCode} onChange={event => setNewCategoryCode(event.target.value)} className="mt-1 bg-white" placeholder="Généré si vide" /></div></>}<div><Label>Libellé du type</Label><Input value={newTypeLabel} onChange={event => setNewTypeLabel(event.target.value)} className="mt-1 bg-white" placeholder="Ex. Lavage automobile" /></div><div><Label>Code du type (facultatif)</Label><Input value={newTypeCode} onChange={event => setNewTypeCode(event.target.value)} className="mt-1 bg-white" placeholder="Généré si vide" /></div><div className="md:col-span-2"><Button type="button" disabled={addingType} onClick={addActivityType}>{addingType ? "Ajout…" : "Ajouter et sélectionner ce type"}</Button><p className="mt-2 text-xs text-blue-900">La création est réservée aux administrateurs et est inscrite au journal d’audit.</p></div></div>}</div><div><Label htmlFor="activityLabel">Libellé de l’activité</Label><Input id="activityLabel" name="label" required className="mt-2" placeholder="Ex. Kiosque rue principale" /></div><div><Label>Type de localisation</Label><select value={locationType} onChange={event => setLocationType(event.target.value as LocationType)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="MARKET">Marché</option><option value="MARKET_LOCATION">Emplacement</option><option value="ZONE">Zone</option><option value="MOBILE">Mobile</option><option value="CUSTOM">Adresse personnalisée</option></select></div>{locationType === "MARKET" && <div><Label>Marché</Label><select name="marketId" required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner</option>{territory.data?.markets.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></div>}{locationType === "MARKET_LOCATION" && <div><Label>Emplacement</Label><select name="marketLocationId" required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner</option>{territory.data?.locations.map(row => <option key={row.id} value={row.id}>{row.code} · {row.label}</option>)}</select></div>}{locationType === "ZONE" && <div><Label>Zone</Label><select name="zoneId" required className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner</option>{territory.data?.zones.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></div>}{locationType === "CUSTOM" && <div><Label htmlFor="address">Adresse</Label><Input id="address" name="address" required className="mt-2" /></div>}<div><Label htmlFor="startedAt">Début d’activité</Label><Input id="startedAt" name="startedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="mt-2" /></div><div className="flex items-end"><Button type="submit" disabled={create.isPending}>{create.isPending ? "Enregistrement…" : "Enregistrer l’activité"}</Button></div></form></CardContent></Card>}
    <Card className="border-blue-100"><CardHeader><CardTitle>Registre des activités</CardTitle><CardDescription>Les catégories et les types d’activité sont réutilisables pour les déclarations futures ; chaque activité conserve son territoire et son statut.</CardDescription></CardHeader><CardContent>{offline.queue.filter(item => item.entityType === "offline.create" && (item.payload as { command?: string }).command === "ACTIVITY").length > 0 && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{offline.queue.filter(item => item.entityType === "offline.create" && (item.payload as { command?: string }).command === "ACTIVITY").length} activité(s) locale(s) en attente de synchronisation.</div>}{list.error ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{list.error.message}</p> : list.isLoading ? <p className="text-sm text-slate-500">Chargement…</p> : !list.data?.length ? <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-8 text-center text-sm text-blue-900">Aucune activité enregistrée. Créez d’abord un redevable, puis déclarez son activité avec un type existant ou un nouveau type autorisé.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Référence</TableHead><TableHead>Libellé</TableHead><TableHead>Redevable</TableHead><TableHead>Marché</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader><TableBody>{list.data.map(({ activity, taxpayer, market }) => <TableRow key={activity.id}><TableCell className="font-mono text-xs text-blue-800">{activity.reference}</TableCell><TableCell className="font-medium">{activity.label}</TableCell><TableCell>{taxpayer?.legalName || `${taxpayer?.lastName ?? ""} ${taxpayer?.firstName ?? ""}`}</TableCell><TableCell>{market?.name ?? activity.address ?? "—"}</TableCell><TableCell><Badge variant="outline">{activity.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card></>;
}

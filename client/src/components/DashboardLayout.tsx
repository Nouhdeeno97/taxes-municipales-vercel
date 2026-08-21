import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useOfflineCreate } from "@/hooks/useOfflineCreate";
import { trpc } from "@/lib/trpc";
import { getOfflineCapabilityMessage } from "@shared/offlineCapabilities";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  CircleHelp,
  ClipboardCheck,
  CloudOff,
  DatabaseBackup,
  FileText,
  Landmark,
  LogOut,
  MapPinned,
  RefreshCw,
  ReceiptText,
  Palette,
  Settings2,
  ShieldCheck,
  ScrollText,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: BarChart3, label: "Pilotage", path: "/" },
  { icon: UsersRound, label: "Redevables", path: "/redevables" },
  { icon: Activity, label: "Activités", path: "/activites" },
  { icon: MapPinned, label: "Territoire", path: "/territoire" },
  { icon: BookOpenCheck, label: "Fiscalité", path: "/fiscalite" },
  { icon: FileText, label: "Obligations", path: "/obligations" },
  { icon: ReceiptText, label: "Encaissement", path: "/encaissement" },
  { icon: ReceiptText, label: "Reçus", path: "/recus" },
  { icon: WalletCards, label: "Versements", path: "/versements" },
  { icon: ClipboardCheck, label: "Clôtures", path: "/clotures" },
  { icon: BarChart3, label: "Rapports", path: "/rapports" },
  { icon: RefreshCw, label: "Synchronisation", path: "/synchronisation" },
  { icon: UsersRound, label: "Utilisateurs", path: "/utilisateurs", adminOnly: true },
  { icon: ShieldCheck, label: "Rôles et permissions", path: "/roles-permissions", adminOnly: true },
  { icon: ScrollText, label: "Journal d’audit", path: "/audit", adminOnly: true },
  { icon: Settings2, label: "Administration", path: "/administration", adminOnly: true },
  { icon: Palette, label: "Paramètres", path: "/parametres", adminOnly: true },
  { icon: DatabaseBackup, label: "Base de données", path: "/base-de-donnees", technicalOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  useOfflineCreate();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center px-5 bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_38%),linear-gradient(135deg,_#092b63,_#0b5bd3)]">
        <section className="w-full max-w-md rounded-3xl border border-white/15 bg-white/95 p-8 shadow-2xl text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-700 text-white"><Landmark className="size-7" /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Plateforme municipale</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Gestion fiscale & collecte</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Accédez aux opérations de terrain, aux contrôles de caisse et aux rapports de la mairie.</p>
          <div className="mt-7 grid gap-3"><Button onClick={() => { window.location.href = "/connexion"; }} className="h-11 w-full bg-blue-700 hover:bg-blue-800">Connexion municipale</Button></div>
        </section>
      </main>
    );
  }
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { online, queueSize } = useOfflineQueue();
  const { data: municipality } = trpc.municipal.activeMunicipality.useQuery();
  const grants = trpc.municipal.help.permissions.useQuery();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const activeLabel = menuItems.find(item => item.path === location)?.label ?? "Gestion municipale";
  const initials = user?.name?.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() || "UM";
  const onlineOnlyMessage = getOfflineCapabilityMessage(location);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-blue-100 bg-white text-slate-950 shadow-[8px_0_30px_rgba(15,75,160,.04)]">
        <SidebarHeader className="h-[78px] border-b border-blue-100 px-3 py-3">
          <button onClick={() => setLocation("/")} className="flex w-full items-center gap-3 rounded-xl px-2 text-left">
            <span className="grid size-9 place-items-center overflow-hidden rounded-xl text-white" style={{ backgroundColor: municipality?.primaryColor ?? "#0f5cdb" }}>{municipality?.logoUrl ? <img src={municipality.logoUrl} alt="Logo municipal" className="size-full object-contain p-1" /> : <Landmark className="size-5" />}</span>
            <span className="group-data-[collapsible=icon]:hidden">
              <span className="block text-sm font-semibold leading-none">{municipality?.platformName ?? "Gestion des taxes municipales"}</span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Fiscalité municipale configurable</span>
            </span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 group-data-[collapsible=icon]:hidden">Navigation</p>
          <SidebarMenu>
            {menuItems.filter(item => (!item.adminOnly || user?.role === "admin") && (!item.technicalOnly || user?.role === "admin" || grants.data?.some(grant => (grant.module === "database" || grant.module === "*") && (grant.action === "maintenance" || grant.action === "*")))).map(item => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton isActive={location === item.path} tooltip={item.label} onClick={() => setLocation(item.path)} style={location === item.path ? { backgroundColor: municipality?.primaryColor ?? "#0f5cdb", color: "white" } : undefined} className="h-10 font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 data-[active=true]:text-white">
                  <item.icon className="size-4" /><span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-blue-100 p-3">
          <button onClick={() => setLocation("/aide")} className={`mb-2 flex h-10 w-full items-center gap-2 rounded-xl px-2.5 text-left text-sm font-semibold transition-all ${location === "/aide" ? "bg-blue-700 text-white shadow-[0_8px_18px_rgba(29,78,216,.22)]" : "text-blue-800 hover:bg-blue-50"}`}><CircleHelp className="size-4" /><span className="group-data-[collapsible=icon]:hidden">Aide et tutoriels</span></button>
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-8 border border-blue-200"><AvatarFallback className="bg-blue-700 text-xs text-white">{initials}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-slate-950">{user?.name || "Utilisateur municipal"}</p><p className="truncate text-[11px] text-slate-500">{user?.role === "admin" ? "Administration" : "Opérations"}</p></div>
            <button onClick={logout} title="Se déconnecter" className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-800 group-data-[collapsible=icon]:hidden"><LogOut className="size-4" /></button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f6f9fe]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-blue-100 bg-white/95 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3"><SidebarTrigger className="md:hidden" /><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{municipality?.name ?? "Mairie · Opérations"}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{isMobile ? activeLabel : municipality?.platformName ?? "Gestion des taxes municipales"}</h2></div></div>
          <div title={online ? queueSize ? `${queueSize} opération(s) à synchroniser` : "Service en ligne" : `${queueSize} opération(s) conservée(s) localement`} className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-2.5 py-1.5 text-xs text-slate-700 sm:px-3">{online ? <span className="size-2 rounded-full bg-emerald-500" /> : <CloudOff className="size-3.5 text-amber-600" />}<span className="hidden sm:inline">{online ? queueSize ? `${queueSize} opération(s) à synchroniser` : "Service en ligne" : `${queueSize} opération(s) conservée(s) localement`}</span><span className="sr-only">{online ? queueSize ? `${queueSize} opération(s) à synchroniser` : "Service en ligne" : `${queueSize} opération(s) conservée(s) localement`}</span></div>
        </header>
        {!online && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 md:px-7"><strong>Mode hors connexion.</strong> {onlineOnlyMessage ?? "Les données déjà consultées restent disponibles sur cet appareil. Les formulaires métier compatibles sont conservés dans la file locale et seront synchronisés au retour du réseau."}</div>}
        <main className="min-h-[calc(100vh-78px)] p-4 md:p-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

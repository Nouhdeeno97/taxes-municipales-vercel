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
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  CloudOff,
  FileText,
  Landmark,
  LogOut,
  MapPinned,
  RefreshCw,
  ReceiptText,
  Settings2,
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
  { icon: Settings2, label: "Administration", path: "/administration" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center px-5 bg-[radial-gradient(circle_at_top_left,_#f8f1df_0,_transparent_38%),linear-gradient(135deg,_#0b302b,_#155247)]">
        <section className="w-full max-w-md rounded-3xl border border-white/15 bg-white/95 p-8 shadow-2xl text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#0f5a4e] text-white"><Landmark className="size-7" /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#ad6a1d]">Plateforme municipale</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#173931]">Gestion fiscale & collecte</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Accédez aux opérations de terrain, aux contrôles de caisse et aux rapports de la mairie.</p>
          <Button onClick={() => startLogin()} className="mt-7 h-11 w-full bg-[#0f5a4e] hover:bg-[#0b493e]">Se connecter</Button>
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
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const activeLabel = menuItems.find(item => item.path === location)?.label ?? "Gestion municipale";
  const initials = user?.name?.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() || "UM";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-[#dae7e2] bg-[#0b302b] text-[#eaf3ef]">
        <SidebarHeader className="h-[78px] border-b border-white/10 px-3 py-3">
          <button onClick={() => setLocation("/")} className="flex w-full items-center gap-3 rounded-xl px-2 text-left">
            <span className="grid size-9 place-items-center rounded-xl bg-[#e7a14a] text-[#183a33]"><Landmark className="size-5" /></span>
            <span className="group-data-[collapsible=icon]:hidden">
              <span className="block text-sm font-semibold leading-none">TaxeMarché</span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-[#a8c7bd]">Opérations municipales</span>
            </span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8fb5a9] group-data-[collapsible=icon]:hidden">Navigation</p>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton isActive={location === item.path} tooltip={item.label} onClick={() => setLocation(item.path)} className="h-10 text-[#d6e8e1] hover:bg-white/10 hover:text-white data-[active=true]:bg-[#e7a14a] data-[active=true]:text-[#173931]">
                  <item.icon className="size-4" /><span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-8 border border-white/20"><AvatarFallback className="bg-[#16483f] text-xs text-white">{initials}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold">{user?.name || "Utilisateur municipal"}</p><p className="truncate text-[11px] text-[#9ec2b7]">{user?.role === "admin" ? "Administration" : "Opérations"}</p></div>
            <button onClick={logout} title="Se déconnecter" className="rounded-md p-1.5 text-[#a8c7bd] hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden"><LogOut className="size-4" /></button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f7f8f5]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-[#e4ebe7] bg-[#f7f8f5]/95 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3"><SidebarTrigger className="md:hidden" /><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ad6a1d]">{municipality ? `${municipality.name} · ${municipality.code}` : "Mairie · Opérations"}</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-[#173931]">{isMobile ? activeLabel : "Gestion des taxes de marché"}</h2></div></div>
          <div title={online ? queueSize ? `${queueSize} opération(s) à synchroniser` : "Service en ligne" : `${queueSize} opération(s) conservée(s) localement`} className="flex items-center gap-2 rounded-full border border-[#dce7e2] bg-white px-2.5 py-1.5 text-xs text-[#40645c] sm:px-3">{online ? <span className="size-2 rounded-full bg-emerald-500" /> : <CloudOff className="size-3.5 text-amber-600" />}<span className="hidden sm:inline">{online ? queueSize ? `${queueSize} opération(s) à synchroniser` : "Service en ligne" : `${queueSize} opération(s) conservée(s) localement`}</span><span className="sr-only">{online ? queueSize ? `${queueSize} opération(s) à synchroniser` : "Service en ligne" : `${queueSize} opération(s) conservée(s) localement`}</span></div>
        </header>
        <main className="min-h-[calc(100vh-78px)] p-4 md:p-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

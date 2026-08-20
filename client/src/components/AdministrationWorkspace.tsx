import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpenCheck, History, Palette, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "wouter";

const destinations = [
  { href: "/utilisateurs", icon: UsersRound, title: "Utilisateurs", text: "Ajouter les comptes locaux, préautoriser Manus, gérer leur cycle de vie et exporter le registre filtré." },
  { href: "/roles-permissions", icon: ShieldCheck, title: "Rôles et permissions", text: "Créer les rôles, cocher leurs droits réels et les affecter aux comptes municipaux." },
  { href: "/audit", icon: History, title: "Journal d’audit", text: "Rechercher les opérations, filtrer la traçabilité et exporter les événements municipaux." },
  { href: "/fiscalite", icon: BookOpenCheck, title: "Référentiels fiscaux et activités", text: "Configurer les catégories, les types d’activité, les taxes, les périodicités et les règles tarifaires." },
  { href: "/parametres", icon: Palette, title: "Identité de la plateforme", text: "Ajuster le nom, le logo, la couleur principale et le thème de la mairie." },
];

export function AdministrationWorkspace() {
  return <div className="space-y-6"><section className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 p-6 text-white shadow-[0_18px_45px_rgba(30,64,175,.24)]"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Configuration municipale</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Administration de la plateforme</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">Cet espace est volontairement allégé. Les opérations quotidiennes de gestion des comptes et de consultation des traces disposent désormais de leurs propres menus.</p></section><Card className="border-blue-100 bg-blue-50"><CardContent className="flex gap-3 p-5 text-sm text-blue-950"><Settings2 className="mt-0.5 size-5 shrink-0 text-blue-700" /><p><strong>Organisation simplifiée :</strong> choisissez ci-dessous le domaine à administrer. Chaque espace conserve ses contrôles d’accès côté serveur et sa documentation contextuelle.</p></CardContent></Card><div className="grid gap-5 md:grid-cols-2">{destinations.map(item => <Card key={item.href} className="group border-blue-100 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-700"><item.icon className="size-5" /></span><div><CardTitle className="text-lg">{item.title}</CardTitle><CardDescription className="mt-1 leading-6">{item.text}</CardDescription></div></div></CardHeader><CardContent><Link href={item.href}><Button variant="outline" className="border-blue-200 text-blue-800 hover:bg-blue-50">Ouvrir cet espace <ArrowRight className="ml-2 size-4" /></Button></Link></CardContent></Card>)}</div></div>;
}

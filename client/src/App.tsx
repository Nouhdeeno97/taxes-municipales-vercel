import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { MunicipalityBrandSync } from "@/components/MunicipalityBrandSync";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/Home";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import { PermissionHelpPage } from "@/pages/PermissionHelpPage";
import PlatformSettingsPage from "@/pages/PlatformSettingsPage";
import { AuditLogPage } from "@/pages/AuditLogPage";
import { RolePermissionPage } from "@/pages/RolePermissionPage";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { ActivitiesPage, AdministrationPage, ClosingsPage, DepositsPage, ObligationsPage, PaymentsPage, ReceiptsPage, ReportsPage, SyncPage, TaxationPage, TaxpayersPage, TerritoryPage } from "@/pages/MunicipalPages";
import { Route, Switch } from "wouter";

function ProtectedRoutes() { return <DashboardLayout><Switch><Route path="/" component={Home} /><Route path="/redevables" component={TaxpayersPage} /><Route path="/activites" component={ActivitiesPage} /><Route path="/territoire" component={TerritoryPage} /><Route path="/fiscalite" component={TaxationPage} /><Route path="/obligations" component={ObligationsPage} /><Route path="/encaissement" component={PaymentsPage} /><Route path="/recus" component={ReceiptsPage} /><Route path="/versements" component={DepositsPage} /><Route path="/clotures" component={ClosingsPage} /><Route path="/rapports" component={ReportsPage} /><Route path="/synchronisation" component={SyncPage} /><Route path="/utilisateurs" component={UserManagementPage} /><Route path="/roles-permissions" component={RolePermissionPage} /><Route path="/audit" component={AuditLogPage} /><Route path="/administration" component={AdministrationPage} /><Route path="/parametres" component={PlatformSettingsPage} /><Route path="/aide" component={PermissionHelpPage} /><Route component={NotFound} /></Switch></DashboardLayout>; }

function Router() { return <Switch><Route path="/connexion" component={LoginPage} /><Route component={ProtectedRoutes} /></Switch>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><MunicipalityBrandSync><TooltipProvider><Toaster /><Router /></TooltipProvider></MunicipalityBrandSync></ThemeProvider></ErrorBoundary>; }

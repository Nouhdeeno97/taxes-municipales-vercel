import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export function MunicipalityBrandSync({ children }: { children: React.ReactNode }) {
  const branding = trpc.municipal.branding.useQuery(undefined, { staleTime: 60_000, retry: 1 });

  useEffect(() => {
    const brand = branding.data;
    if (!brand) return;
    const root = document.documentElement;
    root.style.setProperty("--municipality-primary", brand.primaryColor);
    root.style.setProperty("--municipality-primary-soft", `${brand.primaryColor}18`);
    root.dataset.municipalityName = brand.name;
    root.dataset.platformName = brand.platformName;
    root.dataset.municipalityLogo = brand.logoUrl || "";
    const shouldUseDark = brand.appearanceMode === "DARK" || (brand.appearanceMode === "SYSTEM" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", shouldUseDark);
    document.title = brand.platformName;
  }, [branding.data]);

  return <>{children}</>;
}

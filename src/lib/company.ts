import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Company } from "@prisma/client";

const COOKIE_NAME = "active_company_id";

export async function listCompanies() {
  return prisma.company.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getActiveCompanyId(companies: Pick<Company, "id">[]) {
  const cookieStore = await cookies();
  const stored = cookieStore.get(COOKIE_NAME)?.value;
  if (stored && companies.some((c) => c.id === stored)) return stored;
  return companies[0]?.id ?? null;
}

export async function setActiveCompanyCookie(companyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * For pages that show company-scoped data. Redirects to company creation
 * if none exist yet - every other page assumes a company is selected.
 */
export async function requireActiveCompany(): Promise<{
  active: Company;
  companies: Company[];
}> {
  const companies = await listCompanies();
  if (companies.length === 0) {
    redirect("/companies/new?onboarding=1");
  }

  const activeId = await getActiveCompanyId(companies);
  const active = companies.find((c) => c.id === activeId) ?? companies[0];

  return { active, companies };
}

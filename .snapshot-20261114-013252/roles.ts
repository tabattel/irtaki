"use client";

export type UserRole = "owner" | "child";

const ROLES_KEY = "irtaki.roles";

type RolesMap = Record<string, UserRole>;

function readRoles(): RolesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ROLES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRoles(roles: RolesMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
  } catch {}
}

export function getRole(learnerId: string | null | undefined): UserRole {
  if (!learnerId) return "child";
  const roles = readRoles();
  return roles[learnerId] === "owner" ? "owner" : "child";
}

export function setRole(learnerId: string, role: UserRole) {
  const roles = readRoles();
  roles[learnerId] = role;
  writeRoles(roles);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("irtaki:learner-changed"));
  }
}

export function isOwner(learnerId: string | null | undefined): boolean {
  return getRole(learnerId) === "owner";
}

export const ACTIVE_LEARNER_KEY = "irtaki.activeLearnerId";

export function getActiveLearnerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_LEARNER_KEY);
  } catch {
    return null;
  }
}

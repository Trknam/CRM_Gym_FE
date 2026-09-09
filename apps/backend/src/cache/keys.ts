export const cacheKeys = {
  members: (branchScope: string) => `gymcrm:members:${branchScope}`,
  packages: (branchScope: string, status = "all") => `gymcrm:packages:${branchScope}:${status}`,
  trainers: (branchScope: string) => `gymcrm:trainers:${branchScope}`,
  leads: (branchScope: string) => `gymcrm:leads:${branchScope}`,
  checkins: (branchScope: string) => `gymcrm:checkins:${branchScope}`,
  payments: (branchScope: string) => `gymcrm:payments:${branchScope}`,
  exercises: () => `gymcrm:exercises:active`,
  settings: (branchScope: string) => `gymcrm:settings:${branchScope}`,
  crm: (branchScope: string) => `gymcrm:crm:${branchScope}`,
  reports: (branchScope: string) => `gymcrm:reports:${branchScope}`,
  dashboard: (branchScope: string) => `gymcrm:dashboard:${branchScope}`,
};
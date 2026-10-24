export function isSafeSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function generateSafeDoctorSlug(fullName: string, doctorId = ""): string {
  const baseSlug = fullName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!baseSlug) {
    return (doctorId || "doc").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  return baseSlug;
}

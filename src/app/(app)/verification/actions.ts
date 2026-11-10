"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";

export interface VerificationState {
  error?: string;
}

const FILE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const allowedDocs = {
  worker: ["national_id"],
  intern: ["national_id", "student_id", "institution_letter"],
  employer: ["business_registration", "kra_pin"],
} as const;

export async function submitVerificationAction(_prev: VerificationState, formData: FormData): Promise<VerificationState> {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  const profile = ctx.activeProfile;
  const isEmployer = profile.type === "employer";

  const docType = String(formData.get("doc_type") ?? "");
  const docNumber = String(formData.get("doc_number") ?? "").trim().slice(0, 40);
  const contactName = String(formData.get("contact_person_name") ?? "").trim().slice(0, 80);
  const contactPhone = String(formData.get("contact_person_phone") ?? "").trim().slice(0, 20);
  const institution = String(formData.get("institution_name") ?? "").trim().slice(0, 120);
  const file = formData.get("document");

  if (!(allowedDocs[profile.type] as readonly string[]).includes(docType)) return { error: "Choose the document you are sending." };
  if (docNumber.length < 4) return { error: "Enter the number on the document." };
  if (isEmployer && (contactName.length < 2 || contactPhone.length < 9)) {
    return { error: "Enter a contact person and their phone number. We may call to confirm." };
  }
  if (profile.type === "intern" && docType !== "national_id" && institution.length < 2) {
    return { error: "Enter the name of your school or institution." };
  }

  const hasFile = file instanceof File && file.size > 0;
  // Workers and interns must send a photo of the document. For employers it is optional.
  if (!isEmployer && !hasFile) return { error: "Add a clear photo of the document." };

  let documentPath: string | null = null;
  if (hasFile) {
    const ext = FILE_TYPES[file.type];
    if (!ext) return { error: "The file must be a JPG, PNG, WebP or PDF." };
    if (file.size > 5 * 1024 * 1024) return { error: "The file is too big. The limit is 5 MB." };
    documentPath = `${ctx.user.id}/${profile.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await ctx.supabase.storage
      .from("verification-docs")
      .upload(documentPath, file, { contentType: file.type });
    if (uploadError) return { error: "We could not upload the file. Check your connection and try again." };
  }

  const { error } = await ctx.supabase.from("verifications").insert({
    profile_id: profile.id,
    doc_type: docType,
    doc_number: docNumber,
    document_path: documentPath,
    contact_person_name: contactName || null,
    contact_person_phone: contactPhone || null,
    institution_name: institution || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "You already have a request being reviewed." };
    return { error: "We could not send your request. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/verification");
}

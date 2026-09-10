import {
  CLIENT_NOTE_IMAGE_BUCKET,
  type ClientNoteAttachment,
} from "@/lib/client-notes";
import { supabase } from "@/lib/supabase";

export async function attachSignedClientNoteImageUrls(
  attachments: ClientNoteAttachment[],
  expiresInSeconds = 15 * 60
) {
  if (attachments.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(CLIENT_NOTE_IMAGE_BUCKET)
    .createSignedUrls(attachments.map((attachment) => attachment.storage_path), expiresInSeconds);

  if (error) {
    console.error("Client Note image URL error:", error);
    return attachments;
  }

  const signedUrlByPath = new Map(
    (data || []).map((item) => [item.path, item.signedUrl] as const)
  );

  return attachments.map((attachment) => ({
    ...attachment,
    signed_url: signedUrlByPath.get(attachment.storage_path) || undefined,
  }));
}

import { supabase } from "@/lib/supabase";
import {
  createProfileImagePath,
  getProfileImageValidationError,
  PROFILE_IMAGE_BUCKET,
} from "@/lib/profile-image-storage";

export async function uploadProfileImage(file: File, userId: string) {
  const validationError = getProfileImageValidationError(file);
  if (validationError) throw new Error(validationError);

  const storagePath = createProfileImagePath(userId, file.type);
  const { error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
}

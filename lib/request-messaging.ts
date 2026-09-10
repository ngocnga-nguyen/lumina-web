import { supabase } from "@/lib/supabase";
import type { RequestConversationRole } from "@/lib/request-conversations";

type SendRequestMessageInput = {
  requestId: string;
  senderRole: RequestConversationRole;
  recipientId: string;
  message: string;
  image: File | null;
};

export async function sendRequestMessage({
  requestId,
  senderRole,
  recipientId,
  message,
  image,
}: SendRequestMessageInput) {
  let imageUrl: string | null = null;

  if (image) {
    const fileExtension = image.name.split(".").pop();
    const filePath = `${requestId}/${Date.now()}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(filePath, image);

    if (uploadError) throw uploadError;

    imageUrl = supabase.storage.from("chat-images").getPublicUrl(filePath)
      .data.publicUrl;
  }

  const readState =
    senderRole === "client"
      ? { is_read_by_client: true, is_read_by_artist: false }
      : { is_read_by_artist: true, is_read_by_client: false };
  const { error } = await supabase.from("request_updates").insert({
    request_id: requestId,
    sender_type: senderRole,
    message: message || null,
    image_url: imageUrl,
    status: "message",
    ...readState,
  });

  if (error) throw error;

  await supabase.from("notifications").insert({
    user_id: recipientId,
    request_id: requestId,
    title: "New Message",
    message:
      senderRole === "client"
        ? "Your client sent you a message."
        : "Your artist sent you a message.",
  });
}

export async function deleteRequestMessage(messageId: string) {
  return supabase
    .from("request_updates")
    .update({
      is_deleted: true,
      message: null,
      image_url: null,
    })
    .eq("id", messageId);
}

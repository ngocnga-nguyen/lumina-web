"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Camera, CircleUser } from "lucide-react";
import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";
import IdentityAvatar from "@/components/IdentityAvatar";
import MobileManagementSheet from "@/components/MobileManagementSheet";
import ClientSettingsOverview from "@/components/ClientSettingsOverview";
import {
  getProfileImageValidationError,
} from "@/lib/profile-image-storage";
import { uploadProfileImage as uploadProfileImageToStorage } from "@/lib/profile-image-upload";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [savedProfileImageUrl, setSavedProfileImageUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"profile" | "email" | "password" | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || null);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const nextName =
        profile?.full_name || user.user_metadata?.full_name || "";
      const nextProfileImage =
        profile?.avatar_url || user.user_metadata?.avatar_url || "";

      setName(nextName);
      setSavedName(nextName);
      setProfileImageUrl(nextProfileImage);
      setSavedProfileImageUrl(nextProfileImage);
    };

    loadUser();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/");
  };

  const signOutOtherDevices = async () => {
    if (!window.confirm("Sign out of Lumina on all other devices? You will stay signed in here.")) return;
    setSigningOutOthers(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setSigningOutOthers(false);
    if (error) {
      alert(error.message);
      return;
    }
    alert("Other devices have been signed out. You are still signed in on this device.");
  };

  const uploadProfileImage = async (file: File) => {
    const validationError = getProfileImageValidationError(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUploading(true);
    try {
      const { publicUrl } = await uploadProfileImageToStorage(file, user.id);
      setProfileImageUrl(publicUrl);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "The profile image could not be uploaded."
      );
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    const cleanName = name.trim();

    if (!cleanName) {
      alert("Please enter your name.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setSaving(true);
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: cleanName,
        email: user.email,
        avatar_url: profileImageUrl || null,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      setSaving(false);
      alert(profileError.message);
      return;
    }

    const { error: accountError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        full_name: cleanName,
        avatar_url: profileImageUrl || null,
      },
    });

    setSaving(false);

    if (accountError) {
      await supabase
        .from("profiles")
        .update({
          full_name: savedName,
          avatar_url: savedProfileImageUrl || null,
        })
        .eq("id", user.id);
      alert(accountError.message);
      return;
    }

    setName(cleanName);
    setSavedName(cleanName);
    setSavedProfileImageUrl(profileImageUrl);
    setEditing(false);
    setMobileSheet(null);
  };

  const cancelEditing = () => {
    setName(savedName);
    setProfileImageUrl(savedProfileImageUrl);
    setEditing(false);
  };

  const requestEmailChange = async () => {
    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    if (cleanEmail === email?.toLowerCase()) {
      alert("That is already your current email.");
      return;
    }

    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: cleanEmail });
    setChangingEmail(false);

    if (error) {
      alert(error.message);
      return;
    }

    setNewEmail("");
    setShowEmailChange(false);
    setMobileSheet(null);
    alert(
      "Verification sent. Check your inbox and follow the link to finish changing your email."
    );
  };

  const sendPasswordReset = async () => {
    if (!email) return;

    setSendingPasswordReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    setSendingPasswordReset(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password reset link sent. Check your email to continue.");
  };

  return (
    <ClientWorkspaceShell>
      <ClientSettingsOverview
        name={savedName} email={email} imageUrl={savedProfileImageUrl}
        editing={editing} showEmailChange={showEmailChange}
        sendingPasswordReset={sendingPasswordReset} signingOutOthers={signingOutOthers}
        onEditProfileDesktop={() => setEditing(true)}
        onEditProfileMobile={() => { setEditing(true); setMobileSheet("profile"); }}
        onEditEmailDesktop={() => setShowEmailChange(true)}
        onEditEmailMobile={() => setMobileSheet("email")}
        onPasswordDesktop={() => void sendPasswordReset()}
        onPasswordMobile={() => setMobileSheet("password")}
        onSignOutOthers={() => void signOutOtherDevices()}
        onSignOut={() => void signOut()}
        profileEditor={<div className="max-w-[640px]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-blush/60">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={name || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CircleUser size={34} strokeWidth={1.4} />
                )}

                {editing && (
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-lumina-black/45 text-white transition hover:bg-lumina-black/55">
                    <Camera size={20} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadProfileImage(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <p className="text-[14px] font-medium text-lumina-text">
                  Profile photo
                </p>
                <p className="mt-1 text-[12px] text-lumina-text-muted">
                  {uploading ? "Uploading…" : "Shown on requests and notifications"}
                </p>
                {editing && profileImageUrl && (
                  <button
                    type="button"
                    onClick={() => setProfileImageUrl("")}
                    disabled={uploading}
                    className="mt-2 text-[11px] font-medium text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-text disabled:opacity-50"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border border-lumina-border px-4 py-2 text-[12px] text-lumina-text-muted transition hover:border-lumina-text-muted/40 hover:text-lumina-black"
              >
                Edit profile
              </button>
            )}
          </div>

            <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
  Name
</p>

{editing ? (
  <input
    type="text"
    value={name}
    onChange={(event) => setName(event.target.value)}
    className="mb-6 mt-2 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition focus:border-lumina-text-muted"
  />
) : (
  <p className="mb-6 mt-2 text-[15px]">{name || "Not set"}</p>
)}
          {editing && (
            <div className="mt-6 flex justify-end gap-3 border-t border-lumina-border pt-5">
              <button
                onClick={cancelEditing}
                disabled={saving || uploading}
                className="rounded-full border border-lumina-border px-5 py-2.5 text-[13px] text-lumina-text-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveProfile()}
                disabled={saving || uploading}
                className="rounded-full bg-lumina-black px-6 py-2.5 text-[13px] text-white disabled:bg-lumina-pearl"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          )}
          </div>}
        emailEditor={<div className="mt-4 rounded-[16px] border border-lumina-border bg-lumina-surface-soft p-4">
              <label className="text-[12px] text-lumina-text-muted">
                New email address
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
                />
              </label>
              <p className="mt-2 text-[11px] leading-[1.5] text-lumina-text-muted">
                Your current email remains active until the new address is verified.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowEmailChange(false);
                    setNewEmail("");
                  }}
                  disabled={changingEmail}
                  className="rounded-full border border-lumina-border px-4 py-2 text-[12px] text-lumina-text-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void requestEmailChange()}
                  disabled={changingEmail}
                  className="rounded-full bg-lumina-black px-5 py-2 text-[12px] text-white disabled:bg-lumina-pearl"
                >
                  {changingEmail ? "Sending…" : "Send verification"}
                </button>
              </div>
            </div>}
      />
      <MobileManagementSheet open={mobileSheet === "profile"} eyebrow="Client account" title="Edit profile" busy={saving || uploading} onClose={() => { cancelEditing(); setMobileSheet(null); }}>
        <div className="space-y-5 pb-2">
          <div className="flex items-center gap-4">
            <div className="relative h-[72px] w-[72px] shrink-0">
              <IdentityAvatar name={name || email || "Client"} imageUrl={profileImageUrl} className="h-full w-full rounded-full bg-lumina-blush/65" fallbackClassName="font-serif text-[26px]" />
              <label className="absolute inset-0 flex cursor-pointer items-end justify-end" aria-label="Change profile photo">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lumina-black text-white"><Camera size={14} /></span>
                <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProfileImage(file); event.target.value = ""; }} />
              </label>
            </div>
            <div className="min-w-0 text-[12px] text-lumina-text-muted">
              <p>{uploading ? "Uploading…" : "Tap the camera to change your photo."}</p>
              {profileImageUrl && <button type="button" onClick={() => setProfileImageUrl("")} disabled={uploading} className="mt-2 underline underline-offset-4">Remove photo</button>}
            </div>
          </div>
          <label className="block text-[13px] font-medium">Name
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] outline-none focus:border-lumina-text-muted" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { cancelEditing(); setMobileSheet(null); }} disabled={saving || uploading} className="min-h-11 rounded-full border border-lumina-border px-5 text-[13px]">Cancel</button>
            <button type="button" onClick={() => void saveProfile()} disabled={saving || uploading} className="min-h-11 rounded-full bg-lumina-black px-6 text-[13px] text-white disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button>
          </div>
        </div>
      </MobileManagementSheet>
      <MobileManagementSheet open={mobileSheet === "email"} eyebrow="Client account" title="Change email" busy={changingEmail} onClose={() => { setMobileSheet(null); setNewEmail(""); }}>
        <label className="block text-[13px]">New email address
          <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="name@example.com" className="mt-2 w-full rounded-[14px] border border-lumina-border px-4 py-3 text-[15px] outline-none focus:border-lumina-text-muted" />
        </label>
        <p className="mt-2 text-[12px] leading-relaxed text-lumina-text-muted">Your current email remains active until you verify the new address.</p>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setMobileSheet(null); setNewEmail(""); }} className="min-h-11 rounded-full border border-lumina-border px-5 text-[13px]">Cancel</button><button type="button" onClick={() => void requestEmailChange()} disabled={changingEmail} className="min-h-11 rounded-full bg-lumina-black px-5 text-[13px] text-white disabled:opacity-50">{changingEmail ? "Sending…" : "Send verification"}</button></div>
      </MobileManagementSheet>
      <MobileManagementSheet open={mobileSheet === "password"} eyebrow="Client account" title="Password & security" onClose={() => setMobileSheet(null)}>
        <p className="text-[13px] leading-relaxed text-lumina-text-muted">We’ll email a secure link to {email || "your sign-in address"} to change your password.</p>
        <button type="button" onClick={() => void sendPasswordReset()} disabled={sendingPasswordReset || !email} className="mt-5 min-h-11 w-full rounded-full bg-lumina-black px-5 text-[13px] text-white disabled:opacity-50">{sendingPasswordReset ? "Sending…" : "Send reset link"}</button>
      </MobileManagementSheet>


    </ClientWorkspaceShell>
  );
}

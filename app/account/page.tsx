"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Camera, CircleUser } from "lucide-react";
import AccountMenu from "@/components/AccountMenu";

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
        .select("full_name, profile_image_url")
        .eq("id", user.id)
        .maybeSingle();
      const nextName =
        profile?.full_name || user.user_metadata?.full_name || "";
      const nextProfileImage =
        profile?.profile_image_url || user.user_metadata?.avatar_url || "";

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
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image smaller than 5 MB.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUploading(true);
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}-${Date.now()}.${fileExtension}`;
    const { error } = await supabase.storage
      .from("profile-images")
      .upload(fileName, file);

    if (error) {
      setUploading(false);
      alert(error.message);
      return;
    }

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(fileName);

    setProfileImageUrl(data.publicUrl);
    setUploading(false);
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
        profile_image_url: profileImageUrl || null,
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
      alert(accountError.message);
      return;
    }

    setName(cleanName);
    setSavedName(cleanName);
    setSavedProfileImageUrl(profileImageUrl);
    setEditing(false);
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
    <main className="min-h-screen bg-white text-black">
      <header className="grid grid-cols-3 items-center bg-[#faf6f5] px-5 py-5">
        <Link href="/browse" className="text-sm transition hover:opacity-70">
          ← Browse
        </Link>

        <Link href="/" className="justify-self-center font-medium">
          Lumina
        </Link>

        <div className="justify-self-end">
          <AccountMenu />
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 py-12">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#faf6f5]">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={savedName || "Profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              <CircleUser size={28} strokeWidth={1.5} />
            )}
          </div>

          <div>
            <h1
              className="text-[38px] font-semibold leading-tight"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Account
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Manage your Lumina account.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-neutral-200 bg-white p-5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#faf6f5]">
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
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/45 text-white transition hover:bg-black/55">
                    <Camera size={20} />
                    <input
                      type="file"
                      accept="image/*"
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
                <p className="text-[14px] font-medium text-neutral-800">
                  Profile photo
                </p>
                <p className="mt-1 text-[12px] text-neutral-500">
                  {uploading ? "Uploading…" : "Shown on requests and notifications"}
                </p>
              </div>
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-[12px] text-neutral-600 transition hover:border-neutral-300 hover:text-black"
              >
                Edit profile
              </button>
            )}
          </div>

            <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
  Name
</p>

{editing ? (
  <input
    type="text"
    value={name}
    onChange={(event) => setName(event.target.value)}
    className="mb-6 mt-2 w-full rounded-[14px] border border-neutral-200 px-4 py-3 text-[15px] outline-none transition focus:border-neutral-400"
  />
) : (
  <p className="mb-6 mt-2 text-[15px]">{name || "Not set"}</p>
)}
          <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
            Email
          </p>

          <p className="mt-2 text-[15px]">
            {email || "Loading..."}
          </p>

          <p className="mt-2 text-[12px] text-neutral-400">
            Your email is used for sign-in and account recovery.
          </p>

          {!showEmailChange ? (
            <button
              onClick={() => setShowEmailChange(true)}
              className="mt-3 text-[13px] font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition hover:text-black"
            >
              Change email
            </button>
          ) : (
            <div className="mt-4 rounded-[16px] border border-neutral-200 bg-[#faf9f7] p-4">
              <label className="text-[12px] text-neutral-500">
                New email address
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 w-full rounded-[12px] border border-neutral-200 bg-white px-4 py-3 text-[14px] text-black outline-none transition focus:border-neutral-400"
                />
              </label>
              <p className="mt-2 text-[11px] leading-[1.5] text-neutral-400">
                Your current email remains active until the new address is verified.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowEmailChange(false);
                    setNewEmail("");
                  }}
                  disabled={changingEmail}
                  className="rounded-full border border-neutral-200 px-4 py-2 text-[12px] text-neutral-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void requestEmailChange()}
                  disabled={changingEmail}
                  className="rounded-full bg-black px-5 py-2 text-[12px] text-white disabled:bg-neutral-300"
                >
                  {changingEmail ? "Sending…" : "Send verification"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-neutral-100 pt-5">
            <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
              Password
            </p>
            <p className="mt-2 text-[12px] leading-[1.5] text-neutral-500">
              We’ll email a secure link to change your password.
            </p>
            <button
              onClick={() => void sendPasswordReset()}
              disabled={sendingPasswordReset || !email}
              className="mt-3 rounded-full border border-neutral-200 px-4 py-2 text-[12px] text-neutral-600 transition hover:border-neutral-300 hover:text-black disabled:opacity-50"
            >
              {sendingPasswordReset ? "Sending…" : "Change password"}
            </button>
          </div>

          {editing && (
            <div className="mt-6 flex justify-end gap-3 border-t border-neutral-100 pt-5">
              <button
                onClick={cancelEditing}
                disabled={saving || uploading}
                className="rounded-full border border-neutral-200 px-5 py-2.5 text-[13px] text-neutral-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveProfile()}
                disabled={saving || uploading}
                className="rounded-full bg-black px-6 py-2.5 text-[13px] text-white disabled:bg-neutral-300"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <Link
            href="/saved"
            className="rounded-[18px] border border-neutral-200 px-5 py-4 text-sm transition hover:bg-[#faf6f5]"
          >
            Saved Artists
          </Link>

          <Link
            href="/my-requests"
            className="rounded-[18px] border border-neutral-200 px-5 py-4 text-sm transition hover:bg-[#faf6f5]"
          >
            My Requests
          </Link>

          <button
            onClick={() => void signOutOtherDevices()}
            disabled={signingOutOthers}
            className="rounded-[18px] border border-neutral-200 px-5 py-4 text-left text-sm text-neutral-600 transition hover:bg-[#faf6f5] hover:text-black disabled:opacity-50"
          >
            <span className="block">Sign out of other devices</span>
            <span className="mt-1 block text-[11px] text-neutral-400">Keep this device signed in</span>
          </button>

          <button
            onClick={signOut}
            className="rounded-[18px] border border-neutral-200 px-5 py-4 text-left text-sm text-neutral-500 transition hover:bg-[#faf6f5] hover:text-black"
          >
            Sign Out
          </button>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ClientRequest = {
  id: string;
  client_name: string;
  client_contact: string;
  service_requested: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  created_at: string;
};

export default function DashboardRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);

  useEffect(() => {
    const fetchRequests = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!artist) return;

      const { data, error } = await supabase
        .from("client_requests")
        .select("*")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        return;
      }

      setRequests(data || []);
    };

    fetchRequests();
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-5 py-5 text-[15px]">
        <Link href="/dashboard">← Dashboard</Link>
        <Link href="/" className="font-medium">Lumina</Link>
        <div className="w-[80px]" />
      </header>

      <section className="px-5 py-10 md:px-10">
        <h1
          className="text-[44px] leading-[1.02] font-semibold md:text-[64px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Client requests
        </h1>

        <p className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-neutral-600">
          View booking requests and client inquiries sent from your public profile.
        </p>

        <div className="mt-10 space-y-5">
          {requests.length === 0 ? (
            <div className="rounded-[24px] bg-[#fbf4f4] p-6 text-neutral-600">
              No requests yet.
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="rounded-[24px] border border-neutral-200 p-6"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-[22px] font-medium">
                      {request.client_name}
                    </h2>

                    <p className="mt-1 text-[14px] text-neutral-500">
                      {request.client_contact}
                    </p>
                  </div>

                  <p className="text-[13px] text-neutral-400">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-neutral-400">
                      Service
                    </p>
                    <p className="mt-1 text-[15px]">
                      {request.service_requested || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-neutral-400">
                      Date
                    </p>
                    <p className="mt-1 text-[15px]">
                      {request.preferred_date || "Flexible"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-neutral-400">
                      Time
                    </p>
                    <p className="mt-1 text-[15px]">
                      {request.preferred_time || "Flexible"}
                    </p>
                  </div>
                </div>

                {request.notes && (
                  <p className="mt-5 whitespace-pre-line text-[15px] leading-[1.6] text-neutral-700">
                    {request.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
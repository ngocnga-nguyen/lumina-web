"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ClientRequest = {
  id: string;
  created_at: string;
  artist_id: string;
  client_name: string;
  client_contact: string;
  service_requested: string;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  status: string;
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from("client_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        setLoading(false);
        return;
      }

      setRequests(data || []);
      setLoading(false);
    };

    fetchRequests();
  }, []);

  return (
    <main className="min-h-screen bg-lumina-surface text-lumina-text">
      <header className="flex items-center justify-between border-b border-lumina-border bg-lumina-surface px-4 py-5 md:px-10">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div className="hidden md:block">Admin Requests</div>

        <Link href="/browse" className="text-sm transition hover:opacity-70">
          Browse
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8 md:py-14">
        <div className="mb-8">
          <h1
            className="text-[38px] font-semibold leading-[1.05] md:text-[50px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Client Requests
          </h1>

          <p className="mt-3 max-w-[680px] text-[14px] leading-[1.7] text-lumina-text-muted">
            View incoming client requests from artist profiles.
          </p>
        </div>

        {loading && (
          <p className="text-[14px] text-lumina-text-muted">Loading requests...</p>
        )}

        {!loading && requests.length === 0 && (
          <div className="rounded-[24px] border border-lumina-border bg-lumina-surface p-6">
            <h2 className="text-[16px] font-medium">No requests yet</h2>
            <p className="mt-1 text-[14px] leading-[1.55] text-lumina-text-muted">
              Once a client sends a request, it will appear here.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-[24px] border border-lumina-border bg-lumina-surface p-5 md:p-6"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-[20px] font-medium">
                    {request.client_name}
                  </h2>

                  <p className="mt-1 text-[14px] text-lumina-text-muted">
                    Contact: {request.client_contact}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-lumina-pearl px-4 py-2 text-[13px] text-lumina-text-muted">
                  {request.status || "new"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 text-[14px] text-lumina-text md:grid-cols-3">
                <div>
                  <p className="text-lumina-text-muted">Service</p>
                  <p className="mt-1">
                    {request.service_requested || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-lumina-text-muted">Preferred date</p>
                  <p className="mt-1">
                    {request.preferred_date || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-lumina-text-muted">Preferred time</p>
                  <p className="mt-1">
                    {request.preferred_time || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[13px] text-lumina-text-muted">Notes</p>
                <p className="mt-1 text-[15px] leading-[1.6] text-lumina-text">
                  {request.notes || "No notes added."}
                </p>
              </div>

              <p className="mt-5 text-[12px] text-lumina-text-muted">
                Received: {new Date(request.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

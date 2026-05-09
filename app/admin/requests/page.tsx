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
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 md:px-10">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div className="hidden md:block">Admin Requests</div>

        <Link href="/browse" className="text-sm transition hover:opacity-70">
          Browse
        </Link>
      </header>

      <section className="px-4 py-10 md:px-10">
        <div className="mb-8">
          <h1
            className="text-[36px] font-semibold leading-[1.05] md:text-[56px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Client Requests
          </h1>

          <p className="mt-3 text-[15px] text-neutral-600 md:text-[18px]">
            View incoming client requests from artist profiles.
          </p>
        </div>

        {loading && (
          <p className="text-[15px] text-neutral-500">Loading requests...</p>
        )}

        {!loading && requests.length === 0 && (
          <div className="rounded-[20px] bg-[#fbf7f6] p-6">
            <p className="text-[15px] text-neutral-600">
              No requests yet. Once a client sends a request, it will appear here.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-[20px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-[20px] font-medium">
                    {request.client_name}
                  </h2>

                  <p className="mt-1 text-[14px] text-neutral-500">
                    Contact: {request.client_contact}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-[#f3ecea] px-4 py-2 text-[13px] text-neutral-700">
                  {request.status || "new"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 text-[14px] text-neutral-700 md:grid-cols-3">
                <div>
                  <p className="text-neutral-400">Service</p>
                  <p className="mt-1">
                    {request.service_requested || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-400">Preferred Date</p>
                  <p className="mt-1">
                    {request.preferred_date || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-400">Preferred Time</p>
                  <p className="mt-1">
                    {request.preferred_time || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[14px] text-neutral-400">Notes</p>
                <p className="mt-1 text-[15px] leading-[1.6] text-neutral-700">
                  {request.notes || "No notes added."}
                </p>
              </div>

              <p className="mt-5 text-[12px] text-neutral-400">
                Received: {new Date(request.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
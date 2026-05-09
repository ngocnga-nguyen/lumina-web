import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      artistEmail,
      artistName,
      clientName,
      clientContact,
      service,
      date,
      time,
      notes,
    } = body;

    if (!artistEmail) {
      return NextResponse.json(
        { error: "Artist email is missing" },
        { status: 400 }
      );
    }

    const { error } = await resend.emails.send({
      from: "Lumina <onboarding@resend.dev>",
      to: artistEmail,
      subject: `New Lumina request from ${clientName}`,
      html: `
        <h2>New Lumina Request for ${artistName}</h2>
        <p><strong>Client:</strong> ${clientName}</p>
        <p><strong>Contact:</strong> ${clientContact}</p>
        <p><strong>Service:</strong> ${service || "Not specified"}</p>
        <p><strong>Date:</strong> ${date || "Not specified"}</p>
        <p><strong>Time:</strong> ${time || "Not specified"}</p>
        <p><strong>Notes:</strong> ${notes || "None"}</p>
      `,
    });

    if (error) {
      console.log(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
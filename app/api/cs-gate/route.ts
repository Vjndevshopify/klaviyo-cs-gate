import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = body.email;

  // First find the profile ID by email
  const searchRes = await fetch(
    `https://a.klaviyo.com/api/profiles/?filter=equals(email,"${email}")`,
    {
      headers: {
        accept: "application/json",
        revision: "2024-02-15",
        Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`,
      },
    }
  );

  const searchData = await searchRes.json();
  const id = searchData?.data?.[0]?.id;

  if (!id) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const now = new Date();
  const ptFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  });

  const parts = Object.fromEntries(
    ptFormatter.formatToParts(now).map((p) => [p.type, p.value])
  );

  const hour = parseInt(parts.hour);
  const minute = parseInt(parts.minute);
  const weekday = parts.weekday;
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const totalMinutes = hour * 60 + minute;
  const windowOpen = isWeekday && totalMinutes >= 480 && totalMinutes < 975;

  const response = await fetch(
    `https://a.klaviyo.com/api/profiles/${id}/`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
        revision: "2024-02-15",
        "content-type": "application/json",
        Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: "profile",
          id: id,
          attributes: {
            properties: {
              cs_window_open: windowOpen,
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return Response.json({ error: err }, { status: 500 });
  }

  return Response.json({ cs_window_open: windowOpen });
}
import assert from "node:assert/strict";
import test from "node:test";

import type {
  RequestConversationRecord,
  RequestConversationUpdate,
} from "../lib/request-conversations.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

const conversationsModule = import("../lib/request-conversations.ts");

function update(
  overrides: Partial<RequestConversationUpdate> &
    Pick<RequestConversationUpdate, "id" | "request_id" | "created_at">
): RequestConversationUpdate {
  return {
    sender_type: "artist",
    message: null,
    status: "message",
    proposed_date: null,
    proposed_time: null,
    proposed_price: null,
    expected_end_at: null,
    image_url: null,
    is_read_by_client: false,
    is_read_by_artist: true,
    is_deleted: false,
    ...overrides,
  };
}

function request(
  overrides: Partial<RequestConversationRecord> &
    Pick<RequestConversationRecord, "id" | "created_at">
): RequestConversationRecord {
  return {
    client_id: "client",
    artist_id: "artist",
    client_name: "Client",
    artist_name: "Artist",
    artist_image_url: null,
    artist_category: "Nails",
    service_requested: "Gel manicure",
    requested_services: null,
    status: "new",
    client_status: "pending",
    booking_status: "pending",
    client_hidden: false,
    artist_hidden: false,
    participant_name: "Artist",
    participant_business_name: null,
    participant_image_url: null,
    participant_subtitle: "Nails",
    ...overrides,
  };
}

test("unread state is participant-specific and deleted updates do not count", async () => {
  const {
    getRequestConversationUnreadCount,
    markConversationUpdatesRead,
  } = await conversationsModule;
  const history = [
    update({
      id: "artist-unread",
      request_id: "request",
      created_at: "2026-09-09T12:00:00.000Z",
    }),
    update({
      id: "client-unread",
      request_id: "request",
      created_at: "2026-09-09T12:01:00.000Z",
      sender_type: "client",
      is_read_by_client: true,
      is_read_by_artist: false,
    }),
    update({
      id: "deleted",
      request_id: "request",
      created_at: "2026-09-09T12:02:00.000Z",
      is_deleted: true,
    }),
  ];

  assert.equal(getRequestConversationUnreadCount(history, "client"), 1);
  assert.equal(getRequestConversationUnreadCount(history, "artist"), 1);
  assert.equal(
    getRequestConversationUnreadCount(
      markConversationUpdatesRead(history, "client"),
      "client"
    ),
    0
  );
});

test("latest preview skips deleted updates and recognizes images and proposals", async () => {
  const {
    getLatestRequestConversationUpdate,
    getRequestConversationPreview,
  } = await conversationsModule;
  const history = [
    update({
      id: "proposal",
      request_id: "request",
      created_at: "2026-09-09T12:00:00.000Z",
      status: "accepted",
      proposed_date: "2026-09-12",
    }),
    update({
      id: "image",
      request_id: "request",
      created_at: "2026-09-09T12:01:00.000Z",
      image_url: "https://example.com/image.jpg",
    }),
    update({
      id: "deleted",
      request_id: "request",
      created_at: "2026-09-09T12:02:00.000Z",
      message: "Removed",
      is_deleted: true,
    }),
  ];

  assert.equal(getRequestConversationPreview(history[0]), "Proposal update");
  assert.equal(
    getRequestConversationPreview(getLatestRequestConversationUpdate(history)),
    "Image shared"
  );
});

test("filters compose with participant-specific archive state and recency sorting", async () => {
  const { filterRequestConversations } = await conversationsModule;
  const requests = [
    request({ id: "older", created_at: "2026-09-01T12:00:00.000Z" }),
    request({
      id: "archived-client",
      created_at: "2026-09-03T12:00:00.000Z",
      client_hidden: true,
    }),
    request({
      id: "completed",
      created_at: "2026-09-04T12:00:00.000Z",
      booking_status: "completed",
    }),
  ];
  const histories = {
    older: [
      update({
        id: "newest-update",
        request_id: "older",
        created_at: "2026-09-10T12:00:00.000Z",
      }),
    ],
    "archived-client": [],
    completed: [],
  };

  assert.deepEqual(
    filterRequestConversations(requests, histories, "client", "all").map(
      (item) => item.id
    ),
    ["older", "completed"]
  );
  assert.deepEqual(
    filterRequestConversations(requests, histories, "client", "unread").map(
      (item) => item.id
    ),
    ["older"]
  );
  assert.deepEqual(
    filterRequestConversations(requests, histories, "client", "active").map(
      (item) => item.id
    ),
    ["older"]
  );
  assert.deepEqual(
    filterRequestConversations(requests, histories, "client", "archived").map(
      (item) => item.id
    ),
    ["archived-client"]
  );
  assert.equal(
    filterRequestConversations(requests, histories, "artist", "archived").length,
    0
  );
});

test("search composes after visibility and lifecycle filtering", async () => {
  const { filterRequestConversations } = await conversationsModule;
  const requests = [
    request({
      id: "active-match",
      created_at: "2026-09-01T12:00:00.000Z",
      participant_name: "Hong Pham",
      participant_business_name: "Vianne Nails and Spa",
    }),
    request({
      id: "completed-match",
      created_at: "2026-09-02T12:00:00.000Z",
      participant_name: "Hong Pham",
      booking_status: "completed",
    }),
    request({
      id: "archived-match",
      created_at: "2026-09-03T12:00:00.000Z",
      participant_name: "Hong Pham",
      client_hidden: true,
    }),
  ];
  const histories = {
    "active-match": [
      update({
        id: "message",
        request_id: "active-match",
        created_at: "2026-09-10T12:00:00.000Z",
        message: "Would you like chrome details?",
      }),
    ],
    "completed-match": [],
    "archived-match": [],
  };

  assert.deepEqual(
    filterRequestConversations(requests, histories, "client", "active", "vianne").map(
      (item) => item.id
    ),
    ["active-match"]
  );
  assert.deepEqual(
    filterRequestConversations(requests, histories, "client", "all", "chrome").map(
      (item) => item.id
    ),
    ["active-match"]
  );
  assert.deepEqual(
    filterRequestConversations(requests, histories, "client", "archived", "hong").map(
      (item) => item.id
    ),
    ["archived-match"]
  );
});

test("conversation Active follows completed, declined, and participant archive lifecycle", async () => {
  const { filterRequestConversations } = await conversationsModule;
  const updates = {
    lifecycle: [
      update({
        id: "incoming",
        request_id: "lifecycle",
        created_at: "2026-09-10T12:00:00.000Z",
        message: "Latest request message",
        is_read_by_client: false,
      }),
    ],
  };
  const active = request({
    id: "lifecycle",
    created_at: "2026-09-01T12:00:00.000Z",
    participant_name: "Ariana Cole",
  });

  assert.deepEqual(
    filterRequestConversations([active], updates, "client", "active", "ariana").map(
      (item) => item.id
    ),
    ["lifecycle"]
  );

  const completed = request({
    ...active,
    booking_status: "completed",
  });
  assert.equal(
    filterRequestConversations([completed], updates, "client", "active").length,
    0
  );
  assert.deepEqual(
    filterRequestConversations([completed], updates, "client", "all").map(
      (item) => item.id
    ),
    ["lifecycle"]
  );

  const declined = request({ ...active, status: "declined" });
  assert.equal(
    filterRequestConversations([declined], updates, "client", "active").length,
    0
  );
  assert.deepEqual(
    filterRequestConversations([declined], updates, "client", "all", "latest").map(
      (item) => item.id
    ),
    ["lifecycle"]
  );

  const archived = request({ ...active, client_hidden: true });
  assert.equal(
    filterRequestConversations([archived], updates, "client", "all").length,
    0
  );
  assert.deepEqual(
    filterRequestConversations([archived], updates, "client", "archived").map(
      (item) => item.id
    ),
    ["lifecycle"]
  );
  assert.equal(
    filterRequestConversations([archived], updates, "artist", "all").length,
    1
  );
});

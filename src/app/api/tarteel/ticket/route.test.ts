import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserFromRequest: vi.fn(),
  readTarteelTicketSecret: vi.fn(),
  createTarteelTicket: vi.fn(),
}));

vi.mock("@/auth/http/get-authenticated-user", () => ({
  getAuthenticatedUserFromRequest:
    mocks.getAuthenticatedUserFromRequest,
}));

vi.mock("@/auth/tarteel/tarteel-ticket", () => ({
  TARTEEL_ALLOWED_MODES: ["tarteel1", "tarteel2"],
  readTarteelTicketSecret: mocks.readTarteelTicketSecret,
  createTarteelTicket: mocks.createTarteelTicket,
}));

import { POST } from "./route";

const SECRET = Buffer.alloc(32, 7);

function createRequest(
  body: unknown = { mode: "tarteel1" },
  options: {
    origin?: string | null;
    contentType?: string;
    rawBody?: string;
    contentLength?: string;
  } = {},
): Request {
  const headers = new Headers();

  if (options.origin !== null) {
    headers.set(
      "origin",
      options.origin ?? "http://localhost:3000",
    );
  }

  headers.set(
    "content-type",
    options.contentType ?? "application/json",
  );

  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }

  return new Request(
    "http://localhost:3000/api/tarteel/ticket",
    {
      method: "POST",
      headers,
      body: options.rawBody ?? JSON.stringify(body),
    },
  );
}

async function responseJson(response: Response) {
  return response.json();
}

describe("POST /api/tarteel/ticket", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({
      id: "user-test-123",
      email: "user@example.com",
      name: "Test User",
    });

    mocks.readTarteelTicketSecret.mockResolvedValue(SECRET);

    mocks.createTarteelTicket.mockReturnValue({
      ticket: "test.signed.ticket",
      expiresAt: 1_800_000_045,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("issues a ticket to an authenticated user", async () => {
    const request = createRequest({ mode: "tarteel1" });

    const response = await POST(request);
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.ticket).toBe("test.signed.ticket");
    expect(data.expiresAt).toBe(1_800_000_045);

    expect(
      response.headers.get("cache-control"),
    ).toBe("no-store, private");

    expect(
      mocks.getAuthenticatedUserFromRequest,
    ).toHaveBeenCalledWith(request);

    expect(
      mocks.readTarteelTicketSecret,
    ).toHaveBeenCalledOnce();

    expect(
      mocks.createTarteelTicket,
    ).toHaveBeenCalledWith(
      "user-test-123",
      "tarteel1",
      SECRET,
    );
  });

  it("rejects a missing Origin header", async () => {
    const response = await POST(
      createRequest(
        { mode: "tarteel1" },
        { origin: null },
      ),
    );

    expect(response.status).toBe(403);
    expect(await responseJson(response)).toEqual({
      error: "ORIGIN_NOT_ALLOWED",
    });

    expect(
      mocks.getAuthenticatedUserFromRequest,
    ).not.toHaveBeenCalled();
  });

  it("rejects an untrusted Origin", async () => {
    const response = await POST(
      createRequest(
        { mode: "tarteel1" },
        { origin: "https://evil.example" },
      ),
    );

    expect(response.status).toBe(403);
    expect(
      mocks.getAuthenticatedUserFromRequest,
    ).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue(null);

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
    expect(await responseJson(response)).toEqual({
      error: "UNAUTHORIZED",
    });

    expect(
      mocks.readTarteelTicketSecret,
    ).not.toHaveBeenCalled();
  });

  it("rejects an unsupported content type", async () => {
    const response = await POST(
      createRequest(
        { mode: "tarteel1" },
        { contentType: "text/plain" },
      ),
    );

    expect(response.status).toBe(415);
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(
      createRequest(
        {},
        { rawBody: "{invalid-json" },
      ),
    );

    expect(response.status).toBe(400);
    expect(await responseJson(response)).toEqual({
      error: "INVALID_REQUEST_BODY",
    });
  });

  it("rejects an unsupported recognition mode", async () => {
    const response = await POST(
      createRequest({ mode: "unknown" }),
    );

    expect(response.status).toBe(400);
    expect(await responseJson(response)).toEqual({
      error: "INVALID_MODE",
    });

    expect(
      mocks.readTarteelTicketSecret,
    ).not.toHaveBeenCalled();
  });

  it("rejects a request exceeding the body limit", async () => {
    const response = await POST(
      createRequest(
        { mode: "tarteel1" },
        { contentLength: "2048" },
      ),
    );

    expect(response.status).toBe(413);
    expect(await responseJson(response)).toEqual({
      error: "BODY_TOO_LARGE",
    });
  });

  it("does not expose internal errors when secret loading fails", async () => {
    mocks.readTarteelTicketSecret.mockRejectedValue(
      new Error("Internal secret loading failure"),
    );

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    expect(await responseJson(response)).toEqual({
      error: "TICKET_ISSUANCE_FAILED",
    });
  });

  it("supports the second recognition mode", async () => {
    const response = await POST(
      createRequest({ mode: "tarteel2" }),
    );

    expect(response.status).toBe(200);

    expect(
      mocks.createTarteelTicket,
    ).toHaveBeenCalledWith(
      "user-test-123",
      "tarteel2",
      SECRET,
    );
  });
});

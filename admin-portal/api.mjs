export class ApiError extends Error {
  constructor(message, code = "NETWORK_ERROR", status = 0, requestId = "") {
    super(message);
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}
export class AdminApi {
  constructor(config, auth, fetcher = fetch) {
    this.base = config.apiUrl.replace(/\/$/, "");
    this.proxy = config.apiProxyPath === "/api/core" ? config.apiProxyPath : null;
    this.auth = auth;
    this.fetcher = fetcher;
  }
  async accessToken(refresh = false) {
    const result = refresh
      ? await this.auth.refreshSession?.()
      : await this.auth.getSession();
    const session = result?.data?.session;
    if (result?.error || !session?.access_token)
      throw new ApiError(
        "Your session has expired. Sign in again.",
        "UNAUTHORIZED",
        401,
      );
    return session.access_token;
  }
  async request(path, { method = "GET", body, signal, key, version } = {}) {
    if (!path.startsWith("/v1/") || path.includes("://"))
      throw new Error("Only Core API workspace paths are allowed.");
    if (method !== "GET" && !key)
      throw new Error("A request key is required for this action.");
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(
      () => controller.abort(new Error("Request timed out.")),
      20000,
    );
    try {
      let token = await this.accessToken();
      let refreshed = false;
      const attempts = method === "GET" ? 3 : 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const headers = { Authorization: `Bearer ${token}` };
        if (body !== undefined) headers["Content-Type"] = "application/json";
        if (method !== "GET") {
          headers["Idempotency-Key"] = key;
          if (version != null) headers["If-Match"] = String(version);
        }
        let response;
        try {
          response = await this.fetcher(
            this.proxy
              ? `${this.proxy}?path=${encodeURIComponent(path)}`
              : `${this.base}${path}`,
            {
              method,
              headers,
              body: body === undefined ? undefined : JSON.stringify(body),
              signal: controller.signal,
              cache: "no-store",
              credentials: "omit",
              referrerPolicy: "no-referrer",
            },
          );
        } catch {
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (attempt + 1 < attempts) {
            await new Promise((resolve) =>
              setTimeout(resolve, 250 * (attempt + 1)),
            );
            continue;
          }
          throw new ApiError(
            "The service could not be reached. Your work has not been discarded. Retry to check the same request.",
            "NETWORK_ERROR",
          );
        }
        const payload = await response.json().catch(() => null);
        if (response.status === 401 && !refreshed) {
          token = await this.accessToken(true);
          refreshed = true;
          attempt -= 1;
          continue;
        }
        if (
          method === "GET" &&
          [502, 503, 504].includes(response.status) &&
          attempt + 1 < attempts
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, 250 * (attempt + 1)),
          );
          continue;
        }
        if (!response.ok || payload?.success !== true) {
          const fallback =
            response.status === 404
              ? "This admin service or record is not available."
              : "The request could not be completed.";
          throw new ApiError(
            payload?.error?.message || fallback,
            payload?.error?.code || "INVALID_RESPONSE",
            response.status,
            response.headers.get("x-request-id") || "",
          );
        }
        return payload.data;
      }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  list(section, route, signal) {
    const query = new URLSearchParams({ limit: "25", sort: route.sort });
    for (const key of ["q", "status", "cursor"])
      if (route[key]) query.set(key, route[key]);
    return this.request(`/v1/admin/${section}?${query}`, { signal });
  }
  detail(section, id, signal) {
    return this.request(`/v1/admin/${section}/${encodeURIComponent(id)}`, {
      signal,
    });
  }
}

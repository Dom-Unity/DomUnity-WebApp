/**
 * Tests for the auth token storage ("Remember me") behavior in apiService.
 */
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  setUser,
  getUser,
  clearTokens,
  isAuthenticated,
  login,
} from "./apiService";

const TOKEN_KEY = "domunity_access_token";
const REFRESH_TOKEN_KEY = "domunity_refresh_token";
const USER_KEY = "domunity_user";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  jest.restoreAllMocks();
});

describe("token storage with Remember me", () => {
  test("remember=true stores tokens in localStorage only", () => {
    setTokens("acc", "ref", true);
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe("acc");
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("ref");
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getAccessToken()).toBe("acc");
    expect(getRefreshToken()).toBe("ref");
    expect(isAuthenticated()).toBe(true);
  });

  test("remember=false stores tokens in sessionStorage only", () => {
    setTokens("acc", "ref", false);
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe("acc");
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getAccessToken()).toBe("acc");
    expect(isAuthenticated()).toBe(true);
  });

  test("switching from remembered to session-only clears the persistent copy", () => {
    setTokens("old", "oldref", true);
    setTokens("new", "newref", false);
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe("new");
    expect(getAccessToken()).toBe("new");
  });

  test("user object follows the same storage choice", () => {
    setUser({ id: "1", email: "a@b.c" }, false);
    expect(window.sessionStorage.getItem(USER_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(USER_KEY)).toBeNull();
    expect(getUser()).toEqual({ id: "1", email: "a@b.c" });
  });

  test("clearTokens clears both storages", () => {
    setTokens("a", "r", true);
    setUser({ id: "1" }, true);
    setTokens("a2", "r2", false); // also writes session copies
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});

describe("login()", () => {
  const successResponse = {
    success: true,
    access_token: "tok",
    refresh_token: "ref",
    user: { id: "1", email: "x@y.z", role: "user" },
  };

  test("stores session in localStorage when remember=true", async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => successResponse });
    const result = await login("x@y.z", "pass", true);
    expect(result.success).toBe(true);
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe("tok");
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  test("stores session in sessionStorage when remember=false", async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => successResponse });
    await login("x@y.z", "pass", false);
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe("tok");
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  test("does not store anything on a failed login", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, message: "Invalid email or password" }),
    });
    const result = await login("x@y.z", "bad", true);
    expect(result.success).toBe(false);
    expect(getAccessToken()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});

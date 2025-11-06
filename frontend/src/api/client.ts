import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AuthService } from "../gen/api/v1/auth_connect";
import { ContactService } from "../gen/api/v1/contact_connect";
import { OfferService } from "../gen/api/v1/offer_connect";

const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:50051",
  useBinaryFormat: false,
  interceptors: [
    (next) => async (req) => {
      // Add JWT token to requests if available
      const token = localStorage.getItem("access_token");
      if (token) {
        req.header.set("Authorization", `Bearer ${token}`);
      }
      return await next(req);
    },
  ],
});

export const authClient: PromiseClient<typeof AuthService> =
  createPromiseClient(AuthService, transport);

export const contactClient: PromiseClient<typeof ContactService> =
  createPromiseClient(ContactService, transport);

export const offerClient: PromiseClient<typeof OfferService> =
  createPromiseClient(OfferService, transport);

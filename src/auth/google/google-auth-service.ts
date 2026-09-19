import { AccountRepository, UserRepository } from "@irtaki/persistence";

import { normalizeEmail } from "../email/normalize-email";
import { SessionService } from "../session/session-service";

type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export class GoogleAuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly accountRepository = new AccountRepository(),
    private readonly sessionService = new SessionService(),
  ) {}

  getAuthorizationUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async authenticate(code: string): Promise<{
    user: {
      id: string;
      email: string;
      name: string | null;
    };
    token: string;
  }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("GOOGLE_TOKEN_EXCHANGE_FAILED");
    }

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

    const userInfoResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      throw new Error("GOOGLE_USERINFO_FAILED");
    }

    const googleUser = (await userInfoResponse.json()) as GoogleUserInfo;

    if (!googleUser.email || !googleUser.email_verified) {
      throw new Error("GOOGLE_EMAIL_NOT_VERIFIED");
    }

    const email = normalizeEmail(googleUser.email);

    const existingGoogleAccount =
      await this.accountRepository.findGoogleByAccountId(googleUser.sub);

    let user;

    if (existingGoogleAccount) {
      user = await this.userRepository.findById(existingGoogleAccount.userId);
    } else {
      user = await this.userRepository.findByEmail(email);

      if (!user) {
        user = await this.userRepository.create({
          email,
          name: googleUser.name,
        });
      }

      await this.accountRepository.createGoogleAccount({
        userId: user.id,
        providerAccountId: googleUser.sub,
      });
    }

    if (!user) {
      throw new Error("GOOGLE_USER_NOT_FOUND");
    }

    const session = await this.sessionService.createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token: session.token,
    };
  }
}

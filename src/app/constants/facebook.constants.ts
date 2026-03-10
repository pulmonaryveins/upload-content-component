import { environment } from '../../environments/environment';

// App ID is a public OAuth identifier — safe to ship in the frontend bundle.
export const FACEBOOK_APP_ID = environment.facebook.appId;

/** Graph API version used for all FB.api() calls */
export const FACEBOOK_API_VERSION = 'v19.0';

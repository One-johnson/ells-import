/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as backfill from "../backfill.js";
import type * as cart from "../cart.js";
import type * as categories from "../categories.js";
import type * as conversations from "../conversations.js";
import type * as files from "../files.js";
import type * as invoiceShares from "../invoiceShares.js";
import type * as lib_appSettings from "../lib/appSettings.js";
import type * as lib_deleteUser from "../lib/deleteUser.js";
import type * as lib_heroSlides from "../lib/heroSlides.js";
import type * as lib_invoiceNumber from "../lib/invoiceNumber.js";
import type * as lib_orderStatusNotification from "../lib/orderStatusNotification.js";
import type * as lib_orderTotals from "../lib/orderTotals.js";
import type * as lib_publicCode from "../lib/publicCode.js";
import type * as lib_publicUser from "../lib/publicUser.js";
import type * as lib_recordPayment from "../lib/recordPayment.js";
import type * as lib_sessionAuth from "../lib/sessionAuth.js";
import type * as lib_storefrontDefaults from "../lib/storefrontDefaults.js";
import type * as lib_userAvatar from "../lib/userAvatar.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as orderItems from "../orderItems.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as productAi from "../productAi.js";
import type * as products from "../products.js";
import type * as reviews from "../reviews.js";
import type * as settings from "../settings.js";
import type * as stats from "../stats.js";
import type * as users from "../users.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  backfill: typeof backfill;
  cart: typeof cart;
  categories: typeof categories;
  conversations: typeof conversations;
  files: typeof files;
  invoiceShares: typeof invoiceShares;
  "lib/appSettings": typeof lib_appSettings;
  "lib/deleteUser": typeof lib_deleteUser;
  "lib/heroSlides": typeof lib_heroSlides;
  "lib/invoiceNumber": typeof lib_invoiceNumber;
  "lib/orderStatusNotification": typeof lib_orderStatusNotification;
  "lib/orderTotals": typeof lib_orderTotals;
  "lib/publicCode": typeof lib_publicCode;
  "lib/publicUser": typeof lib_publicUser;
  "lib/recordPayment": typeof lib_recordPayment;
  "lib/sessionAuth": typeof lib_sessionAuth;
  "lib/storefrontDefaults": typeof lib_storefrontDefaults;
  "lib/userAvatar": typeof lib_userAvatar;
  messages: typeof messages;
  notifications: typeof notifications;
  orderItems: typeof orderItems;
  orders: typeof orders;
  payments: typeof payments;
  productAi: typeof productAi;
  products: typeof products;
  reviews: typeof reviews;
  settings: typeof settings;
  stats: typeof stats;
  users: typeof users;
  wishlist: typeof wishlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

/**
 * app/page.tsx  — Server Component raíz
 *
 * Lee la sesión del servidor y la pasa al Header.
 * El middleware ya garantiza que solo usuarios autenticados llegan aquí.
 */

import { getSession } from "../lib/auth/session";
import HomeClient from "./home-client";

export default async function HomePage() {
  const session = await getSession();
  return <HomeClient session={session} />;
}

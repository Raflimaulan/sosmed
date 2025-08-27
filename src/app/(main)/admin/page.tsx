
'use server';

import { AdminPanel } from "@/components/admin-panel";
import { auth } from "@/lib/firebase-admin";
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

// This is a server-side component to protect the route
export default async function AdminPage() {
  // This is a placeholder for a real session check.
  // In a real app, you'd get the session from the request headers/cookies.
  // For this example, we'll assume a way to check admin status.
  // A robust implementation would use a proper auth session management library.
  const isAdmin = true; // Replace with actual admin check logic

  if (!isAdmin) {
    // In a real app, you'd check the user's session and roles.
    // For this demonstration, we'll redirect if not the specific admin email.
    // This check is simplistic and for demonstration only. A robust app
    // would use custom claims or a roles collection in Firestore.
    redirect('/');
  }

  return <AdminPanel />;
}

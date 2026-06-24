'use client';

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const authed = localStorage.getItem('bobanest_admin_auth') === '1';
    if (!authed) {
      router.push('/admin/login');
      setIsAuthed(false);
    } else {
      setIsAuthed(true);
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  return isAuthed ? children : null;
}
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminEmployeeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/employees');
  }, [router]);

  return null;
}

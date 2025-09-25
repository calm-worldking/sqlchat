'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearTemplatesPage() {
  const router = useRouter();

  useEffect(() => {
    // Очищаем localStorage
    localStorage.removeItem('reportTemplates');
    console.log('localStorage очищен');
    
    // Перенаправляем обратно на главную страницу
    setTimeout(() => {
      router.push('/');
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Очистка шаблонов
        </h1>
        <p className="text-gray-600 mb-4">
          localStorage очищен. Перенаправление на главную страницу...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  );
}

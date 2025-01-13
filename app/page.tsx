'use client';

import FileUploader from '@/components/ui/FileUploader';
import FileList from '@/components/ui/FileList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Secure File Storage
        </h1>
        <FileUploader />
        <FileList />
      </div>
    </main>
  );
}
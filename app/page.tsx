'use client';

import { FileUploader } from '@/components/ui/FileUploader';
import  FileList from "@/components/ui/FileList";

export default function Home() {
  return (
    <main className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold mb-8">Encrypted File Storage</h1>
      <FileUploader />
      <FileList />
    </main>
  );
}
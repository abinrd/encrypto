import React, { useState } from 'react';
import { FileIcon, DownloadIcon, TrashIcon, LoaderIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { formatFileSize, formatDate } from '@/lib/utils';
import CryptoJS from 'crypto-js';

const FileList = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [downloadPassword, setDownloadPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [operatingFiles, setOperatingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const addOperatingFile = (fileId: string) => {
    setOperatingFiles(prev => new Set(prev).add(fileId));
  };

  const removeOperatingFile = (fileId: string) => {
    setOperatingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .storage
        .from('encrypted-files')
        .list();

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to fetch files. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!downloadPassword) {
      setError('Please enter the decryption password');
      return;
    }

    try {
      addOperatingFile(fileName);
      setError(null);

      const { data, error } = await supabase
        .storage
        .from('encrypted-files')
        .download(fileName);

      if (error) throw error;

      const encryptedText = await data.text();

      try {
        const decrypted = CryptoJS.AES.decrypt(encryptedText, downloadPassword).toString(CryptoJS.enc.Utf8);
        const originalContent = atob(decrypted);

        const blob = new Blob([new Uint8Array([...originalContent].map(char => char.charCodeAt(0)))]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('.encrypted', '');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (decryptError) {
        setError('Incorrect password or corrupted file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file. Please try again.');
    } finally {
      removeOperatingFile(fileName);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      addOperatingFile(fileName);
      setError(null);

      const { error } = await supabase
        .storage
        .from('encrypted-files')
        .remove([fileName]);

      if (error) throw error;
      
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file. Please try again.');
    } finally {
      removeOperatingFile(fileName);
    }
  };

  React.useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Your Files
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFiles}
            disabled={loading}
          >
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <input
              type="password"
              placeholder="Enter decryption password"
              className="w-full p-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={downloadPassword}
              onChange={(e) => setDownloadPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoaderIcon className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No files uploaded yet
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileIcon className="w-5 h-5 flex-shrink-0 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name.replace('.encrypted', '')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.metadata?.size || 0)} • {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file.name)}
                      disabled={operatingFiles.has(file.name)}
                    >
                      {operatingFiles.has(file.name) ? (
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <DownloadIcon className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(file.name)}
                      disabled={operatingFiles.has(file.name)}
                    >
                      {operatingFiles.has(file.name) ? (
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileList;
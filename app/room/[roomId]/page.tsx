import { Suspense } from 'react';
import RoomClient from '@/components/RoomClient';

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-corp-gray-100 dark:bg-corp-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corp-blue-light mx-auto mb-4" />
        <p className="text-corp-gray-700 dark:text-corp-gray-300">読み込み中...</p>
      </div>
    </div>
  );
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <RoomClient roomId={roomId} />
    </Suspense>
  );
}

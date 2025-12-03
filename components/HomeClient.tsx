'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CommentIcon } from './Icons';

export default function HomeClient() {
  const [roomName, setRoomName] = useState('');
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRooms = localStorage.getItem('recentRooms');
      if (storedRooms) {
        setRecentRooms(JSON.parse(storedRooms));
      }
    }
  }, []);

  const saveRoomToLocalStorage = (room: string) => {
    let updatedRooms = [room, ...recentRooms.filter((r) => r !== room)];
    updatedRooms = updatedRooms.slice(0, 5);
    setRecentRooms(updatedRooms);
    localStorage.setItem('recentRooms', JSON.stringify(updatedRooms));
  };

  const navigateToRoom = (room: string, isNewRoom: boolean = false) => {
    saveRoomToLocalStorage(room);
    const allowHomeKey = `allowHomeNavigation:${room}`;
    sessionStorage.setItem(allowHomeKey, 'true');

    // 新規ルーム作成時はホストモードで入室
    if (isNewRoom) {
      const hostParams = new URLSearchParams({ host: '1' });
      router.push(`/room/${encodeURIComponent(room)}?${hostParams.toString()}`);
    } else {
      router.push(`/room/${encodeURIComponent(room)}`);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRoom = roomName.trim();
    if (trimmedRoom) {
      // ルーム名を入力して作成・参加する場合は新規作成として扱う
      navigateToRoom(trimmedRoom, true);
    }
  };

  const handleSelectRecentRoom = (room: string) => {
    navigateToRoom(room);
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-corp-gray-100 dark:bg-corp-gray-900 p-4"
      style={{ minHeight: '100dvh' }}
    >
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-corp-gray-800 shadow-2xl rounded-2xl p-8 transform transition-all hover:scale-105 duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-corp-blue-light text-white rounded-full p-4 mb-6">
              <CommentIcon className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-corp-gray-800 dark:text-white mb-2">
              匿名ディスカッション
            </h1>
            <p className="text-corp-gray-700 dark:text-corp-gray-300 mb-8">
              研修の疑問や意見をリアルタイムで共有しましょう。
            </p>
          </div>
          <form onSubmit={handleJoinRoom}>
            <div className="mb-6">
              <label
                htmlFor="roomName"
                className="block text-sm font-medium text-corp-gray-700 dark:text-corp-gray-300 mb-2"
              >
                ルーム名
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="例: 「新人研修DAY1」"
                className="w-full px-4 py-3 bg-corp-gray-100 dark:bg-corp-gray-700 border-2 border-transparent focus:border-corp-blue-light focus:ring-0 rounded-lg text-corp-gray-800 dark:text-white transition"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-corp-blue-light hover:bg-corp-blue text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corp-blue-light"
            >
              ルームを作成 / 参加
            </button>
          </form>

          {recentRooms.length > 0 && (
            <div className="mt-8 pt-8 border-t border-corp-gray-200 dark:border-corp-gray-700">
              <h2 className="text-xl font-bold text-corp-gray-800 dark:text-white mb-4">
                最近のルーム
              </h2>
              <div className="space-y-3">
                {recentRooms.map((room) => (
                  <button
                    key={room}
                    onClick={() => handleSelectRecentRoom(room)}
                    className="w-full text-left bg-corp-gray-100 dark:bg-corp-gray-700 hover:bg-corp-gray-200 dark:hover:bg-corp-gray-600 px-4 py-3 rounded-lg text-corp-gray-800 dark:text-white transition-colors duration-200"
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <footer className="text-center mt-8 text-sm text-corp-gray-700 dark:text-corp-gray-300">
          <p>&copy; {new Date().getFullYear()} 匿名リアルタイムチャット. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  return (
    <ProtectedRoute requirePro={true}>
      <ChatContent />
    </ProtectedRoute>
  );
}

function ChatContent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadChatHistory() {
    if (!user) return;

      try {
        const messagesCollection = collection(db, 'chatHistory', user.uid, 'messages');
        const q = query(messagesCollection, where('userId', '==', user.uid), orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);
        const chatMessages = snapshot.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Message, 'id'>),
            } as Message)
        );
        setMessages(chatMessages);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const chat = httpsCallable(functions, 'chat');
      const conversationHistory = [...messages.slice(-10), userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await chat({
        message: userMessage.content,
        conversationHistory,
      });

      const data = result.data as { success: boolean; response: string };
      if (!data.success) {
        throw new Error('Chat failed');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const code = error?.code as string | undefined;
      if (code && code.includes('permission-denied')) {
        setError('AI chat is a Pro-only feature. Upgrade your plan to continue.');
      } else if (code && code.includes('unauthenticated')) {
        setError('You must be signed in to use chat.');
      } else {
        setError('Failed to send message. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-8 flex flex-col max-w-4xl">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-orange-900 font-medium">
            💬 AI Cooking Assistant - Ask me anything about cooking, recipes, substitutions, or techniques!
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 bg-white rounded-lg shadow p-6 mb-4 overflow-y-auto" style={{ minHeight: '500px' }}>
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="text-6xl mb-4">👨‍🍳</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a conversation</h3>
                <p className="text-gray-600">
                  Ask me about cooking techniques, recipe ideas, ingredient substitutions, and more!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-orange-200' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="bg-white rounded-lg shadow p-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about cooking..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

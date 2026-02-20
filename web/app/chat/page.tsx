'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect, useRef } from 'react';
import { getChatHistory } from '@/lib/db';
import { callApi } from '@/lib/api';

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
        const chatMessages = await getChatHistory(user.id);
        const mappedMessages = chatMessages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.created_at,
        } as Message));
        setMessages(mappedMessages);
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
      const conversationHistory = [...messages.slice(-10), userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await callApi('/ai/chat', {
        messages: conversationHistory,
        context: {},
      });

      const data = result as { success: boolean; message: string };
      if (!data.success) {
        throw new Error('Chat failed');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
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
    <div className="min-h-screen flex flex-col" style={{ background: '#000000' }}>
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 pt-24 pb-8 flex flex-col max-w-4xl">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-orange-900 font-medium">
            💬 AI Cooking Assistant - Ask me anything about cooking, recipes, substitutions, or techniques!
          </p>
        </div>

        {error && (
          <div className="border-red-500/20 bg-red-500/10 border text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 glass-card rounded-lg shadow p-6 mb-4 overflow-y-auto" style={{ minHeight: '500px' }}>
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="text-6xl mb-4">👨‍🍳</div>
                <h3 className="text-xl font-semibold text-white mb-2">Start a conversation</h3>
                <p className="text-[#9ca3c2]">
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
                        ? 'bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold'
                        : 'bg-white/5 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-black/60' : 'text-[#9ca3c2]'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-[#9ca3c2] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#9ca3c2] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-[#9ca3c2] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="glass-card rounded-lg shadow p-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about cooking..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-white/6 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d4ff] disabled:bg-white/5 bg-white/5 text-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

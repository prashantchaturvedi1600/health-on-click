import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Check,
  CheckCheck,
  Calendar,
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import { Conversation, Message } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ChatViewProps {
  initialRecipientId?: string | null;
  onFindDoctor?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ initialRecipientId, onFindDoctor }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async (autoSelectId?: string) => {
    try {
      setErrorMsg(null);
      const res = await api.getConversations();
      const list = res.conversations || [];
      setConversations(list);

      if (autoSelectId) {
        const found = list.find(c => c.patient_id === autoSelectId || c.doctor_id === autoSelectId);
        if (found) {
          setActiveConv(found);
          return;
        }
      }

      if (!activeConv && list.length > 0) {
        setActiveConv(list[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch conversations.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await api.getMessages(convId);
      setMessages(res.messages || []);
      scrollToBottom();
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations(initialRecipientId || undefined);
  }, [initialRecipientId]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      const interval = setInterval(() => {
        fetchMessages(activeConv.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeConv]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const trimmed = inputMessage.trim();
    setInputMessage('');

    try {
      setIsSending(true);
      await api.sendMessage({
        conversationId: activeConv?.id,
        recipientId: activeConv ? undefined : initialRecipientId || undefined,
        messageText: trimmed,
      });

      if (activeConv) {
        await fetchMessages(activeConv.id);
      } else {
        await fetchConversations();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      setInputMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-[calc(100vh-14rem)] min-h-[500px] flex flex-col md:flex-row">
      {/* Left Sidebar: Conversations List */}
      <div className="w-full md:w-80 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">Clinical Messages</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            End-to-end authorized medical chat
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-700">No active conversations</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Chat is enabled when an appointment request is placed between patient and doctor.
              </p>
              {user?.role === 'patient' && onFindDoctor && (
                <button
                  onClick={onFindDoctor}
                  className="mt-2 py-1.5 px-3 bg-teal-600 text-white rounded-lg text-xs font-medium"
                >
                  Book Doctor
                </button>
              )}
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                  activeConv?.id === conv.id
                    ? 'bg-teal-50/80 border-l-4 border-teal-600'
                    : 'hover:bg-slate-100/70'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {conv.other_user_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {conv.other_user_role === 'doctor' ? `Dr. ${conv.other_user_name}` : conv.other_user_name}
                    </h4>
                    {conv.last_message_at && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {conv.last_message_text || 'Start conversation...'}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/30">
        {activeConv ? (
          <>
            {/* Active Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                  {activeConv.other_user_name?.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {activeConv.other_user_role === 'doctor' ? `Dr. ${activeConv.other_user_name}` : activeConv.other_user_name}
                  </h4>
                  <div className="text-[11px] text-teal-700 font-medium">
                    {activeConv.other_user_role === 'doctor'
                      ? activeConv.other_user_sub || 'Verified Specialist'
                      : 'Registered Patient'}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-medium text-slate-600">Conversation started</p>
                  <p>Send a message below to discuss appointment details or medical history.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? 'bg-teal-600 text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                        }`}
                      >
                        {msg.message_text}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span>
                            {msg.is_read ? (
                              <CheckCheck className="w-3 h-3 text-teal-600" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-slate-400">
            Select a conversation on the left to begin messaging.
          </div>
        )}
      </div>
    </div>
  );
};

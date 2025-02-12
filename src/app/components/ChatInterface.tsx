"use client";

import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

type Chat = {
  id: string;
  preview: string;
  timestamp: Date;
  messages: Message[];
};

type DeleteModalProps = {
  isOpen: boolean;
  chatToDelete: Chat | null;
  onConfirm: () => void;
  onCancel: () => void;
};

function DeleteModal({ isOpen, chatToDelete, onConfirm, onCancel }: DeleteModalProps) {
  if (!isOpen || !chatToDelete) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-black text-lg font-semibold mb-4">Delete Chat</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want delete <strong>{chatToDelete.preview}</strong>? You cant undo this action.
        </p>
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const FormattedDate = ({ date }: { date: Date }) => {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    setFormattedDate(date.toLocaleDateString());
  }, [date]);

  return <span>{formattedDate}</span>;
};

const FormattedTime = ({ date }: { date: Date }) => {
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    setFormattedTime(date.toLocaleTimeString());
  }, [date]);

  return <span>{formattedTime}</span>;
};

export default function ChatInterface() {
  const [currentChat, setCurrentChat] = useState<Chat>({
    id: '',
    preview: 'New Chat',
    timestamp: new Date(),
    messages: []
  });
  const [pastChats, setPastChats] = useState<Chat[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);

  useEffect(() => {
    setCurrentChat(prev => ({
      ...prev,
      id: uuidv4() // Gera o ID apenas no cliente
    }));
  }, []);

  const startNewChat = () => {
    if (currentChat.messages.length > 0) {
      setPastChats(prev => [currentChat, ...prev]);
    }
    setCurrentChat({
      id: uuidv4(),
      preview: 'New Chat',
      timestamp: new Date(),
      messages: []
    });
  };

  const loadChat = (chat: Chat) => {
    if (currentChat.messages.length > 0) {
      setPastChats(prev => [currentChat, ...prev.filter(c => c.id !== chat.id)]);
    }
    setCurrentChat(chat);
  };

  const handleDelete = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(chat);
  };

  const confirmDelete = () => {
    if (chatToDelete) {
      setPastChats(prev => prev.filter(chat => chat.id !== chatToDelete.id));
      setChatToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    const updatedChat = {
      ...currentChat,
      preview: inputText,
      messages: [...currentChat.messages, userMessage]
    };
    setCurrentChat(updatedChat);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => {
      const aiMessage: Message = {
        id: uuidv4(),
        text: "Hello! I'm a simple AI assistant. I can help you with basic tasks and answer questions.",
        sender: 'ai',
        timestamp: new Date()
      };
      setCurrentChat(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage]
      }));
      setIsLoading(false);
    }, 1000);
  };

  return (
    <main className="flex min-h-screen">
      <DeleteModal
        isOpen={chatToDelete !== null}
        chatToDelete={chatToDelete}
        onConfirm={confirmDelete}
        onCancel={() => setChatToDelete(null)}
      />

      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <button
          onClick={startNewChat}
          className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          New Chat
        </button>
        
        <div className="space-y-2">
          {[currentChat, ...pastChats].map((chat) => (
            <div
              key={chat.id}
              className={`group relative rounded-lg text-black ${
                chat.id === currentChat.id
                  ? 'bg-blue-100'
                  : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => chat.id !== currentChat.id && loadChat(chat)}
                className="w-full p-3 text-left"
              >
                <div className="text-sm font-medium truncate">{chat.preview}</div>
                <div className="text-xs text-gray-500">
                  <FormattedDate date={chat.timestamp} />
                </div>
              </button>
              {chat.id !== currentChat.id && (
                <button
                  onClick={(e) => handleDelete(chat, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">AI Assistant</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChat.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <div>{message.text}</div>
                <div className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <FormattedTime date={message.timestamp} />
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800 rounded-bl-none">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="text-black flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`
                px-4 py-2 bg-blue-500 text-white rounded-lg
                hover:bg-blue-600 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              `}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
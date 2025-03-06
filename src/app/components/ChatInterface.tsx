"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';

// Defina um tipo para os dados retornados pela API
type Inseminacao = {
  id: number;
  FAZENDA: string;
  ESTADO: string;
  MUNICÍPIO: string;
  "Nº ANIMAL": number;
  LOTE: string;
  RAÇA: string;
  CATEGORIA: string;
  ECC: number;
  CICLICIDADE: number;
  PROTOCOLO: string;
  "IMPLANTE P4": string;
  EMPRESA: string;
  "GnRH NA IA": number;
  "PGF NO D0": number;
  "Dose PGF retirada": string;
  "Marca PGF retirada": string;
  "Dose CE": string;
  eCG: string;
  "DOSE eCG": string;
  TOURO: string;
  "RAÇA TOURO": string;
  "EMPRESA TOURO": string;
  INSEMINADOR: string;
  "Nº da IATF": string;
  DG: number;
  "VAZIA COM OU SEM CL": number;
  PERDA: number;
};

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
  userName?: string; // Adicionado campo para nome do usuário
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
          Tem certeza que deseja deletar <strong>{chatToDelete.preview}</strong>? Você não pode reverter esta ação.
        </p>
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Deletar
          </button>
        </div>
      </div>
    </div>
  );
}

const generateId = (() => {
  let counter = 0;
  return () => {
    const timestamp = Date.now().toString(36);
    const uniquePart = (counter++).toString(36);
    return `${timestamp}-${uniquePart}`;
  };
})();

const FormattedDate = ({ date }: { date: Date }) => {
  return <span>{date.toLocaleDateString('pt-BR')}</span>;
};

const FormattedTime = ({ date }: { date: Date }) => {
  return <span>{date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })}</span>;
};

// Função para detectar o nome do usuário em uma mensagem
const extractUserName = (message: string): string | null => {
  const patterns = [
    /(?:me\s+chamo|meu\s+nome\s+(?:é|e)|sou\s+(?:o|a))\s+([A-Z][a-zÀ-ú]+)/i,
    /(?:pode\s+me\s+chamar\s+de)\s+([A-Z][a-zÀ-ú]+)/i,
    /(?:meu\s+nome\s+(?:é|e))\s+([A-Z][a-zÀ-ú]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

export default function ChatInterface() {
  const [currentChat, setCurrentChat] = useState<Chat>({
    id: generateId(),
    preview: 'Novo Chat',
    timestamp: new Date(),
    messages: []
  });
  const [pastChats, setPastChats] = useState<Chat[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');

  // Carregar o nome do usuário do localStorage quando o componente é montado
  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startNewChat = () => {
    if (currentChat.messages.length > 0) {
      setPastChats(prev => {
        if (!prev.some(chat => chat.id === currentChat.id)) {
          return [currentChat, ...prev];
        }
        return prev;
      });
    }

    const newChat = {
      id: generateId(),
      preview: 'Novo Chat',
      timestamp: new Date(),
      messages: [],
      userName: userName // Manter o nome do usuário no novo chat
    };

    setCurrentChat(newChat);
    setIsSidebarOpen(false);
  };

  const loadChat = (chat: Chat) => {
    if (currentChat.messages.length > 0 && !pastChats.some(c => c.id === currentChat.id)) {
      setPastChats(prev => [currentChat, ...prev.filter(c => c.id !== chat.id)]);
    }
    setCurrentChat(chat);
    setIsSidebarOpen(false);
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

    // Verificar se o usuário está se apresentando e extrair nome
    const detectedName = extractUserName(inputText);
    if (detectedName) {
      setUserName(detectedName);
      localStorage.setItem('userName', detectedName);
      console.log('Nome do usuário salvo:', detectedName);
    }

    const userMessage: Message = {
      id: generateId(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    const updatedChat = {
      ...currentChat,
      preview: inputText,
      messages: [...currentChat.messages, userMessage],
      userName: detectedName || userName // Atualizar o nome no chat se for detectado
    };

    setCurrentChat(updatedChat);
    setInputText('');
    setIsLoading(true);

    try {
      // Usar o nome do usuário atual ou o recém-detectado
      const currentName = detectedName || userName;
      
      // Envia o histórico da conversa junto com a mensagem e o nome do usuário
      const response = await axios.post('http://localhost:8000/chat', {
        message: inputText,
        context: currentChat.messages.map(msg => ({ role: msg.sender, content: msg.text })),
        user_name: currentName // Envia o nome do usuário para o backend
      });

      console.log('Resposta:', response.data);

      // Verifica se temos uma resposta do tipo { response: string, data: any[] }
      if (response.data.response) {
        const aiMessage: Message = {
          id: generateId(),
          text: response.data.response,
          sender: 'ai',
          timestamp: new Date()
        };

        setCurrentChat(prev => ({
          ...prev,
          messages: [...prev.messages, aiMessage]
        }));
      } else if (Array.isArray(response.data)) {
        // Se for array direto, formata os dados (compatibilidade)
        const formattedResponse = response.data
          .map((item: Inseminacao) => {
            return `
              Fazenda: ${item.FAZENDA},
              Estado: ${item.ESTADO},
              Município: ${item.MUNICÍPIO},
              Nº Animal: ${item["Nº ANIMAL"]},
              Raça: ${item.RAÇA},
              Categoria: ${item.CATEGORIA},
              ECC: ${item.ECC},
              Protocolo: ${item.PROTOCOLO},
              Inseminador: ${item.INSEMINADOR},
              Perda: ${item.PERDA === 1 ? "Sim" : "Não"}
            `;
          })
          .join("\n\n");
        
        const aiMessage: Message = {
          id: generateId(),
          text: formattedResponse,
          sender: 'ai',
          timestamp: new Date()
        };

        setCurrentChat(prev => ({
          ...prev,
          messages: [...prev.messages, aiMessage]
        }));
      } else {
        // Fallback para objetos desconhecidos
        const aiMessage: Message = {
          id: generateId(),
          text: "Recebi sua mensagem, mas não sei como processar a resposta.",
          sender: 'ai',
          timestamp: new Date()
        };

        setCurrentChat(prev => ({
          ...prev,
          messages: [...prev.messages, aiMessage]
        }));
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      const errorMessage: Message = {
        id: generateId(),
        text: "Desculpe, houve um erro ao conectar com o servidor.",
        sender: 'ai',
        timestamp: new Date()
      };

      setCurrentChat(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen">
      <DeleteModal
        isOpen={chatToDelete !== null}
        chatToDelete={chatToDelete}
        onConfirm={confirmDelete}
        onCancel={() => setChatToDelete(null)}
      />

      {/* Overlay para mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Barra lateral */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 w-64 bg-gray-50 border-r border-gray-200 p-4 transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } z-40`}
      >
        <button
          onClick={startNewChat}
          className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Novo Chat
        </button>

        {userName && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
            <span className="font-medium">Olá, {userName}!</span>
          </div>
        )}

        <div className="space-y-2">
          {[currentChat, ...pastChats].map((chat, index) => (
            <div
              key={index}
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

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header com Menu Hamburger */}
        <div className="p-4 border-b border-gray-200 flex items-center">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-4"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>

          <h1 className="text-xl font-semibold text-gray-800">AI Assistant</h1>
          
          {userName && (
            <span className="ml-auto text-sm text-gray-600">
              Olá, {userName}
            </span>
          )}
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChat.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <h2 className="text-xl font-medium mb-2">Bem-vindo ao Assistente de Inseminação</h2>
              <p className="max-w-md">
                {userName 
                  ? `Olá ${userName}! Como posso ajudar você hoje?` 
                  : "Para uma experiência personalizada, por favor se apresente (exemplo: 'Me chamo João')"}
              </p>
            </div>
          )}

          {currentChat.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <div style={{ whiteSpace: 'pre-line' }}>{message.text}</div>
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

        {/* Input de formulário */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={userName ? "Digite sua mensagem..." : "Diga seu nome ou faça uma pergunta..."}
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
              Enviar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
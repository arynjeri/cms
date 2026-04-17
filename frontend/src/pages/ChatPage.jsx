/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import { io } from "socket.io-client";

function ChatPage() {
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);
  const activeChatRef = useRef(activeChat); // Track activeChat in ref to avoid closure issues
  
  const socket = useRef();
  const scrollRef = useRef();

  // Keep activeChat ref in sync
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // THE REDIRECT HANDLER
  useEffect(() => {
    const handleAutoStart = async () => {
      // Check if we came from 'Chat with Artisan'
      if (location.state?.autoStart && location.state?.product && user?._id) {
        const p = location.state.product;
        
        // Find the Artisan's ID
        const artisanId = p.seller?._id || p.seller || p.artisan?._id || p.artisan;

        if (!artisanId) {
          console.error("No Artisan ID found for redirect");
          return;
        }

        // FORCE the chat to be active immediately
        const chatContext = {
          product: p._id,
          productName: p.name,
          partnerId: artisanId,
          partnerName: p.seller?.name || "Artisan"
        };

        setActiveChat(chatContext);
        
        // Load history for this specific artisan/product combo
        try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const res = await API.get(`/chat/${p._id}/${user._id}`, config);
          setMessages(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          setMessages([]);
        }
      }
    };

    handleAutoStart();
  }, [location.state, user?._id, token]); // Runs whenever these values are ready

  // SOCKET SETUP (only once per user)
  useEffect(() => {
    if (!user?._id) return;
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    socket.current = io("http://localhost:5000");
    socket.current.emit("addUser", user._id);

    socket.current.on("getMessage", (data) => {
      // Use ref to get current activeChat (avoid closure issues)
      const current = activeChatRef.current;
      if (current && data.productId === current.product && data.senderId === current.partnerId) {
        setMessages((prev) => [...prev, {
          sender: { _id: data.senderId, name: data.senderName },
          content: data.text,
          createdAt: new Date()
        }]);
        setIsTyping(false);
      }
      fetchConversations();
    });

    socket.current.on("userTyping", (data) => {
      // Use ref to get current activeChat (avoid closure issues)
      const current = activeChatRef.current;
      if (current && data.productId === current.product && data.senderId === current.partnerId) {
        setIsTyping(true);
        setTypingUser(data.senderName);
        
        // Clear previous timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        // Stop showing typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    });

    socket.current.on("orderNotification", (data) => {
      // Artisan receives notification that their order is paid and ready to work
      console.log("Order notification:", data);
      // Show a browser notification or toast
      if (Notification.permission === "granted") {
        new Notification("Order Paid!", {
          body: data.message || "Your payment has been received",
          icon: "🔔"
        });
      }
      alert(`✅ ${data.message}`);
    });

    socket.current.on("chatNotification", (data) => {
      // New chat started notification
      console.log("Chat notification:", data);
      if (Notification.permission === "granted") {
        new Notification(`New Chat: ${data.senderName}`, {
          body: data.message || "Someone started a chat with you",
          icon: "💬"
        });
      }
    });

    socket.current.on("messageNotification", (data) => {
      // New message notification - only show if NOT already chatting with this person
      const current = activeChatRef.current;
      const isAlreadyChatting = current && data.productId === current.product && data.senderId === current.partnerId;
      
      if (!isAlreadyChatting) {
        console.log("Message notification:", data);
        if (Notification.permission === "granted") {
          new Notification(`${data.senderName}`, {
            body: data.message || "You have a new message",
            icon: "💬"
          });
        }
      }
    });

    return () => {
      socket.current.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user?._id]); // ONLY depend on user, not activeChat

  //  FETCH INBOX (For returning to old chats) 
  const fetchConversations = useCallback(async () => {
    if (!user?._id) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}`, userid: user._id } };
      const res = await API.get("/chat/conversations", config);
      setConversations(res.data || []);
    } catch (err) {
      console.error("Inbox Error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, user?._id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Emit typing event
    socket.current.emit("typing", {
      senderId: user._id,
      senderName: user.name,
      receiverId: activeChat.partnerId,
      productId: activeChat.product
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat?.partnerId) return;

    const msgData = {
      product: activeChat.product,
      sender: user._id,
      receiver: activeChat.partnerId,
      content: newMessage
    };

    socket.current.emit("sendMessage", {
      senderId: user._id,
      senderName: user.name,
      receiverId: activeChat.partnerId,
      productId: activeChat.product,
      text: newMessage
    });

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await API.post("/chat", msgData, config);
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      setIsTyping(false);
    } catch (err) {
      alert("Failed to send message");
    }
  };

  // Logic to open a chat from the sidebar list
  const openChatFromSidebar = async (chat) => {
    const partner = chat.sender?._id === user._id ? chat.receiver : chat.sender;
    if (!partner) return;

    setActiveChat({
      product: chat.product?._id,
      productName: chat.product?.name,
      partnerId: partner._id,
      partnerName: partner.name
    });

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await API.get(`/chat/${chat.product?._id}/${partner._id}`, config);
      setMessages(res.data || []);
    } catch (err) {
      setMessages([]);
    }
  };

  if (!user) return <div className="p-20 text-center font-black uppercase text-[10px] tracking-widest animate-pulse">Establishing Connection...</div>;

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? "bg-[#0b141a]" : "bg-[#f0f2f5]"}`}>
      
      {/* SIDEBAR (Inbox for past chats) */}
      <aside className={`w-[30%] min-w-[320px] flex flex-col border-r ${isDark ? "bg-[#111b21] border-slate-700" : "bg-white border-slate-200"}`}>
        <div className={`p-6 flex justify-between items-center ${isDark ? "bg-[#202c33]" : "bg-[#f0f2f5]"}`}>
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black cursor-pointer uppercase text-xs" onClick={() => navigate(-1)}>
            {user.name?.charAt(0)}
          </div>
          <h1 className="font-black text-[10px] tracking-[0.3em] text-slate-500 uppercase">Communications</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && !loading && (
            <div className="p-12 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest">Inbox Empty</div>
          )}
          {conversations.map((chat) => {
            const partner = chat.sender?._id === user._id ? chat.receiver : chat.sender;
            const isSelected = activeChat?.product === chat.product?._id;
            if (!partner) return null;

            return (
              <div
                key={chat._id}
                onClick={() => openChatFromSidebar(chat)}
                className={`flex items-center gap-4 p-5 cursor-pointer border-b transition-all ${
                  isSelected ? (isDark ? "bg-[#2a3942]" : "bg-[#f0f2f5]") : "hover:bg-slate-50 dark:hover:bg-[#202c33]"
                } ${isDark ? "border-[#202c33]" : "border-slate-50"}`}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white flex-shrink-0 uppercase text-xs">
                  {partner.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs truncate uppercase tracking-tighter">{partner.name}</p>
                  <p className="text-[10px] text-indigo-500 font-black truncate uppercase tracking-tighter mt-1">{chat.product?.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* CHAT WINDOW */}
      <main className="flex-1 flex flex-col relative bg-[#efeae2] dark:bg-[#0b141a]">
        {activeChat ? (
          <>
            <header className={`p-4 flex items-center gap-4 shadow-sm z-10 ${isDark ? "bg-[#202c33] text-white" : "bg-[#f0f2f5] text-slate-900"}`}>
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black uppercase text-xs">
                 {activeChat.partnerName?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-black text-xs uppercase tracking-tighter">{activeChat.partnerName}</p>
                <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Discussing: {activeChat.productName}</p>
              </div>
            </header>

            <div 
              className="flex-1 p-6 overflow-y-auto space-y-4"
              style={{ 
                backgroundImage: isDark ? 'none' : 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundSize: '500px'
              }}
            >
              {messages.map((m, i) => {
                const senderId = m.sender?._id || m.sender;
                const currentUserId = user._id || user.id;
                const isMine = senderId?.toString() === currentUserId?.toString();
                
                return (
                  <div key={i} className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`flex gap-2 max-w-xs ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs text-white ${
                        isMine ? "bg-blue-600" : "bg-indigo-600"
                      }`}>
                        {isMine ? user?.name?.charAt(0) : m.sender?.name?.charAt(0) || "?"}
                      </div>
                      <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        <p className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {isMine ? "You" : m.sender?.name || "Unknown"}
                        </p>
                        <div className={`px-5 py-3 rounded-2xl shadow-md text-sm leading-relaxed ${
                          isMine 
                            ? (isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white") 
                            : (isDark ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-900")
                        } ${isMine ? "rounded-tr-none" : "rounded-tl-none"}`}>
                          {m.content}
                        </div>
                        <p className={`text-[9px] mt-1 font-black tracking-wider ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex w-full justify-start">
                  <div className="flex gap-2 max-w-xs">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs text-white bg-indigo-600">
                      {typingUser?.charAt(0) || "?"}
                    </div>
                    <div className="flex flex-col items-start">
                      <p className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        {typingUser || "Someone"}
                      </p>
                      <div className={`px-5 py-3 rounded-2xl shadow-md ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded-tl-none flex gap-1 items-center`}>
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0s" }}></span>
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            <footer className={`p-4 flex items-center gap-3 ${isDark ? "bg-[#202c33]" : "bg-[#f0f2f5]"}`}>
              <form onSubmit={handleSendMessage} className="flex-1 flex gap-3">
                <input 
                  autoFocus
                  value={newMessage}
                  onChange={handleInputChange}
                  type="text" 
                  placeholder="Type a message..." 
                  className={`flex-1 p-4 px-6 rounded-full outline-none text-xs font-black tracking-widest shadow-inner ${isDark ? "bg-[#2a3942] text-white" : "bg-white text-slate-900"}`} 
                />
                <button 
                  type="submit"
                  className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-xl"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-20">
             <h2 className="text-4xl font-black italic -rotate-12 mb-4">Communications</h2>
             <p className="text-[10px] font-black tracking-[1em]">Secure Boutique Hub</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default ChatPage;
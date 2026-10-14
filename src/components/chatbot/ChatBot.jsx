import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, FileText, User, Calendar, MapPin, Activity, List, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Simple ID generator for sessions
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [sessionId] = useState(() => generateId());
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      type: "text",
      text: "Hello! 👋 I'm your Secure ANT Health Assistant. Ask me anything about your health records, lab results, medications, or appointments.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bodyRef = useRef(null);
  // Synchronous lock so Enter + click (or a fast double-click) can't send the same query twice
  const sendLockRef = useRef(false);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (sendLockRef.current || !input.trim()) return;

    const userQuery = input.trim();
    const userMsg = {
      id: Date.now(),
      sender: "user",
      type: "text",
      text: userQuery,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    sendLockRef.current = true;
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Derive UHID: use logged in user's UHID, or check if query contains a number, or default to '1072'
      let derivedUhid = "1072";
      if (user?.uhid) {
        derivedUhid = String(user.uhid);
      } else {
        const uhidMatch = userQuery.match(/\b\d{4,10}\b/);
        if (uhidMatch) {
          derivedUhid = uhidMatch[0];
        }
      }

      const payload = {
        userid: String(user?.id || '1001'),
        sessionid: sessionId,
        chatid: sessionId,
        query: userQuery,
        querytype: 'query',
        viewtype: 'patient',
        top_k: 15,
        filters: {
          uhid: derivedUhid,
          documenttype: "",
          documentstartdate: "",
          documentenddate: ""
        },
      };

      console.log('API Payload =>', payload);

      const response = await fetch('https://secure-ant.ant.works/mlapi/query/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const res = await response.json();
      console.log('API Response =>', res);

      // Extract answer or display JSON if not text
      let botResponseText = "";
      if (res) {
        botResponseText = res.queryresponse || res.response || res.answer || res.result || res.message || (typeof res === 'string' ? res : JSON.stringify(res));
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          type: "text",
          text: botResponseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('API Error =>', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          type: "error",
          text: `Error: ${err.message || "Failed to retrieve response from health assistant."}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      sendLockRef.current = false;
      setIsTyping(false);
    }
  };

  // Helper to parse simple markdown, tables & HTML tags inside the bot message beautifully
  const cleanAndFormatHtml = (text) => {
    if (!text) return "";
    
    // 1. Convert markdown tables (pipes and hyphens) to HTML tables first
    const convertMarkdownTables = (rawText) => {
      const lines = rawText.split("\n");
      const processedLines = [];
      let inTable = false;
      let tableRows = [];

      const flushTable = () => {
        if (tableRows.length === 0) return "";
        const parsedRows = tableRows.map(row => 
          row.split("|")
            .map(cell => cell.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        );
        const contentRows = parsedRows.filter(row => 
          !row.every(cell => /^[-:\s]+$/.test(cell))
        );
        if (contentRows.length === 0) return "";

        const headers = contentRows[0];
        const dataRows = contentRows.slice(1);

        let html = '<table><thead><tr>';
        headers.forEach(h => {
          html += `<th>${h}</th>`;
        });
        html += '</tr></thead><tbody>';
        dataRows.forEach(row => {
          html += '<tr>';
          headers.forEach((_, cIdx) => {
            html += `<td>${row[cIdx] || ""}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cleanLine = line.trim();

        if (cleanLine.startsWith("|")) {
          inTable = true;
          tableRows.push(cleanLine);
        } else {
          if (inTable) {
            processedLines.push(flushTable());
            tableRows = [];
            inTable = false;
          }
          processedLines.push(line);
        }
      }
      if (inTable) {
        processedLines.push(flushTable());
      }
      return processedLines.join("\n");
    };

    let formatted = convertMarkdownTables(text);

    // 2. Replace markdown headings with styled elements
    const headingLines = formatted.split("\n");
    const parsedLines = headingLines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ")) {
        return `<span class="chatbot-heading-3">${trimmed.substring(4)}</span>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<span class="chatbot-heading-2">${trimmed.substring(3)}</span>`;
      }
      return line;
    });
    formatted = parsedLines.join("\n");
    
    // Replace markdown **bold** with <strong>bold</strong>
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Replace markdown list item "- Item" with bullet point
    formatted = formatted.replace(/\n-\s+/g, '<br />• ');
    formatted = formatted.replace(/\n\*\s+/g, '<br />• ');

    // Replace normal newlines with <br /> to preserve formatting
    formatted = formatted.replace(/\n/g, '<br />');
    
    // Remove extra line breaks immediately after heading tags to prevent large bottom gaps
    formatted = formatted.replace(/(<span class="chatbot-heading-[23]">.*?<\/span>)(?:<br\s*\/?>)+/gi, '$1');
    
    // Clean up <br /> tags inside table tags to avoid broken table layouts
    formatted = formatted.replace(/<(table|thead|tbody|tr|th|td)[^>]*><br\s*\/?>/gi, '<$1>');
    formatted = formatted.replace(/<br\s*\/?><\/(table|thead|tbody|tr|th|td)>/gi, '</$1>');
    formatted = formatted.replace(/<\/tr><br\s*\/?>/gi, '</tr>');
    formatted = formatted.replace(/<\/td><br\s*\/?>/gi, '</td>');
    formatted = formatted.replace(/<\/th><br\s*\/?>/gi, '</th>');
    
    // Remove extra line breaks immediately before/after table tags
    formatted = formatted.replace(/(?:<br\s*\/?>)+<table>/gi, '<table>');
    formatted = formatted.replace(/<\/table>(?:<br\s*\/?>)+/gi, '</table><br />');
    
    return formatted;
  };

  if (!isOpen) {
    return (
      <button 
        className="chatbot-fab" 
        onClick={() => {
          setMessages([
            {
              id: 1,
              sender: "bot",
              type: "text",
              text: "Hello! 👋 I'm your Secure ANT Health Assistant. Ask me anything about your health records, lab results, medications, or appointments.",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          setIsOpen(true);
        }}
      >
        <MessageSquare size={22} />
        Chat
      </button>
    );
  }

  return (
    <div className="chatbot-window">
      {/* Header */}
      <div className="chatbot-header">
        <div className="flex items-center gap-2">
          <div className="chatbot-header-avatar">
            <Bot size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Arvaya CareBot</h3>
            <div className="chatbot-header-status">Online</div>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
        >
          <X size={18} color="white" />
        </button>
      </div>

      {/* Body / Messages */}
      <div className="chatbot-body" ref={bodyRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble-container ${msg.sender === "user" ? "user-container" : ""}`}>
            <div className={`chat-bubble ${msg.sender === "user" ? "user" : ""}`}>
              {msg.type === "text" && (
                <div 
                  className="chatbot-formatted-text"
                  dangerouslySetInnerHTML={{ 
                    __html: msg.sender === "bot" ? cleanAndFormatHtml(msg.text) : msg.text 
                  }}
                />
              )}
              {msg.type === "error" && <div style={{ color: '#ff6b6b' }}>{msg.text}</div>}
              
              <span className="chat-timestamp" style={{ color: msg.sender === "user" ? "rgba(255,255,255,0.6)" : "var(--muted)" }}>
                {msg.time}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-row">
        <input 
          type="text" 
          placeholder="Ask about your health..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          autoFocus
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={isTyping || !input.trim()} aria-busy={isTyping}>
          {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

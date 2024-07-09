// App.js
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [summaryLength, setSummaryLength] = useState(500);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(scrollToBottom, [messages]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    addMessage('system', `File selected: ${event.target.files[0].name}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      addMessage('system', 'Please select a file');
      return;
    }

    setLoading(true);
    addMessage('user', `Summarize the PDF with ${summaryLength} characters.`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('summary_length', summaryLength);

    try {
      const response = await axios.post('http://localhost:5000/summarize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      addMessage('assistant', response.data.summary);
    } catch (error) {
      addMessage('system', error.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addMessage = (sender, text) => {
    setMessages(prevMessages => [...prevMessages, { sender, text }]);
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleInputSubmit = (event) => {
    event.preventDefault();
    if (input.trim()) {
      addMessage('user', input);
      setInput('');
      // Here you can add logic to process the user's input
      setTimeout(() => addMessage('assistant', `You said: ${input}`), 500);
    }
  };

  return (
    <div className="App">
      <aside className="sidebar">
        <div className="new-chat" onClick={() => setMessages([])}>
          <span>+</span> New chat
        </div>
        
      </aside>
      <main className="main">
        <div className="chat-container">
          <div className="messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                <div className="message-content">{message.text}</div>
              </div>
            ))}
            {loading && <div className="message system">Generating summary...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="controls">
          <div className="file-upload" onClick={() => fileInputRef.current.click()}>
          <span>📁</span> Upload PDF
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept=".pdf"
          />
        </div>
            <input
              type="number"
              value={summaryLength}
              onChange={(e) => setSummaryLength(e.target.value)}
              min="100"
              max="1000"
              step="50"
            />
            <button onClick={handleSubmit} disabled={loading}>
              Summarize PDF
            </button>
          </div>
        </div>
      </main>
      
    </div>
  );
}

export default App;
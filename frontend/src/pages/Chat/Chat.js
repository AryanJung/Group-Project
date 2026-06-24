import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperties } from '../../context/PropertiesContext';
import { adminAPI } from '../../services/api';
import './Chat.css';

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties } = useProperties();
  const [property, setProperty] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [brokerName] = useState('Property Broker');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const foundProperty = properties.find(p => p.id === parseInt(id) || p._id === id);
        if (foundProperty) {
          setProperty(foundProperty);
        } else {
          try {
            const data = await adminAPI.getPropertyById(id);
            setProperty(data);
          } catch (err) {
            console.error('Property not found');
          }
        }
      } catch (err) {
        console.error('Error loading property:', err);
      }
    };

    loadProperty();

    // Initialize with a welcome message
    setMessages([
      {
        id: 1,
        text: `Hello! I'm ${brokerName}. I'm here to help you with questions about this property. How can I assist you today?`,
        sender: 'broker',
        timestamp: new Date(),
      },
    ]);
  }, [id, properties, brokerName]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage]);
    setNewMessage('');

    // Simulate broker response (in a real app, this would be an API call)
    setTimeout(() => {
      const brokerResponse = {
        id: messages.length + 2,
        text: generateBrokerResponse(newMessage),
        sender: 'broker',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, brokerResponse]);
    }, 1000);
  };

  const generateBrokerResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('rent')) {
      return `The rental price for this property is ${property?.price || 'as listed'}. Would you like to know more about the payment terms?`;
    } else if (lowerMessage.includes('location') || lowerMessage.includes('address') || lowerMessage.includes('where')) {
      return `This property is located at ${property?.location || 'the listed location'}. It's in a great neighborhood with easy access to amenities. Would you like to schedule a viewing?`;
    } else if (lowerMessage.includes('bedroom') || lowerMessage.includes('bathroom') || lowerMessage.includes('size') || lowerMessage.includes('area')) {
      return `This property has ${property?.bedrooms || 'multiple'} bedrooms, ${property?.bathrooms || 'multiple'} bathrooms, and covers ${property?.area || 'a spacious area'}. Is there anything specific you'd like to know about the layout?`;
    } else if (lowerMessage.includes('viewing') || lowerMessage.includes('visit') || lowerMessage.includes('see') || lowerMessage.includes('tour')) {
      return `I'd be happy to arrange a viewing for you! When would be a convenient time for you? You can also let me know your preferred date and time, and I'll coordinate with the property owner.`;
    } else if (lowerMessage.includes('available') || lowerMessage.includes('vacant') || lowerMessage.includes('when')) {
      return `The property is currently available for rent. We can discuss the move-in date based on your requirements. When are you looking to move in?`;
    } else if (lowerMessage.includes('deposit') || lowerMessage.includes('security')) {
      return `Typically, we require a security deposit along with the first month's rent. The exact amount can be discussed based on your application. Would you like more details about the deposit and payment schedule?`;
    } else if (lowerMessage.includes('pet') || lowerMessage.includes('animal')) {
      return `Pet policies vary by property. Let me check the specific policy for this property and get back to you. Do you have any specific pets?`;
    } else if (lowerMessage.includes('parking') || lowerMessage.includes('garage')) {
      return `Parking availability depends on the property. Some properties include parking spaces, while others have nearby parking options. Would you like me to check the parking situation for this specific property?`;
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return `Hello! I'm here to help you with any questions about this property. What would you like to know?`;
    } else {
      return `Thank you for your question. I'm here to help you with information about this property. Could you provide a bit more detail so I can assist you better?`;
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <button onClick={() => navigate(`/property/${id}`)} className="btn-back-chat">
            ← Back
          </button>
          <div className="chat-header-info">
            <h2>Chat with {brokerName}</h2>
            {property && (
              <p className="chat-property-info">
                About: {property.title} - {property.location}
              </p>
            )}
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'message-user' : 'message-broker'}`}
            >
              <div className="message-content">
                <p>{message.text}</p>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit" className="btn-send">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;


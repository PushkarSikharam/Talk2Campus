import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Avatar, Spin, message } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const AIAgent = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! 👋 I\'m your Talk2Campus AI assistant. Ask me anything about campus locations, events, class schedules, or university information!',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickQuestions = [
    '📍 Where is the library?',
    '📅 What events are happening today?',
    '⏰ What are the dining hall hours?',
    '🏢 How do I find the engineering building?',
  ];

  const handleSend = async () => {
    if (!inputValue.trim()) {
      message.warning('Please enter a message');
      return;
    }

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = [
        'The library is located in the main campus building, near the student center. It\'s open from 8 AM to 10 PM on weekdays.',
        'Great question! Let me help you with that. The information you\'re looking for can be found in the campus directory.',
        'I\'d be happy to help! Based on your question, here\'s what I found...',
        'That\'s an excellent question about campus facilities. Here\'s the information you need...',
      ];

      const aiMessage = {
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleQuickQuestion = (question) => {
    setInputValue(question);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div className="fade-in" style={{ 
        textAlign: 'center', 
        marginBottom: 32,
        padding: '40px 24px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        borderRadius: 24,
      }}>
        <Space direction="vertical" size={16}>
          <div style={{
            display: 'inline-flex',
            padding: 20,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
          }}>
            <RobotOutlined style={{ fontSize: 48, color: 'white' }} />
          </div>
          <Title level={1} style={{ 
            marginBottom: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            AI Campus Assistant
          </Title>
          <Paragraph style={{ fontSize: 18, color: '#666', marginBottom: 0 }}>
            Get instant answers to your university questions
          </Paragraph>
        </Space>
      </div>

      {/* Quick Questions */}
      <Card 
        className="slide-in-left"
        style={{ 
          marginBottom: 24,
          borderRadius: 16,
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 16, color: '#2c3e50' }}>
            <ThunderboltOutlined style={{ color: '#667eea', marginRight: 8 }} />
            Quick Questions
          </Text>
          <Space wrap size={[8, 8]}>
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                style={{
                  borderRadius: 20,
                  border: '2px solid #e0e7ff',
                  background: 'white',
                  color: '#667eea',
                  fontWeight: 500,
                }}
                className="quick-question-btn"
              >
                {question}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>

      {/* Chat Container */}
      <Card
        className="fade-in"
        style={{
          height: 500,
          borderRadius: 16,
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        bodyStyle={{ 
          padding: 0, 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          background: 'linear-gradient(to bottom, #fafafa 0%, #ffffff 100%)',
        }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className="fade-in"
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <Space
                  align="start"
                  direction={msg.role === 'user' ? 'horizontal-reverse' : 'horizontal'}
                  size={12}
                  style={{ maxWidth: '75%' }}
                >
                  <Avatar
                    icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    style={{
                      background: msg.role === 'user' 
                        ? 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    size="large"
                  />
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 16,
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'white',
                      color: msg.role === 'user' ? 'white' : '#2c3e50',
                      boxShadow: msg.role === 'user'
                        ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                        : '0 2px 8px rgba(0,0,0,0.08)',
                      position: 'relative',
                    }}
                  >
                    <Text style={{ 
                      color: msg.role === 'user' ? 'white' : '#2c3e50',
                      fontSize: 15,
                      lineHeight: 1.6,
                    }}>
                      {msg.content}
                    </Text>
                    <div style={{
                      fontSize: 11,
                      marginTop: 4,
                      opacity: 0.7,
                      color: msg.role === 'user' ? 'white' : '#666',
                    }}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </Space>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Space align="start" size={12}>
                  <Avatar
                    icon={<RobotOutlined />}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    size="large"
                  />
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    background: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}>
                    <Spin size="small" />
                    <Text style={{ marginLeft: 8, color: '#666' }}>Thinking...</Text>
                  </div>
                </Space>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Space>
        </div>

        {/* Input Area */}
        <div style={{
          padding: 16,
          borderTop: '1px solid #f0f0f0',
          background: 'white',
        }}>
          <Space.Compact style={{ width: '100%' }} size="large">
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about campus..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                borderRadius: '12px 0 0 12px',
                fontSize: 15,
                padding: '12px 16px',
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isLoading}
              style={{
                height: 'auto',
                borderRadius: '0 12px 12px 0',
                padding: '0 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              Send
            </Button>
          </Space.Compact>
        </div>
      </Card>
    </div>
  );
};

export default AIAgent;